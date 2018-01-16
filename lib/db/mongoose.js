module.exports = function (startServer) {
    //Import the mongoose module
    let mongoose = require('mongoose');
    let winston = require("lib/loggers/logger").winstonCategoryLogger("MONGO");
    let f = require('util').format;
    mongoose.Promise = global.Promise;
    let config = require('config').db;

    //Set up default mongoose connection
    winston.info('MONGOOSE - Starting service');

    mongoose.connection.on("error", function(err){
        winston.error(`MONGOOSE - ${JSON.stringify(err)}`)
    });

    if (config.debug === true){
        mongoose.set('debug', function (coll, method, query, doc, options) {
            let set = {
                coll: coll,
                method: method,
                query: query,
                doc: doc,
                options: options
            };
            winston.debug(`MONGOOSE - ${JSON.stringify(set)}`)
        });

    }

    // Connection URL
    let authMechanism = 'DEFAULT';
    let url;
    if (!config.user){
        url = f('mongodb://%s:%s/%s?authMechanism=%s&authSource=%s',
            config.host, config.port, config.database,  authMechanism,config.authdatabase);
    }
    else {
        url = f('mongodb://%s:%s@%s:%s/%s?authMechanism=%s&authSource=%s',
            config.user,config.pass, config.host, config.port, config.database,  authMechanism,config.authdatabase);
    }

    winston.debug('MONGOSE: Trying connection to:', url);

    mongoose.connect(url, config.options,function (err) {
        if (err){
            winston.error('MONGO: connection error:', err.stack);
            process.exit(1);
        }
        else{
            winston.info('MONGO: connection succeed');
            startServer()

        }
    });
    //Get the default connection
    return mongoose.connection;
};

