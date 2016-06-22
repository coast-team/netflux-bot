'use strict'
var host = '127.0.0.1'
var port = 8080
let WebSocketServer = require('ws').Server
var netflux = require('netflux')

var webChannels = []

function getDate () {
  var d = new Date()
  return '' + d.toLocaleTimeString() + ' ' + d.toLocaleDateString()
}

function log (label, msg) {
  let datetime = getDate()
  console.log('[', label.toUpperCase(), '] [', datetime, '] ', msg)
}

let server = new WebSocketServer({host, port}, () => {
  log('WebSocketServer', 'Server runs on: ws://' + host + ':' + port)
})

server.on('connection', (socket) => {
  log('connected', 'Connection of one client')

  var webChannel, onJoining, onLeaving, onMessage

  onJoining = function (id) {
    log('onJoining', 'Joinning of new client')
  }

  onLeaving = function (id) {
    log('onLeaving', 'Leaving of a client')
  }

  onMessage = function (id, msg) {
    log('onMessage', 'New Message: ' + msg)
  }

  webChannel = new netflux.WebChannel()
  webChannel.onJoining = onJoining
  webChannel.onMessage = onMessage
  webChannel.onLeaving = onLeaving
  webChannel.joinAsBot(socket).then((wc) => {
    webChannel.channels.forEach(function (value) {
      onJoining(value.peerId)
    })
    log('connected', 'Connected to the network')
    log('id', webChannel.myId)
  })

  webChannels.push(webChannel)
})
