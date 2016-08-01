var fs =  require('fs')

// Check if the file netflux-bot/tokens/twitter.json exists and get the tokens
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

/**
  * Represents a connection with twitter
  */
class TwitterStream {
  /**
   * *TwitterStream* constructor. *TwitterStream* can be parameterized
   * with options like queries, users, ...
   * @param  {Object} [options] *TwitterStream* configuration.
   * @param  {Object} [options.users=null] Array of users to listen.
   * @param  {Object} [options.queries=null] Array of queries to listen.
   * @param  {Object} [options.stream=null] Stream object for a twitter connection.
   * @param  {Object} [options.send=null] Send function of the bot server.
   * @returns {TwitterStream} *TwitterStream* to launch.
   */
  constructor (options = {}) {
    this.defaults = {
      users: [],
      queries: [],
      stream: {},
      send: {}
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  /**
    * Begin the connection with Twitter
    * @return {Promise} It resolves once the connection is established
    */
  launch () {
    return new Promise((resolve, reject) => {
      this.getUserIds()
      .then((ids) => {
        let follow = ids.join(',')
        let track = this.getQueries().join(',')
        // Stream all messages from ids users or that match queries
        client.stream('statuses/filter', {follow, track},  (stream) => {
          this.send('We listen messages from Twitter')
          this.setStream(stream)
          stream.on('data', (tweet) => {
            this.send(tweet.user.screen_name + ' send on Twitter: ' + tweet.text)
          })
          stream.on('error', (err) => {})
          resolve()
        })
      })
    })
  }

  /**
    * Close the connection with Twitter
    */
  close () {
    this.getStream().destroy()
    this.send('We stop to listen to messages from Twitter')
  }

  /**
    * Get the twitter id of a user with his name
    * @return {Promise} It resolves once the id is available and return it
    */
  getUserId (user) {
    return new Promise((resolve, reject) => {
      client.get('users/show', {screen_name: user}, (error, user, response) => {
        if (error) reject()
        else resolve(user.id)
      })
    })
  }

  /**
    * Get the ids of all the users asked
    * @return {Promise} It resolves once all the ids are available and
    * return an array of them
    */
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

  /**
    * Get the array of users to listen.
    * @return {Object} Array of users to listen.
    */
  getUsers () {
    return this.settings.users
  }

  /**
    * Get the array of queries to listen.
    * @return {Object} Array of queries to listen.
    */
  getQueries () {
    return this.settings.queries
  }

  /**
    * Get the stream object for a twitter connection.
    * @return {Object} Stream object for a twitter connection.
    */
  getStream () {
    return this.settings.stream
  }

  /**
    * Set the stream object for a twitter connection.
    * @param {Object} Stream object for a twitter connection.
    */
  setStream (stream) {
    this.settings.stream = stream
  }

  /**
    * Alias of the send method of the bot server.
    */
  send (str) {
    this.settings.send(str)
  }
}

exports.TwitterStream = TwitterStream
