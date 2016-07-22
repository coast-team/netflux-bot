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
    let id = wc.id
    // For Netflux-Chat
    let send = (msg, toIdUser) => {
      if (netfluxChat) {
        var message = {'type': 'message', 'data': {'fromIdUser': id, 'toIdUser': toIdUser || '0', 'content': msg,
        'date': Date.now()}}
        wc.send(JSON.stringify(message))
      } else wc.send(msg)
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
      let regexCommands = /\/(\w+)\s*((?:(?:([\w\d]|\#)+|\"([^"]|\')+\"|-\w+)\s*)*)/g
      let regexArguments = /(?:([\w\d]|\#)+|\"([^"]|\')+\"|-\w+)/g
      let commands = str.match(regexCommands)
      if (commands) {
        commands.forEach((cmd, index, array) => {
          let args = cmd.match(regexArguments)
          let name = args.splice(0, 1)[0]
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
      } else if (slackStream !== null) {
        slackStream.sendToSlack({message: '[From netfluxChat] '+ str, id: fromId})
      }
    }

    // let analyse = (content, fromId) => {
    //   let label = MESSAGE
    //   var words = content.split(' ')
    //   for (var word of words) {
    //     if (word.indexOf('/') !== -1) {
    //       var command = word.slice(1, word.length)
    //       execCommand(command)
    //       label = COMMAND
    //     }
    //   }
    //   if (save) {
    //     let m = new MessageModel.Message({label, content, fromId})
    //     MessageModel.saveMsg(m)
    //   }
    // }

    // case 'saved_data':
    //   MessageModel.getAllData().then((messages) => {
    //     let nbMsg = messages.length
    //     send('I have saved ' + nbMsg + ' messages')
    //     messages.forEach((msg, index) => {
    //       console.log(msg)
    //       let cpt = (nbMsg >= 10 && index < 9) ? '(0' : '('
    //       cpt += (index + 1) + '/' + nbMsg + ')'
    //       let content = (netfluxChat) ? msg.data.content : msg.content
    //       let date = formatDate(msg.date)
    //       switch(msg.label){
    //         case MESSAGE:
    //           send(cpt + ' [' + date + '] [From ' + msg.fromId + '] Message: ' + content)
    //           break
    //         case COMMAND:
    //           send(cpt + ' [' + date + '] [From ' + msg.fromId + '] Command: ' + content)
    //           break
    //         case JOIN:
    //           send(cpt + ' [' + date + '] Join: ' + content)
    //           break
    //         case LEAVE:
    //           send(cpt + ' [' + date + '] Leave: ' + content)
    //           break
    //       }
    //     })
    //   })
    //   break


    let formatDate = (date) => {
      let day = date.getDate()
      day = (day < 10) ? '0' + day : day
      let month = (date.getMonth() + 1)
      month = (month < 10) ? '0' + month : month
      let year = date.getFullYear()
      let hours = date.getHours()
      hours = (hours < 10) ? '0' + hours : hours
      let minutes = date.getMinutes()
      minutes = (minutes < 10) ? '0' + minutes : minutes
      let seconds = date.getSeconds()
      seconds = (seconds < 10) ? '0' + seconds : seconds
      return '' + day + '/' + month + '/' + year + ' ' +
        hours + ':' + minutes + ':' + seconds
    }

    hello()

    wc.onJoining = (id) => {
      let jp = new MessageModel.Message({label: JOIN, content: id})
      if (save) {
        MessageModel.saveMsg(jp).onResolve(() => {
          send('Welcome')
        })
      }
      else send('Welcome')
    }

    wc.onLeaving = (id) => {
      let jp = new MessageModel.Message({label: LEAVE, content: id})
      if (save) MessageModel.saveMsg(jp).onResolve(() => {})
    }

    wc.onMessage = (id, msg) => {
      let content
      if (netfluxChat) content = JSON.parse(msg).data.content
      else content = msg
      analyse(content, id)
    }
  }
})
