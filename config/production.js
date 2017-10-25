let path = require('path');
logfile = path.join(__dirname, '../logs/api');
config = {
    'db': {
        database: process.env.PM2_MONGODB_DATABASE ? process.env.PM2_MONGODB_DATABASE : 'planvet'
    },
    'aws': {
        's3': {
            bucket: 'dvamcomerce'
        }
    },
    'auth': {
        'bearer': true,
        'local': true,
        'third_party': false, // enable this to use facebook, twitter, etc.
        'facebookAuth': {
            'clientID': 'your-secret-clientID-here', // your App ID
            'clientSecret': 'your-client-secret-here', // your App Secret
            'callbackURL': 'http://localhost:8080/auth/facebook/callback',
            'profileURL': 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email'

        },

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

    },
    log: {
        type: 'file',
        filename: logfile,
        'loglevel': 'info',
    }
};
module.exports = config;

