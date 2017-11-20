let path = require('path');
logfile = path.join(__dirname, '../logs/test');
config = {
    'auth': {
        'bearer': true,
        'local': true,
        'third-party': false
    },
    'db': {
        database: process.env.PM2_MONGODB_DATABASE ? process.env.PM2_MONGODB_DATABASE : 'bevvie_test',
        // mssqlConnection :{
        //   user: 'juanjo',
        //   password: 'Develapps15',
        //   server: 'pruebasjuanjo.database.windows.net', // You can use 'localhost\\instance' to connect to named instance
        //   database: 'amperedb-2017-1-26-16-38',
        //   options: {
        //       encrypt: true // Use this if you're on Windows Azure
        //   }
        // }
        options: {
            connectTimeoutMS: 30000,
        },
        debug: true
    },
    log: {
        'type': 'file',
        'filename': logfile,
        'loglevel': 'debug',
    }
};
module.exports = config;
