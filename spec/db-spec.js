var mongoose = require('mongoose')
var MessageModel = require('../model/message')
var now = new Date()

function deleteMessages () {
  return new Promise((resolve, reject) => {
    MessageModel.Message.remove({label: 'TEST', date: {$gt: now}}, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

var toAdd = 10
var messages = []
for (var i = 0; i < toAdd; i++) messages.push(new MessageModel.Message({label: 'TEST', content: 'Some Text ' + i}))
var msg = new MessageModel.Message({label: 'TEST', content: 'Some Text'})
var sizeBefore = 0

describe('Database tests', (close) => {
  MessageModel.nbMessages().then((val) => {
    sizeBefore = val
  })

  it('should have been connected to the database', () => {
    mongoose.connect('mongodb://localhost/netfluxBotLog', function (err) {
      if (err) { throw err }
    })
    var connected = false

    runs(() => {
      mongoose.connection.on('connected', function () {
        connected = true
      })
    })

    waitsFor(() => {
      return connected
    })

    runs(() => {
      expect(connected).toBe(true)
    })
  })

  describe('Add of messages in the database', () => {
    it('should have added 1 message in the database', () => {
      var size = 0
      var finished = false

      runs(() => {
        MessageModel.nbMessages().then((val) => {
          size = val
          MessageModel.saveMsg(msg).onResolve(() => {
            MessageModel.nbMessages().then((val) => {
              size = val - size
              finished = true
            })
          })
        })
      })

      waitsFor(() => {
        return finished
      })

      runs(() => {
        expect(size).toBe(1)
      })
    })

    it('should have added ' + toAdd + ' messages in the database', () => {
      var size = 0
      var finished = false

      runs(() => {
        MessageModel.nbMessages().then((val) => {
          size = val
          MessageModel.saveMessages(messages).then(() => {
            MessageModel.nbMessages().then((val) => {
              size = val - size
              finished = true
            })
          })
        })
      })

      waitsFor(() => {
        return finished
      })

      runs(() => {
        expect(size).toBe(toAdd)
      })
    })
  })

  describe('Delete of messages in the database', () => {
    it('should have deleted all new messages in the database', () => {
      var size = 0
      var finished = false

      runs(() => {
        deleteMessages().then(() => {
          MessageModel.nbMessages().then((val) => {
            size = val
            finished = true
            mongoose.connection.close()
          })
        })
      })

      waitsFor(() => {
        return finished
      })

      runs(() => {
        expect(size).toBe(sizeBefore)
      })
    })
  })
})
