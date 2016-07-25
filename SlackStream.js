var fs =  require('fs')
var request = require('request')

if (!process.env.SLACK_ACCESS_TOKEN_RTM) {
  if (!fs.existsSync('twitter.json')) {
    console.log('Create a slack.json with your credentials based on the slack-sample.json file.')
    process.exit(1)
  } else {
    process.env.SLACK_ACCESS_TOKEN_RTM = require('./slack').tokenRTM
    process.env.SLACK_ACCESS_TOKEN_WEB = require('./slack').tokenWeb
    process.env.WEBHOOK_URL = require('./slack').webhookUrl
  }
}

var Botkit = require('botkit')

class SlackStream {
  constructor (options = {}) {
    this.defaults = {
      message: '',
      channel: '#test',
      users: null,
      send: null,
      id: 0
    }
    this.controller = Botkit.slackbot()
    this.bot = this.controller.spawn({
      token: process.env.SLACK_ACCESS_TOKEN_RTM,
      incoming_webhook: {
        url: process.env.WEBHOOK_URL
      }
    })
    this.settings = Object.assign({}, this.defaults, options)
  }

  startRTM () {
    return new Promise((resolve, reject) => {
      this.bot.startRTM((err, bot, payload) => {
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
      this.controller.on('ambient', (bot, message) => {
        this.getUserInfos(message.user)
          .then((data) => {
            this.send('[From Slack] [From ' + data.user.name + '] ' + message.text)
          })
      })
    })
  }

  close () {
    this.bot.closeRTM()
  }

  getUserInfos (userId) {
    return new Promise((resolve, reject) => {
      let url = 'https://slack.com/api/users.info?token=' + process.env.SLACK_ACCESS_TOKEN_WEB +
      '&user=' + userId + '&pretty=1'
      let user
      request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) resolve(JSON.parse(body))
      })
    })
  }

  sendToSlack (options = {}) {
    this.settings = Object.assign({}, this.settings, options)
    let user = this.getUsers().get(this.getId()) || this.getId()
    let text = (user !== 0) ? '[From netfluxChat] [From ' + user + '] ' : ''
    text += this.getMessage()
    let channel = this.getChannel()
    return new Promise((resolve, reject) => {
      this.bot.sendWebhook({text, channel}, (err,res) => {
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
