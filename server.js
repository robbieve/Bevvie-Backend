// Path helper
require('app-module-path').addPath(__dirname);
process.setMaxListeners(0);
// Global initialization
let express = require('express');
let app = express();

// Start configuration
let chalk = require('chalk');

// Workaround required by pm2
let config = require('config');
let morgan = require('./lib/loggers/logger');
let winston = morgan.winston;

winston.info('APP: Starting configuration -> ' + chalk.green(config.util.getEnv('NODE_ENV')));

// Secure headers if needed
let helmet = require('helmet');
if (process.env.NODE_ENV === 'production') {
    // WARNING: THIS IS NOT READY
    app.use(helmet())
}
// let db2 = require('./lib/db/mssql')


process.on('SIGINT', function () {
    winston.info('App is halting --> Disconnecting from database');
    let mongoose = require("mongoose");
    mongoose.disconnect(function (err) {
        winston.info('Disconnected from database --> Disconnecting from database');
        winston.info('App stopped');
        process.exit(err ? 1 : 0);
    });
});

let cache = require('lib/redis/redis');
cache.flushdb(function (err, succeeded) {
    if (err) {
        winston.error('REDIS: Error cleaning cache: ' + err);
    }
    else {
        winston.info('REDIS: Cleaning cache...');
    }
});
// File Logger
if (config.log.type !== 'none') {
    app.use(morgan);
}

// authentication
let passport = require('passport');
if (config.has('auth.bearer') && config.auth.bearer) {
    require('./lib/auth/bearer')(passport); // pass passport for configuration
}
if (config.has('auth.local') && config.auth.local) {
    require('./lib/auth/local')(passport); // pass passport for configuration
}
if (config.has('auth.client_facebook') && config.auth.client_facebook) {
    require('./lib/auth/facebook_token')(passport);
}
if (config.has('auth.client_firebase') && config.auth.client_firebase) {
    require('./lib/auth/firebase_token')(passport);
}
app.use(passport.initialize());

// Allow all cross origin
let cors = require("cors");
let corsOptions = {
    origin: true,
}
app.use(cors(corsOptions));

// Routes
require('./api/routes')(app);
// Static
require('./api/controllers/static')(app);

// Error cachers
require('./lib/loggers')(app);

// Startup

// Configure servers

app.set('trust proxy', true);
app.set('trust proxy', 'loopback');

let server;
if (config.has('server.port')) {
    let http = require('http');
    server = http.createServer(app);
}
if (config.has('server.ssl_port')) {
    // WARNING: THIS IS NOT READY
    let fs = require('fs');
    let privateKey = fs.readFileSync('sslcert/server.key', 'utf8');
    let certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
    let https = require('https');
    server = https.createServer(credentials, app);
}


// Queue registering
let kue = require('./lib/queue/queue');
kue.programCleanup(config.kue.cleanupMinutes);

// Register route for queue frontend
app.use('/queues', kue.app);

// Register queues (only after redis is connected)

module.exports = {
    ready: false
};
// This function will be called on DB connection

let startServer = function startServer() {
    // Add mail queue
    require('lib/queue/queues/mailQueue')(kue);

    if (config.has('server.port')) {
        server.listen(config.server.port, config.server.host, function () {
            module.exports.ready = true;
            winston.info(chalk.underline('Started server on ' + config.server.host + ':' + config.server.port));
        });
    }
    if (config.has('server.ssl_port')) {
        server.listen(config.server.ssl_port, config.server.host, function () {
            module.exports.ready = true;
            winston.info(chalk.underline('Started server on ' + config.server.host + ':' + config.server.ssl_port));
        });
    }
};
// Database initialization
let db = require('./lib/db/mongoose')(startServer);

module.exports.server = server;
module.exports.app = app;