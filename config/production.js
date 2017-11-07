let path = require('path');
logfile = path.join(__dirname, '../logs/api');
config = {
    'db': {
        database: process.env.PM2_MONGODB_DATABASE ? process.env.PM2_MONGODB_DATABASE : 'bevvie'
    },
    'auth': {
        'bearer': true,
        'local': true,
        'third_party': false, // enable this to use facebook, twitter, etc.
        'client_facebook': true, // enable this to use facebook passing in a facebookToken for authentication
        'facebookAuth' : {
            'clientID'      : process.env.PM2_FACEBOOK_APPID, // your App ID
            'clientSecret'  : process.env.PM2_FACEBOOK_SECRET, // your App Secret
        },
        /*
        'twitterAuth': {
            'consumerKey': 'your-consumer-key-here',
            'consumerSecret': 'your-client-secret-here',
            'callbackURL': 'http://localhost:8080/auth/twitter/callback'
        },

        'googleAuth': {
            'clientID': 'your-secret-clientID-here',
            'clientSecret': 'your-client-secret-here',
            'callbackURL': 'http://localhost:8080/auth/google/callback'
        }
        */

    },
    log: {
        type: 'file',
        filename: logfile,
        'loglevel': 'info',
    }
};
module.exports = config;

