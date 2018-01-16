/**
 * Created by pablo on 18/7/17.
 */
let redisClient = require('redis').createClient;
let redis = redisClient(6379, 'localhost');
let config = require('config').cache;
//let logger = require('lib/loggers/logger').winston;
let async = require('async');
const pjson = require('../../package.json');

let logger = require("lib/loggers/logger").winstonCategoryLogger("REDIS");

redis.on("error", function (err) {
    logger.error("Error " + err);
});
redis.on("connect", function (err) {
    logger.debug("REDIS: Connected");
    // CONFIG set maxmemory 2500000 LET DEPLOYMENT DO THIS
    /*
    redis.config('SET', 'maxmemory', config.maxmemory ? config.maxmemory : '128mb', function (err) {

        redis.config('SET', 'maxmemory-policy', config.maxmemory_policy ? config.maxmemory_policy : "volatile-lru", function (err) {
            redis.config('GET', '*', function (err, replies) {
                logger.debug(replies);
            });
        });
    });
    */
});

redis.on('error', function (err) {
    logger.error("REDIS: Error: " + JSON.stringify(err));
});
redis.fullScan = function scanAsync(cursor, pattern, callback) {
    let result = [];
    async.doWhilst(
        function (done) {
            redis.send_command("SCAN", [cursor,
                    "MATCH", pattern,
                    "COUNT", "100"],
                function (err, res) {
                    if (err) {
                        return done(err)
                    }
                    cursor = res[0];
                    let keys = res[1];
                    result = result.concat(keys);
                    done();

                })
        },
        function stop(err, n) {
            return cursor === 0
        },
        function (err) {
            callback(err, result)
        });

};

let collection = {};
let mongo = require("lib/db/mongo/mongo")(function (err, db) {
    if (err) {
        logger.error("REDIS: Could not connect to mongo to save stats");
        process.exit(-1);
    }
    logger.info("REDIS: Connected successfully to DB. Ready to save stats.");
    collection = db.collection("cache_stats");
    collection.dropIndex("expire_after_year").catch(function (err) {

    });
    collection.createIndexes([
            {
                key: {
                    createdAt: 1
                },
                name: "expire_after_year",
                expireAfterSeconds: 60 * 60 * 24 * 31 * 12
            }
        ]
    ).catch(function (err) {
        logger.error('REDIS: Could not create ttl index');
    });
});

module.exports = redis;

module.exports.sumStatistic = function (type, query) {
    if (config.save_statistics!==true) { return }
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    collection.findAndModify(
        {"type": type, "query": query, "date": date},
        [["type",1],["query",1]],
        {
            "$inc": {"hits": 1},
            "$set":{"date": date}
        }, {"upsert": true}, function (err, result) {
            if (err) {
                return logger.error('REDIS: could not save statistic' + type + " " + err);
            }
            logger.debug('REDIS: saved cache ' + type);
        });
};

// Route utils

let prefix = pjson.name + ':' + process.env.NODE_ENV;

module.exports.getCachedResults = function _getCachedResults(query, modelName, request, callback) {
    if (!config.enabled ||
        request.header('Cache-Control') === 'no-cache' ||
        request.header('Cache-Control') === 'must-revalidate') {
        if (config.enabled) logger.debug(`CACHE: Disabled for ${request.baseUrl} cache-control ${JSON.stringify(request.header('Cache-Control'))}`);
        return callback(null, null)
    }
    let aQuery = prefix + ':' + modelName + ':' + JSON.stringify(query);
    redis.get(aQuery, function (err, reply) {
        if (err) {
            logger.error(`CACHE: Error reading ${aQuery} from cache ${err}`);
            if (callback) callback(err, null);
        }
        else if (reply) {
            redis.sumStatistic("HIT",aQuery);
            logger.debug(`CACHE: Hit!, returning ${aQuery} from cache`);
            try {
                let obj = JSON.parse(reply);
                obj["_cached"]=aQuery;
                if (callback) callback(null, obj);
            } catch (ex) {
                logger.error(ex);
                if (callback) return callback(ex, null)
            }
        }
        else {

            redis.sumStatistic("MISS",aQuery);
            logger.debug(`CACHE: miss ${aQuery}`);
            if (callback) callback(null, null);
        }
    })
}

module.exports.setCachedResult = function _setCachedResult(query, modelName, json, callback) {
    if (!config.enabled) {
        if (callback) callback(null);
        return
    }
    let aQuery = prefix + ':' + modelName + ':' + JSON.stringify(query);
    let aJson = JSON.stringify(json);
    let expire = config.expireTime ? config.expireTime : 60 * 60 * 24;
    redis.set(aQuery, aJson, "EX", expire, function (err) {
        if (err) {
            logger.error(`CACHE: Error updating ${aQuery} to cache ${err}`);
        }
        else {
            redis.sumStatistic("UPDATE",aQuery);
            logger.debug(`CACHE: updated ${aQuery} to cache`);
        }
        if (callback) callback(err)
    })
}

module.exports.deleteCachedResult = function _deleteCachedResult(query, modelName, callback = function (err) {
}) {
    if (!config.enabled) {
        if (callback) callback(null);
        return
    }
    let aQuery = prefix + ':' + modelName + '-list:*';
    let keys = [];

    async.parallel([
        function (done) {
            redis.fullScan('0', aQuery, function (err, keys) {
                if (keys.length === 0) {
                    return done(err)
                }
                redis.del(keys, function (err, response) {
                    if (err) {
                        logger.error(`CACHE: Error deleting list of ${modelName} from cache ${err}`);
                    }
                    else if (response === 1) {
                        logger.debug(`CACHE: deleted list of ${modelName}: ${response}`);
                        redis.sumStatistic("DELETE",aQuery);
                    }
                    else {
                        logger.debug(`CACHE: no list found for ${modelName}`);
                    }
                    done(err)
                })
            });
        },
        function (done) {
            let aQuery = prefix + ':' + modelName + ':*' + JSON.stringify(query)+'*';
            redis.keys(aQuery, function (err, keys) {
                if (err) {
                    logger.error(`CACHE: Error matching for deleting ${aQuery} to cache ${err}`);
                    return done(err);
                }

                if (!keys || keys.length === 0) {
                    return done(err)
                }
                redis.del(keys, function (err, response) {
                    if (err) {
                        logger.error(`CACHE: Error deleting ${aQuery} to cache ${err}`);
                    }
                    else if (response === 1) {
                        logger.debug(`CACHE: deleted ${aQuery}: ${response}`);
                        redis.sumStatistic("DELETE",aQuery);
                    }
                    else {
                        logger.debug(`CACHE: no key found for ${aQuery}`);
                    }
                    done(err)
                });
            });


        }
    ], function (err) {
        if (callback) callback(err)
    })
}
