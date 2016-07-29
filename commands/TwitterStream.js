var fs =  require('fs')

if (!process.env.TWITTER_CONSUMER_KEY) {
  if (!fs.existsSync('./tokens/twitter.json')) {
    console.log('Create a tokens/twitter.json with your credentials based on the samples/twitter-sample.json file.')
    process.exit(1)
  } else {
    process.env.TWITTER_CONSUMER_KEY = require('../tokens/twitter').consumer_key
    process.env.TWITTER_CONSUMER_SECRET = require('../tokens/twitter').consumer_secret;
    process.env.TWITTER_ACCESS_TOKEN_KEY = require('../tokens/twitter').access_token_key;
    process.env.TWITTER_ACCESS_TOKEN_SECRET = require('../tokens/twitter').access_token_secret;
  }
}

var Twitter = require('twitter')

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
})

class TwitterStream {
  constructor (options = {}) {
    this.defaults = {
      users: [],
      queries: [],
      stream: {},
      send: {}
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  launch () {
    return new Promise((resolve, reject) => {
      this.getUserIds()
      .then((ids) => {
        let follow = ids.join(',')
        let track = this.getQueries().join(',')
        client.stream('statuses/filter', {follow, track},  (stream) => {
          this.send('We listen messages from Twitter')
          this.setStream(stream)
          resolve()
          stream.on('data', (tweet) => {
            this.send(tweet.user.screen_name + ' send on Twitter: ' + tweet.text)
          })
          stream.on('error', (err) => {})
        })
      })
    })
  }

  close () {
    this.getStream().destroy()
    this.send('We stop to listen to messages from Twitter')
  }

  getUserId (user) {
    return new Promise((resolve, reject) => {
      client.get('users/show', {screen_name: user}, (error, user, response) => {
        if (error) reject()
        else resolve(user.id)
      })
    })
  }

  getUserIds () {
    return new Promise((resolve, reject) => {
      let ids = []
      let cpt = 0
      if (this.getUsers().length === 0) resolve(ids)
      this.getUsers().forEach((user, index, array) => {
        this.getUserId(user)
          .then((id) => {
            cpt++
            ids.push(id)
            if (cpt === array.length) resolve(ids)
          })
          .catch((reason) => cpt++)
      })
    })
  }

  getUsers () {
    return this.settings.users
  }

  getQueries () {
    return this.settings.queries
  }

  getStream () {
    return this.settings.stream
  }

  setStream (stream) {
    this.settings.stream = stream
  }

  send (str) {
    this.settings.send(str)
  }
}

exports.TwitterStream = TwitterStream
