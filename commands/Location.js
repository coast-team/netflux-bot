var fs =  require('fs')
var NodeGeocoder = require('node-geocoder')

var options
var geocoder
// Check if the file netflux-bot/tokens/google.jon exists and get the api key
if (!process.env.GOOGLE_API_KEY) {
  if (!fs.existsSync('./tokens/google.json')) {
    console.log('Create a tokens/google.json with your credentials based on the samples/google-sample.json file.')
    // process.exit(1)
  } else {
    process.env.GOOGLE_API_KEY = require('../tokens/google').api_key

    options = {
      provider: 'google',
      httpAdapter: 'https',
      apiKey: process.env.GOOGLE_API_KEY,
      formatter: null
    }

    geocoder = NodeGeocoder(options)
  }
}

/**
  * Represents a location that can be execute by the server
  * The location is specified through the address in the settings
  */
class Location {
  /**
   * *Location* constructor. *Location* can be parameterized with the option address
   * @param  {Object} [options] *Location* configuration.
   * @param  {string} [options.address=''] Address of the location to be find.
   * @returns {Location} *Location* to find.
   */
  constructor (options = {}) {
    this.defaults = {
      address: 'Nancy'
    }
    this.settings = Object.assign({}, this.defaults, options)
  }

  /**
    * Find the location with the specified address.
    * @return {Promise} It resolves once the location is find
    * and return an Array of possible location object with latitude and longitude.
    */
  find () {
    return geocoder.geocode(this.getAddress())
  }

  /**
    * Get the address of the location to be find.
    * @return {string} Address of the location to be find.
    */
  getAddress () {
    return this.settings.address
  }
}

exports.Location = Location
