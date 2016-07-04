'use strict'

let host = '127.0.0.1'
let port = 9000

process.argv.forEach((value, index, array) => {
  if (value.match('-(h|-host)')) {
    host = array[index + 1]
  } else if (value.match('-(p|-port)')) {
    port = array[index + 1]
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

  bot.onWebChannel = (wc) => {
    // For Netflux-Chat
    let send = (msg, toIdUser) => {
      var message = {'type': 'message', 'data': {'fromIdUser': '0', 'toIdUser': toIdUser || '0', 'content': msg,
      'date': Date.now()}}
      wc.send(JSON.stringify(message))
    }

    send('Hello, I\'m a server')

    wc.onJoining = (id) => {
      let jp = new MessageModel.Message({label: 'JOIN', content: id})
      MessageModel.saveMsg(jp).onResolve(() => {
        send('Welcome')
      })
    }

    wc.onLeaving = (id) => {
      let jp = new MessageModel.Message({label: 'LEAVE', content: id})
      MessageModel.saveMsg(jp).onResolve(() => {})
    }

    wc.onMessage = (id, msg) => {
      let m = new MessageModel.Message({label: 'MESSAGE', content: msg})
      MessageModel.saveMsg(m).onResolve(() => {
        send('I received your message')
      })
    }
  }
})
