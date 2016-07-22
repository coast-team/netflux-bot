var fs =  require('fs')

if (!process.env.GOOGLE_API_KEY) {
  if (!fs.existsSync('google.json')) {
    console.log('Create a google.json with your credentials based on the google-sample.json file.')
    process.exit(1)
  } else {
    process.env.GOOGLE_API_KEY = require('./google').api_key
  }
}

var NodeGeocoder = require('node-geocoder')

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GOOGLE_API_KEY,
  formatter: null
}

var geocoder = NodeGeocoder(options)

class Location {
  constructor (options = {}) {
    this.defaults = {
      address: 'Nancy'
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  find () {
    return geocoder.geocode(this.getAddress())
  }

  getAddress () {
    return this.settings.address
  }
}

exports.Location = Location
