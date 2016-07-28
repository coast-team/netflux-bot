let TwitterStream = require('./TwitterStream').TwitterStream
let Location = require('./Location').Location
let SlackStream = require('./SlackStream').SlackStream

class Command {
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
      users: null
    }
    this.settings = Object.assign({}, this.defaults, options)
    this.slackLaunched = false
  }

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

  //COMMANDS
  cmdServer () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|help)')) help = true
      })
      if (help) this.helpServer()
      else this.send('I\'m here waiting for your commands [saving = ' + this.getSave() + ']')
      resolve()
    })
  }

  cmdSave () {
    return new Promise((resolve, reject) => {
      let stop = false
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(s|stop)')) stop = true
        else if (arg.match('-(h|help)')) help = true
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

  // TODO
  // case 'saved_data':
  //   MessageModel.getAllData().then((messages) => {
  //     let nbMsg = messages.length
  //     send('I have saved ' + nbMsg + ' messages')
  //     messages.forEach((msg, index) => {
  //       console.log(msg)
  //       let cpt = (nbMsg >= 10 && index < 9) ? '(0' : '('
  //       cpt += (index + 1) + '/' + nbMsg + ')'
  //       let content = (netfluxChat) ? msg.data.content : msg.content
  //       let date = formatDate(msg.date)
  //       switch(msg.label){
  //         case MESSAGE:
  //           send(cpt + ' [' + date + '] [From ' + msg.fromId + '] Message: ' + content)
  //           break
  //         case COMMAND:
  //           send(cpt + ' [' + date + '] [From ' + msg.fromId + '] Command: ' + content)
  //           break
  //         case JOIN:
  //           send(cpt + ' [' + date + '] Join: ' + content)
  //           break
  //         case LEAVE:
  //           send(cpt + ' [' + date + '] Leave: ' + content)
  //           break
  //       }
  //     })
  //   })
  //   break

  // let formatDate = (date) => {
  //   let day = date.getDate()
  //   day = (day < 10) ? '0' + day : day
  //   let month = (date.getMonth() + 1)
  //   month = (month < 10) ? '0' + month : month
  //   let year = date.getFullYear()
  //   let hours = date.getHours()
  //   hours = (hours < 10) ? '0' + hours : hours
  //   let minutes = date.getMinutes()
  //   minutes = (minutes < 10) ? '0' + minutes : minutes
  //   let seconds = date.getSeconds()
  //   seconds = (seconds < 10) ? '0' + seconds : seconds
  //   return '' + day + '/' + month + '/' + year + ' ' +
  //     hours + ':' + minutes + ':' + seconds
  // }

  cmdKick () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|help)')) help = true
      })
      if (help) this.helpKick()
      else this.send('Ok I leave...')
      if (!help) this.getBot().leave(this.getWebChannel())
      resolve()
    })
  }

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

  cmdTwitter () {
    return new Promise((resolve, reject) => {
      let users = []
      let queries = []
      let stream = this.getTwitterStream()
      let stop = false
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(u|user)')) users.push(array[index + 1])
        else if (arg.match('-(q|query)')) queries.push(array[index + 1])
        else if (arg.match('-(s|stop)')) stop = true
        else if (arg.match('-(h|help)')) help = true
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

  cmdLocation () {
    return new Promise((resolve, reject) => {
      let help = false
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|help)')) help = true
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

  cmdSlack () {
    let first = (this.getSlackStream() === null)
    return new Promise((resolve, reject) => {
      let help = false
      let stop = false
      let user = false
      let message = (!first) ? '' : 'Hello I\'m a bot'
      let channel = '#test'
      let users = this.getUsers()
      this.getArgs().forEach((arg, index, array) => {
        if (arg.match('-(h|help)')) help = true
        else if (arg.match('-(m|message)')) {
          message = (array[index + 1].indexOf('\"') > -1) ? array[index + 1].slice(1, array.length - 1)
            : array[index + 1]
        }
        else if (arg.match('-(c|channel)')) {
          channel = (array[index + 1].indexOf('\#') > -1) ? array[index + 1]
            : "#" + array[index + 1]
        }
        else if (arg.match('-(u|user)')) {
          this.setUser(this.getfromId(), array[index + 1])
          user = true
        }
        else if (arg.match('-(s|stop)')) stop = true
      })
      if (!help) {
        let slack = (!first) ? this.getSlackStream()
          : new SlackStream({message, channel, users, send: this.settings.send})
        if (!stop) {
          if (first) {
            slack.launch().then(() => {
              this.send('Listen and send all message from and to channel {' + slack.getChannel() + '}')
              this.setSlackStream(slack)
              resolve()
            }).catch((reason) => reject(reason))
          } else if (message !== '') {
            slack.sendToSlack({message, channel, users, id: this.getfromId()})
            resolve()
          }
        } else {
          slack.close()
          this.setSlackStream(null)
          resolve()
        }
      } else {
        this.helpSlack()
        resolve()
      }
      if (user) resolve()
    })
  }

  cmdUnknown () {
    return new Promise((resolve, reject) => {
      this.send('Unknown command {/' + this.getName() + '}')
      resolve()
    })
  }

  helpServer () {
    let msgs = [
      'Help for the command {/server}:',
      '{/server} Command to verify the status of the bot server',
      '{/server -h} or {/server -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  helpSave () {
    let msgs = [
      'Help for the command {/save}:',
      '{/save} Command to start saving message in a database',
      '{/save -s} or {/save -stop} Command to stop saving message in a database',
      '{/save -h} or {/save -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  helpKick () {
    let msgs = [
      'Help for the command {/kick}:',
      '{/kick} Command to kick the bot server from the WebChannel',
      '{/kick -h} or {/kick -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  helpTwitter () {
    let msgs = [
      'Help for the command {/twitter}:',
      '{/twitter -u USER} or {/twitter -user USER} Command to stream all messages post by {USER}',
      '{/twitter -q QUERY} or {/twitter -query QUERY} Command to stream all messages which contains {QUERY}',
      '{/twitter -s} or {/twitter -stop} Command to stop streaming all messages',
      '{/twitter -h} or {/twitter -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  helpLocation () {
    let msgs = [
      'Help for the command {/location}:',
      '{/location ADDRESS} Command to get the coordinates of the {ADDRESS}',
      '{/location -h} or {/location -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  helpSlack () {
    let msgs = [
      'Help for the command {/slack}:',
      '{/slack} Command to start sending and listenning messages to and from Slack',
      '{/slack -m} or {/slack -message} Command to send a {MESSAGE} on slack',
      '{/slack -c} or {/slack -channel} Command to change the channel ' +
      'where the messages are send (default = #general)',
      '{/slack -s} or {/slack -stop} Command to stop sending and listenning messages to and from Slack',
      '{/slack -h} or {/slack -help} Display this message'
    ]
    this.sendArray(msgs)
  }

  sendArray (arr) {
    arr.forEach((msg, index, array) => {
      this.send(msg)
    })
  }

  //GETTERS & SETTERS
  getName () {
    return this.settings.name
  }

  getArgs () {
    return this.settings.args
  }

  getfromId () {
    return this.settings.fromId
  }

  getSave () {
    return this.settings.save
  }

  setSave (value) {
    this.settings.save = value
  }

  send (str) {
    this.settings.send(str)
  }

  getWebChannel () {
    return this.settings.wc
  }

  getBot () {
    return this.settings.bot
  }

  getTwitterStream () {
    return this.settings.twitterStream
  }

  setTwitterStream (stream) {
    this.settings.twitterStream = stream
  }

  getSlackStream () {
    return this.settings.slackStream
  }

  setSlackStream (stream) {
    this.settings.slackStream = stream
  }

  getUsers () {
    return this.settings.users
  }

  setUser (id, name) {
    this.settings.users.set(id, name)
  }
}

exports.Command = Command
