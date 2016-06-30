'use strict'
var host = '127.0.0.1'
var port = 9000
let WebSocketServer = require('ws').Server
var netflux = require('netflux')
var mongoose = require('mongoose')
var MessageModel = require('./model/message')

const ADD_BOT_SERVER = 'addBotServer'
const NEW_CHANNEL = 'newChannel'

mongoose.connect('mongodb://localhost/netfluxBotLog', function (err) {
  if (err) { throw err }
})

mongoose.connection.on('connected', function () {
  let webChannels = []

  let server = new WebSocketServer({host, port}, () => {
    log('WebSocketServer', 'Server runs on: ws://' + host + ':' + port)
  })

  server.on('connection', (socket) => {
    log('connected', 'Connection of one client')

    socket.on('message', (msg) => {
      var data = {code: ''}
      try {
        data = JSON.parse(msg)
      } catch (e) {}
      switch (data.code) {
        case ADD_BOT_SERVER:
          log('add', 'Add request received')
          var webChannel, onJoining, onLeaving, onMessage, onChannelClose

          onJoining = (id) => {
            log('joining', 'Joinning of a new client [' + id + ']')
          }

          onLeaving = (id) => {
            log('leaving', 'Leaving of client [' + id + ']')
          }

          onMessage = (id, msg) => {
            log('message', '[From ' + id + '] ' + msg)
            var m = new MessageModel.Message({label: 'MESSAGE', content: msg, fromId: id})
            MessageModel.saveMsg(m).onResolve(() => {
              webChannel.send('I received your message')
            })
          }

          onChannelClose = (evt) => {
            // log('closed', 'WebChannel has been closed')
          }

          webChannel = new netflux.WebChannel({'connector': 'WebSocket', host, port})
          webChannel.onJoining = onJoining
          webChannel.onMessage = onMessage
          webChannel.onLeaving = onLeaving
          webChannel.onChannelClose = onChannelClose
          webChannel.joinAsBot(socket, data.sender).then(() => {
            webChannel.channels.forEach((value) => {
              onJoining(value.peerId)
            })
            log('connected', 'Connected to the network')
            log('id', webChannel.myId)
            webChannel.send('Hello, I\'m a server')
          })

          webChannels.push(webChannel)
          break
        case NEW_CHANNEL:
          log('new_channel', 'New channel request received')
          // console.log('[DEBUG] wcId: ', data.wcId)
          for (var wc of webChannels) {
            // console.log('[DEBUG] wc.id: ', wc.id)
            if (!data.which_connector_asked) wc.connectMeToRequests.get(data.sender)(true, socket)
            else wc.initChannel(socket, false, data.sender)
          }
          break
        default:
          log('error', 'Unknown code message')
      }
    })
  })
})

function getDate () {
  var d = new Date()
  return '' + d.toLocaleTimeString() + ' ' + d.toLocaleDateString()
}

function log (label, msg) {
  let datetime = getDate()
  console.log('[', label.toUpperCase(), '] [', datetime, ']', msg)
}
