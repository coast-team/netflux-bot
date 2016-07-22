var fs =  require('fs')

if (!process.env.SLACK_ACCESS_TOKEN) {
  if (!fs.existsSync('twitter.json')) {
    console.log('Create a slack.json with your credentials based on the slack-sample.json file.')
    process.exit(1)
  } else {
    process.env.SLACK_ACCESS_TOKEN = require('./slack').token
    process.env.WEBHOOK_URL = require('./slack').webhookUrl
  }
}

var Botkit = require('botkit')
var controller = Botkit.slackbot()

var bot = controller.spawn({
  token: process.env.SLACK_ACCESS_TOKEN,
  incoming_webhook: {
    url: process.env.WEBHOOK_URL
  }
})

class SlackStream {
  constructor (options = {}) {
    this.defaults = {
      message: '',
      channel: '#test',
      users: null,
      send: null,
      id: 0
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  startRTM () {
    return new Promise((resolve, reject) => {
      bot.startRTM((err, bot, payload) => {
        if (err) reject('Could not connect to Slack')
        resolve()
      })
    })
  }

  launch () {
    return new Promise((resolve, reject) => {
      this.startRTM()
        .then(() => this.sendToSlack())
        .then(() => resolve())

      // reply to a direct mention - @bot hello
      controller.on('direct_mention', (bot, message) => {
        // reply to _message_ by using the _bot_ object
        console.log('direct_mention: ', message)
        bot.reply(message,'I heard you mention me!')
      })

      // reply to a direct message
      controller.on('direct_message',function(bot,message) {
        // reply to _message_ by using the _bot_ object
        console.log('direct_message: ', message)
        bot.reply(message,'You are talking directly to me')
      })

      controller.on('ambient', (bot, message) => {
        // console.log(message)
        this.send('[From Slack] [From ' + message.user + '] ' + message.text)
        // console.log('ambient: ', message)
      })
    })
  }

  sendToSlack (options = {}) {
    this.settings = Object.assign({}, this.settings, options)
    let user = this.getUsers().get(this.getId()) || this.getId()
    let text = (user !== 0) ? '[From ' + user + '] ' : ''
    text += this.getMessage()
    let channel = this.getChannel()
    return new Promise((resolve, reject) => {
      bot.sendWebhook({text, channel}, (err,res) => {
        if (err) reject('Could not send a message to Slack')
        this.send('[Send to Slack] ' + text)
        resolve()
      })
    })
  }

  getMessage () {
    return this.settings.message
  }

  setMessage (message) {
    this.settings.message = message
  }

  getChannel () {
    return this.settings.channel
  }

  setChannel (channel) {
    this.settings.channel = channel
  }

  getUsers () {
    return this.settings.users
  }

  getId () {
    return this.settings.id
  }

  send (str) {
    this.settings.send(str)
  }

}

exports.SlackStream = SlackStream
