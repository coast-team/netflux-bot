var mongoose = require('mongoose')

var messageSchema = new mongoose.Schema({
  label: String,
  content: String,
  fromId: Number,
  date: { type: Date, default: Date.now }
})

var Message = mongoose.model('messages', messageSchema)

function saveMsg (msg) {
  return msg.save((err) => {
    if (err) throw err
  })
}

function saveMessages (messages) {
  return new Promise((resolve, reject) => {
    var resPro = 0
    for (var msg of messages) {
      saveMsg(msg).onResolve(() => {
        resPro++
        if (resPro === messages.length) resolve()
      })
    }
  })
}

function nbMessages () {
  return new Promise((resolve, reject) => {
    var size = 0
    Message.find(null).exec((err, res) => {
      if (err) reject(err)
      size = res.length
    }).onResolve(() => {
      resolve(size)
    })
  })
}

exports.Message = Message
exports.saveMsg = saveMsg
exports.saveMessages = saveMessages
exports.nbMessages = nbMessages
