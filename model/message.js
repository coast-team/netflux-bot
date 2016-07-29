let Message, saveMsg, saveMessages, nbMessages, getAllData

try {
  var mongoose = require('mongoose')

  var messageSchema = new mongoose.Schema({
    label: String,
    content: String,
    fromId: Number,
    date: { type: Date, default: Date.now }
  })

  Message = mongoose.model('messages', messageSchema)

  saveMsg = (msg) => {
    return msg.save((err) => {
      if (err) throw err
    })
  }

  saveMessages  = (messages) => {
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

  nbMessages = () => {
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

  getAllData = () => {
    return new Promise((resolve, reject) => {
      var messages = []
      Message.find(null).exec((err, res) => {
        if (err) reject(err)
        messages = res
      }).onResolve(() => {
        resolve(messages)
      })
    })
  }
} catch (err) {
  saveMsg = (msg) => {}
  saveMessages  = (messages) => {}
  nbMessages = () => {}
  getAllData = () => {}
  Message = Object
}

exports.Message = Message
exports.saveMsg = saveMsg
exports.saveMessages = saveMessages
exports.nbMessages = nbMessages
exports.getAllData = getAllData
