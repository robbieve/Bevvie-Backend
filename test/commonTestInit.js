// Path helper
require('app-module-path').addPath(__dirname + '/..');
let config = require('config');
// Database
let dbConfig = require('config').db;

let mongoose = require("mongoose");
let winston = require('lib/loggers/logger').winston;
let async = require('async');
let redis = require('lib/redis/redis');
let _ = require('underscore');
// load the auth variables
exports.configAuth = require('config').auth;


//Require the dev-dependencies
exports.chai = require('chai');
let chaiHttp = require('chai-http');
let server;
let serverConfig;
if (config.node_test_ip){
    server = config.node_test_ip;
    let serverConfig = require('server');
    winston.debug('TEST: configure remote ip '+server)
}
else{
    serverConfig = require('server');
    exports.app = serverConfig.app;
    server = serverConfig.server;
    winston.debug('TEST: configure local server')

}
exports.server = server;
winston.debug('CONFIG: ' + JSON.stringify(config));
exports.should = exports.chai.should();
exports.chai.use(chaiHttp);

function waitForServer(done) {
    if (!serverConfig.ready) {
        setTimeout(function() {
            winston.info('Waiting for startUp');
            waitForServer(done)
        }, 3000);
    }
    else{
        winston.info('Server started');
        done()
    }
}

exports.before = function (done) {
    if (config.cache.enabled) {
        redis.flushdb(function (err, succeeded) {
            if (err) return winston.error(err);
            winston.debug('Cleared REDIS cache ' + succeeded);
        });
    }

    if (!mongoose.connection.readyState) {
        let promise = mongoose.connect(dbConfig.mongoDBconnection, dbConfig.options);
        promise.then(function(db) {
            db.dropDatabase();
            waitForServer(done)
        }).catch(function (err) {
            winston.error('Could not connect to mongo');
            process.exit(-1);
        });
    }
    else {
        waitForServer(function () {
            let promise =  mongoose.connection.dropDatabase();
            promise.then(function(error) {
                let asyncFunctions = [];
                //Loop through all the known schemas, and execute an createIndex to make sure we're clean
                _.each(mongoose.connection.base.modelSchemas, function(schema, key) {
                    asyncFunctions.push(function(cb){
                        mongoose.model(key, schema).createIndexes(function(){
                            return cb()
                        })
                    })
                });
                return new Promise(function (resolve,reject) {
                    winston.debug('Done dumping all collections and recreating indexes');
                    resolve(0)
                })
            }).then(function (result) {
                waitForServer(done)
            }).catch(function (err) {
                winston.error('Error dropping database: '+JSON.stringify(err));
                process.exit(-1);
            });
        });

    }
};
exports.after = function () {
    //clear out db
    //mongoose.models = {};
    //mongoose.modelSchemas = {};
    if (!config.node_test_ip) {
        server.close();
    }
};
