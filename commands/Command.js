let TwitterStream = require('./TwitterStream').TwitterStream
let Location = require('./Location').Location
let SlackStream = require('./SlackStream').SlackStream

/**
  * Represents a command that can be execute by the server
  * The choice of the command is made in function of the name in the settings
  */
class Command {
  /**
   * *Command* constructor. *Command* can be parameterized with options like name, arguments, ...
   * @param  {Object} [options] *Command* configuration.
   * @param  {string} [options.name=''] Name of the command.
   * @param  {Array} [options.args=[]] Arguments for the command.
   * @param  {number} [options.fromId=0] Peer id who send the command.
   * @param  {boolean} [options.save=false] Saving status of the bot server.
   * @param  {Object} [options.send=null] Send function of the bot server.
   * @param  {Object} [options.wc=null] WebChannel where the bot is and the command send.
   * @param  {Object} [options.bot=null] Bot itself.
   * @param  {Object} [options.twitterStream=null] Stream object for a twitter connection.
   * @param  {Object} [options.slackStream=null] Stream object for a slack connection.
   * @param  {Object} [options.users=null] Map of users (Peer id => name) for the slack connection.
   * @returns {Command} *Command* to execute.
   */
  constructor(options = {}) {
    this.defaults = {
      name: '',
      args: [],
      fromId: 0,
      save: false,
      send: null,
      wc: null,
      bot: null,
      twitterStream: null,
      slackStream: null,
      users: null,
      netfluxChat: false
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  /**
    * Execute the command in function of it name.
    * @return {Promise} It resolves once the command is complete.
    */
  exec () {
    switch (this.getName()) {
      case 'server':
        return this.cmdServer()
      case 'save':
        return this.cmdSave()
      case 'kick':
        return this.cmdKick()
      case 'help':
        return this.cmdHelp()
      case 'twitter':
        return this.cmdTwitter()
      case 'location':
        return this.cmdLocation()
      case 'slack':
        return this.cmdSlack()
      default:
        return this.cmdUnknown()
    }
  }

  // COMMANDS
  /**
    * Command to check the status of the server.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdServer () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|-help)')) help = true
      })
      if (help) this.helpServer()
      else this.send('I\'m here waiting for your commands [saving = ' + this.getSave() + ']')
      resolve()
    })
  }

  /**
    * Command to save all message in a mongo database.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdSave () {
    return new Promise((resolve, reject) => {
      let stop = false
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(s|-stop)')) stop = true
        else if (arg.match('-(h|-help)')) help = true
      })
      let msgs = []
      if (help) {
        this.helpSave()
        if (this.getSave() && stop) {
          msgs.push('I will stop saving all now')
          this.setSave(false)
        }
      } else {
        if (!this.getSave() && !stop) msgs.push('I will save all now')
        if (this.getSave() && stop) msgs.push('I will stop saving all now')
        this.setSave(!stop)
      }
      this.sendArray(msgs)
      resolve()
    })
  }

  /**
    * Command to kick the bot server from the WebChannel.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdKick () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|-help)')) help = true
      })
      if (help) this.helpKick()
      else this.send('Ok I leave...')
      if (!help) this.getBot().leave(this.getWebChannel())
      resolve()
    })
  }

  /**
    * Command to send informations about all the available commands.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdHelp () {
    return new Promise((resolve, reject) => {
      let msgs = [
        'Available commands:',
        '{/server} Command to verify the status of the bot server',
        '{/save} Command to start/stop saving message in a database',
        '{/kick} Command to kick the bot server from the WebChannel',
        '{/twitter} Command to stream messages from Twitter',
        '{/location} Command to get coordinates of an address',
        '{/slack} Command to stream and send message from and to Slack',
        '{/help} Command that displays this help'
      ]
      this.sendArray(msgs)
      resolve()
    })
  }

  /**
    * Command to stream tweets from twitter from a user or that match a query.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdTwitter () {
    return new Promise((resolve, reject) => {
      let users = []
      let queries = []
      let stream = this.getTwitterStream()
      let stop = false
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(u|-user)')) users.push(array[index + 1])
        else if (arg.match('-(q|-query)')) queries.push(array[index + 1])
        else if (arg.match('-(s|-stop)')) stop = true
        else if (arg.match('-(h|-help)')) help = true
      })
      if (!help && this.getArgs().length !== 0) {
        let ts = new TwitterStream({users, queries, stream, send: this.settings.send})
        if (!stop) {
          ts.launch()
            .then(() => {
              this.setTwitterStream(ts.getStream())
              resolve()
            })
        } else ts.close()
      } else {
        this.helpTwitter()
        resolve()
      }
    })
  }

  /**
    * Command to get the latitude and the longitude of a location in argument.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdLocation () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|-help)')) help = true
      })
      if (!help && this.getArgs().length !== 0) {
        let address = this.getArgs().join(' ')
        let loc = new Location({address})
        loc.find()
          .then((res) => {
            this.send('Coordinates of {' + address + '}')
            this.send('Latitude: ' + res[0].latitude + ', longitude: ' + res[0].longitude)
            resolve()
          })
      } else {
        this.helpLocation()
        resolve()
      }
    })
  }

  /**
    * Command to establish a connection with slack.
    * Then all message from slack will be send on the WebChannel and
    * all message from WebChannel will be send to slack on the fixed channel by the bot.
    * The option (-c|--channel) CHANNEL fix the channel where the messages will be listen and send.
    * The option (-u|--user) USER add/replace the name USER to the user who send the command
    * @return {Promise} It resolves once the command is complete.
    */
  cmdSlack () {
    let first = (this.getSlackStream() === null)
    return new Promise((resolve, reject) => {
      let ch = false
      let message = (!first) ? '' : 'Hello I\'m a bot'
      let channel = '#test'
      let users = this.getUsers()
      let start = (message, channel, users) => {
        let slack = new SlackStream({message, channel, users, send: this.settings.send})
        slack.launch().then(() => {
          this.send('Listen and send all message from and to channel {' + slack.getChannel() + '}')
          this.setSlackStream(slack)
          resolve()
        }).catch((reason) => reject(reason))
      }
      let close = () => {
        this.getSlackStream().close()
        this.setSlackStream(null)
      }
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|-help)')) {
          this.helpSlack()
          resolve()
        }
        else if (arg.match('-(m|-message)')) {
          message = (array[index + 1].indexOf('\"') > -1)
            ? array[index + 1].slice(1, array.length - 1)
            : array[index + 1]
        }
        else if (arg.match('-(c|-channel)')) {
          channel = (array[index + 1].indexOf('\#') > -1)
            ? array[index + 1]
            : "#" + array[index + 1]
          ch = true
        }
        else if (arg.match('-(u|-user)')) {
          this.setUser(this.getfromId(), array[index + 1])
          resolve()
        }
        else if (arg.match('-(s|-stop)') && !first) {
          close()
          resolve()
        }
      })
      if (first) {
        start(message, channel, users)
      } else if (message !== '') {
        this.getSlackStream().sendToSlack({message, channel, users, id: this.getfromId()})
        resolve()
      } else if (ch) {
        close()
        start('Hello I\'m a bot', channel, users)
      }
    })
  }

  /**
    * If the name of the command instanciate doesn't match one of the list
    * this function is called.
    * @return {Promise} It resolves once the command is complete.
    */
  cmdUnknown () {
    return new Promise((resolve, reject) => {
      this.send('Unknown command {/' + this.getName() + '}')
      resolve()
    })
  }

  /**
    * Send on the WebChannel a help message for the server command.
    */
  helpServer () {
    let msgs = [
      'Help for the command {/server}:',
      '{/server} Command to verify the status of the bot server',
      '{/server -h} or {/server --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send on the WebChannel a help message for the save command.
    */
  helpSave () {
    let msgs = [
      'Help for the command {/save}:',
      '{/save} Command to start saving message in a database',
      '{/save -s} or {/save --stop} Command to stop saving message in a database',
      '{/save -h} or {/save --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send on the WebChannel a help message for the kick command.
    */
  helpKick () {
    let msgs = [
      'Help for the command {/kick}:',
      '{/kick} Command to kick the bot server from the WebChannel',
      '{/kick -h} or {/kick --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send on the WebChannel a help message for the twitter command.
    */
  helpTwitter () {
    let msgs = [
      'Help for the command {/twitter}:',
      '{/twitter -u USER} or {/twitter --user USER} Command to stream all messages post by {USER}',
      '{/twitter -q QUERY} or {/twitter --query QUERY} Command to stream all messages which contains {QUERY}',
      '{/twitter -s} or {/twitter --stop} Command to stop streaming all messages',
      '{/twitter -h} or {/twitter --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send on the WebChannel a help message for the location command.
    */
  helpLocation () {
    let msgs = [
      'Help for the command {/location}:',
      '{/location ADDRESS} Command to get the coordinates of the {ADDRESS}',
      '{/location -h} or {/location --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send on the WebChannel a help message for the location command.
    */
  helpSlack () {
    let msgs = [
      'Help for the command {/slack}:',
      '{/slack} Command to start sending and listenning messages to and from Slack',
      '{/slack -m} or {/slack --message} Command to send a {MESSAGE} on slack',
      '{/slack -c} or {/slack --channel} Command to change the channel ' +
      'where the messages are send (default = #general)',
      '{/slack -u} or {/slack --user} Command to change the name that will sign the messages',
      '{/slack -s} or {/slack --stop} Command to stop sending and listenning messages to and from Slack',
      '{/slack -h} or {/slack --help} Display this message'
    ]
    this.sendArray(msgs)
  }

  /**
    * Send to WebChannel a succession of messages in an array.
    * @param {Array} Array of messages to be send
    */
  sendArray (arr) {
    if (this.isNetfluxChat()) this.send(arr.join('\n\n'))
    else arr.forEach((msg, index, array) => this.send(msg))
  }

  // GETTERS & SETTERS
  /**
    * Get the name of the command.
    * @return {string} Name of the command.
    */
  getName () {
    return this.settings.name
  }

  /**
    * Get the arguments of the command.
    * @return {Array} Arguments of the command.
    */
  getArgs () {
    return this.settings.args
  }

  /**
    * Get the id of the peer who send the command.
    * @return {number} Id of the peer who send the command.
    */
  getfromId () {
    return this.settings.fromId
  }

  /**
    * Get the saving status of the bot server.
    * @return {boolean} Saving status of the bot server.
    */
  getSave () {
    return this.settings.save
  }

  /**
    * Set the saving status of the bot server.
    * @param {boolean} Saving status of the bot server.
    */
  setSave (value) {
    this.settings.save = value
  }

  /**
    * Alias of the send method of the bot server.
    */
  send (str) {
    this.settings.send(str)
  }

  /**
    * Get the WebChannel where the bot is and the command send.
    * @return {Object} WebChannel where the bot is and the command send.
    */
  getWebChannel () {
    return this.settings.wc
  }

  /**
    * Get the bot server
    * @return {Object} Bot server.
    */
  getBot () {
    return this.settings.bot
  }

  /**
    * Get the stream object for the twitter connection.
    * @return {Object} Stream object for the twitter connection.
    */
  getTwitterStream () {
    return this.settings.twitterStream
  }

  /**
    * Set the stream object for the twitter connection.
    * @param {Object} Stream object for the twitter connection.
    */
  setTwitterStream (stream) {
    this.settings.twitterStream = stream
  }

  /**
    * Get the stream object for the slack connection.
    * @return {Object} Stream object for the slack connection.
    */
  getSlackStream () {
    return this.settings.slackStream
  }

  /**
    * Set the stream object for the slack connection.
    * @return {Object} Stream object for the slack connection.
    */
  setSlackStream (stream) {
    this.settings.slackStream = stream
  }

  /**
    * Get the map of users (Peer id => name) for the slack connection.
    * @return {Object} Map of users (Peer id => name) for the slack connection.
    */
  getUsers () {
    return this.settings.users
  }

  /**
    * Add a user in the map of users (Peer id => name) for the slack connection.
    * @param {number} Id of the user to be add in the map of users
    * @param {string} Name of the user to be add in the map of users
    */
  setUser (id, name) {
    this.settings.users.set(id, name)
  }

  isNetfluxChat () {
    return this.settings.netfluxChat
  }
}

exports.Command = Command
