let winston = require("lib/loggers/logger").winston;
let MongoClient = require('mongodb').MongoClient
    , assert = require('assert'),
    f = require('util').format,
    config = require('config').db;

// Connection URL
let url;
let authMechanism = 'DEFAULT';
if (!config.user){
    url = f('mongodb://%s:%s/%s?authMechanism=%s&authSource=%s',
        config.host, config.port, config.database,  authMechanism,config.authdatabase);
}
else {
    url = f('mongodb://%s:%s@%s:%s/%s?authMechanism=%s&authSource=%s',
        config.user,config.pass, config.host, config.port, config.database,  authMechanism,config.authdatabase);
}
// Use connect method to connect to the server
module.exports = function(callback){
    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        callback(err,db);
    });
};