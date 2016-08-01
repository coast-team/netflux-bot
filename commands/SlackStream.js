var fs =  require('fs')
var request = require('request')

// Check if the file netflux-bot/tokens/slack.json exists and get the tokens
if (!process.env.SLACK_ACCESS_TOKEN_RTM) {
  if (!fs.existsSync('./tokens/slack.json')) {
    console.log('Create a tokens/slack.json with your credentials based on the samples/slack-sample.json file.')
    process.exit(1)
  } else {
    process.env.SLACK_ACCESS_TOKEN_RTM = require('../tokens/slack').tokenRTM
    process.env.SLACK_ACCESS_TOKEN_WEB = require('../tokens/slack').tokenWeb
    process.env.WEBHOOK_URL = require('../tokens/slack').webhookUrl
  }
}

var Botkit = require('botkit')

/**
  * Represents a connection with slack
  */
class SlackStream {
  /**
   * *SlackStream* constructor. *SlackStream* can be parameterized
   * with options like channel, users, ...
   * @param  {Object} [options] *SlackStream* configuration.
   * @param  {string} [options.message=''] Message to send to slack through the bot.
   * @param  {string} [options.channel='#test'] Channel on which the messages will be listen and send.
   * @param  {Object} [options.users=null] Map of users (Peer id => name) for the slack connection.
   * @param  {Object} [options.send=null] Send function of the bot server.
   * @param  {number} [options.id=0] Id of the peer who send the command.
   * @returns {SlackStream} *SlackStream* to launch.
   */
  constructor (options = {}) {
    this.defaults = {
      message: '',
      channel: '#test',
      users: null,
      send: null,
      id: 0
    }

    /**
      * Controller used to get message from slack.
      */
    this.controller = Botkit.slackbot()

    /**
      * Bot entity for slack side.
      * Used to send message to slack.
      */
    this.bot = this.controller.spawn({
      token: process.env.SLACK_ACCESS_TOKEN_RTM,
      incoming_webhook: {
        url: process.env.WEBHOOK_URL
      }
    })
    this.settings = Object.assign({}, this.defaults, options)
  }

  /**
    * Start a stream connection with slack.
    * @return {Promise} It resolves once the connection is established
    */
  startRTM () {
    return new Promise((resolve, reject) => {
      this.bot.startRTM((err, bot, payload) => {
        if (err) reject('Could not connect to Slack')
        resolve()
      })
    })
  }

  /**
    * Begin the connection with slack and listen messages from it.
    * @return {Promise} It resolves once the connection is established
    * and a "Hello I'm a bot" is send.
    */
  launch () {
    return new Promise((resolve, reject) => {
      this.startRTM()
        .then(() => this.sendToSlack())
        .then(() => resolve())
      // Listen all messages from slack and send them to the WebChannel.
      this.controller.on('ambient', (bot, message) => {
        this.getUserInfos(message.user)
          .then((data) => {
            this.send('[From Slack] [From ' + data.user.name + '] ' + message.text)
          })
      })
    })
  }

  /**
    * Close the connection with slack.
    */
  close () {
    this.bot.closeRTM()
  }

  /**
    * Get user informations to a user of slack.
    * @param {number} Slack id of a user.
    * @return {Promise} It resolves once the informations of the user are received
    * and return an object representing the user.
    */
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

  /**
   * Send messages to slack with options like channel, users, ...
   * @param  {Object} [options] *SlackStream* configuration.
   * @param  {string} [options.message=''] Message to send to slack through the bot.
   * @param  {string} [options.channel='#test'] Channel on which the messages will be listen and send.
   * @param  {Object} [options.users=null] Map of users (Peer id => name) for the slack connection.
   * @param  {Object} [options.send=null] Send function of the bot server.
   * @param  {number} [options.id=0] Id of the peer who send the command.
   * @return {Promise} It resolves once the message sent.
   */
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

  /**
    * Get the message to send to slack through the bot.
    * @return {string} Message to send to slack through the bot.
    */
  getMessage () {
    return this.settings.message
  }

  /**
    * Set the message to send to slack through the bot.
    * @param {string} Message to send to slack through the bot.
    */
  setMessage (message) {
    this.settings.message = message
  }

  /**
    * Get the channel on which the messages will be listen and send.
    * @return {string} Channel on which the messages will be listen and send.
    */
  getChannel () {
    return this.settings.channel
  }

  /**
    * Set the channel on which the messages will be listen and send.
    * @param {string} Channel on which the messages will be listen and send.
    */
  setChannel (channel) {
    this.settings.channel = channel
  }

  /**
    * Get the map of users (Peer id => name) for the slack connection.
    * @return {Object} Map of users (Peer id => name) for the slack connection.
    */
  getUsers () {
    return this.settings.users
  }

  /**
    * Get the id of the peer who send the command.
    * @return {number} Id of the peer who send the command.
    */
  getId () {
    return this.settings.id
  }

  /**
    * Alias of the send method of the bot server.
    */
  send (str) {
    this.settings.send(str)
  }

}

exports.SlackStream = SlackStream
