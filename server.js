'use strict'

let Command = require('./commands/Command').Command
let netflux = require('netflux')
let MessageModel = require('./model/message')

// Configuration of the default WebSocketServer
let host = '127.0.0.1'
let port = 9000

// Saving status of the bot server
let save = false

// Protocol of the messages
let netfluxChat = true

// Streams objects for twitter and slack connections
let twitterStream = null
let slackStream = null

// Map of users (Peer id => name) for the slack connection
let users = new Map()

// Constants for the database storing
const MESSAGE = 'MESSAGE'
const COMMAND = 'COMMAND'
const JOIN = 'JOIN'
const LEAVE = 'LEAVE'

// Check arguments to configure the bot server
process.argv.forEach((value, index, array) => {
  if (value.match('-(h|-host)')) {
    host = array[index + 1]
  } else if (value.match('-(p|-port)')) {
    port = array[index + 1]
  } else if (value.match('-(s|-save)')) {
    save = (array[index + 1] === 'true')
  } else if (value.match('-(nc|-netfluxChat)')) {
    netfluxChat = !(array[index + 1] === 'false')

  }
})

// Function to launch the bot server
let init = () => {
  let bot = new netflux.Bot()
  bot.listen({host, port, log: true})
    .then(() => {
      console.log('Bot listen on ws://' + bot.settings.host + ':' + bot.settings.port)
    })

  // Once the bot is added to a WebChannel this function is called
  bot.onWebChannel = (wc) => {
    let id = wc.myId

    /**
      * Send the message to the WebChannel
      * @param {string} msg - Message to be send
      * @param {number} toIdUser - Id of the recipient peer (default = 0)
      */
    let send = (msg, toIdUser = 0) => {
      if (netfluxChat) {
        // Protocol of Netflux-chat messages
        var message = {
          'type': 'message',
          'data': {
            'fromIdUser': id,
            'toIdUser': '' + toIdUser,
            'content': msg,
            'date': Date.now()
          }
        }
        wc.send(JSON.stringify(message))
      } else wc.send(msg)
      if (save) MessageModel.saveMsg(new MessageModel.Message({label: MESSAGE, content: msg, fromId: id}))
    }

    /**
      * Send a hello world message and user informations for Netflux-chat
      */
    let hello = () => {
      if (netfluxChat) {
        var userInfos = {
          'type': 'userInfos',
          'data': {
            'backgroundColor': '',
            'textColor': '58ACFA',
            'whispColor': 'bbbbbb',
            'id': '' + id,
            'peerId': id,
            'nickname':
            'Server :desktop:',
            'online': true
          }
        }
        wc.send(JSON.stringify(userInfos))
      }
      send('Hello, I\'m a server')
    }

    /**
      * Analyse a message to find commands to execute
      * @param {string} str - Message to analyse
      * @param {number} fromId - Id of the peer who sent the message
      */
    let analyse = (str, fromId) => {
      let label = MESSAGE
      let regexCommands = /\/(\w+)\s*((?:(?:([\w\d]|\#)+|\"([^"]|\')+\"|-\w+)\s*)*)/g
      let regexArguments = /(?:([\w\d]|\#)+|\"([^"]|\')+\"|-\w+)/g
      let commands = str.match(regexCommands)
      if (commands) {
        commands.forEach((cmd, index, array) => {
          label = COMMAND
          let args = cmd.match(regexArguments)
          let name = args.splice(0, 1)[0]
          if (save) {
            let content = name
            content += (args.length !== 0) ? ' ' + args.join(' ') : ''
            MessageModel.saveMsg(new MessageModel.Message({label, content, fromId}))
          }
          let c = new Command({name, args, fromId, save, send, wc, bot,
            twitterStream, slackStream, users})
          c.exec()
            .then(() => {
              save = c.getSave()
              twitterStream = c.getTwitterStream()
              slackStream = c.getSlackStream()
              users = c.getUsers()
            })
        })
      } else if (slackStream !== null) slackStream.sendToSlack({message: str, id: fromId})
      if (save && label === MESSAGE) {
        MessageModel.saveMsg(new MessageModel.Message({label, content: str, fromId}))
      }
    }

    // If someone join the WebChannel this function is called
    wc.onJoining = (id) => {
      if (save) {
        MessageModel.saveMsg(new MessageModel.Message({label: JOIN, content: id}))
          .onResolve(() => send('Welcome'))
      }
      else send('Welcome')
    }

    // If someone leave the WebChannel this function is called
    wc.onLeaving = (id) => {
      if (save) MessageModel.saveMsg(new MessageModel.Message({label: LEAVE, content: id}))
    }

    // If someone send a message to the WebChannel this function is called
    wc.onMessage = (id, msg) => {
      let content
      if (netfluxChat) content = JSON.parse(msg).data.content
      else content = msg
      analyse(content, id)
    }

    hello()
  }
}

try {
  let mongoose = require('mongoose')

  mongoose.connect('mongodb://localhost/netfluxBotLog', function (err) {
    if (err) { throw err }
  })

  mongoose.connection.on('connected', () => {
    init()
  })
} catch (err) {
  init()
}
