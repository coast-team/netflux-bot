'use strict'

let Command = require('./Command').Command

let host = '127.0.0.1'
let port = 9000
let save = false
let netfluxChat = true
let twitterStream = null
let slackStream = null
let slack = false
let users = new Map()

const MESSAGE = 'MESSAGE'
const COMMAND = 'COMMAND'
const JOIN = 'JOIN'
const LEAVE = 'LEAVE'

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

let netflux = require('netflux')

let mongoose = require('mongoose')
let MessageModel = require('./model/message')

mongoose.connect('mongodb://localhost/netfluxBotLog', function (err) {
  if (err) { throw err }
})

mongoose.connection.on('connected', () => {
  let bot = new netflux.Bot()
  bot.listen({host, port, log: true})
    .then(() => {
      console.log('Bot listen on ws://' + bot.settings.host + ':' + bot.settings.port)
    })

  bot.onWebChannel = (wc) => {
    let id = wc.myId

    let send = (msg, toIdUser) => {
      if (netfluxChat) {
        var message = {'type': 'message', 'data': {'fromIdUser': id, 'toIdUser': toIdUser || '0',
        'content': msg, 'date': Date.now()}}
        wc.send(JSON.stringify(message))
      } else wc.send(msg)
      if (save) MessageModel.saveMsg(new MessageModel.Message({label: MESSAGE, content: msg, fromId: id}))
    }

    let hello = () => {
      if (netfluxChat) {
        var userInfos = {'type': 'userInfos', 'data': {'backgroundColor': '', 'textColor': '58ACFA',
        'whispColor': 'bbbbbb', 'id': '' + id, 'peerId': id, 'nickname': 'Server :desktop:', 'online': true}}
        wc.send(JSON.stringify(userInfos))
      }
      send('Hello, I\'m a server')
    }

    let getUserId = (user) => {
      return new Promise((resolve, reject) => {
        client.get('users/show', {screen_name: user}, (error, user, response) => {
          if (error) reject()
          else resolve(user.id)
        })
      })
    }

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


    wc.onJoining = (id) => {
      if (save) {
        MessageModel.saveMsg(new MessageModel.Message({label: JOIN, content: id}))
          .onResolve(() => send('Welcome'))
      }
      else send('Welcome')
    }

    wc.onLeaving = (id) => {
      if (save) MessageModel.saveMsg(new MessageModel.Message({label: LEAVE, content: id}))
    }

    wc.onMessage = (id, msg) => {
      let content
      if (netfluxChat) content = JSON.parse(msg).data.content
      else content = msg
      analyse(content, id)
    }

    hello()
  }
})
