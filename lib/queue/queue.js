let kue = require("kue");
let winston = require("lib/loggers/logger").winston;
const pjson = require('package.json');
let async = require("async");

let collection = {};
let mongo = require("lib/db/mongo/mongo")(function (err, db) {
    if (err) {
        winston.error("KUE: Could not connect to mongo");
        process.exit(-1);
    }
    winston.info("QUEUE: Connected successfully to DB. Ready to save queue.");
    collection = db.collection("queue");
    collection.dropIndex("expire_after_month").catch(function (err) {

    });
    collection.createIndexes([
            {
                key: {
                    createdAt: 1
                },
                name: "expire_after_month",
                expireAfterSeconds: 60 * 60 * 24 * 31
            }
        ]
    ).catch(function (err) {
        winston.error('KUE: Could not create ttl index');
    });
});

let q = kue.createQueue({
    prefix: 'queue:' + pjson.name + ':' + process.env.NODE_ENV,
    redis: {
        db: 1, // if provided select a non-default redis db
    }
});

process.once('SIGTERM', function (sig) {
    q.shutdown(5000, function (err) {
        winston.info('KUE: ' + q.name + ' shutdown: ', err || '');
        process.exit(0);
    });
});
process.once('SIGINT', function (sig) {
    q.shutdown(5000, function (err) {
        winston.info('KUE: ' + q.name + ' int - shutting dow: ', err || '');
        process.exit(0);
    });
});
q.on('error', function (err) {
    winston.error('KUE: ' + q.name + 'Error --> ', err);
}).on('job enqueue', function (id, type) {
    winston.info('KUE: ' + q.name + ' Job %s got queued of type %s', id, type);
    kue.Job.rangeByState('failed', 0, 10000, 'asc', function (err, jobs) {
        // you have an array of maximum n Job objects here
        if (jobs.length > 10000) {
            winston.error("KUE: WARNING -> Queues failure is growing " + jobs.length);
        }
    });
    kue.Job.rangeByState('inactive', 0, 10000, 'asc', function (err, jobs) {
        // you have an array of maximum n Job objects here
        if (jobs.length > 1000) {
            winston.error("KUE: WARNING -> Queues inactive is growing " + jobs.length);
        }
    });

}).on('job complete', function (id, result) {
    kue.Job.get(id, function (err, job) {
        if (err) return;
        let jsonJob = {
            createdAt: new Date(),
            job: job.toJSON()
        };
        collection.insert(jsonJob, function (err, result) {
            job.remove(function (err) {
                if (err) throw err;
                winston.info('KUE: removed completed job type %s:#%d', job.type, job.id);
            });
        });

    });
}).on('job failed', function (id, result) {
    kue.Job.get(id, function (err, job) {
        if (err) return;
        let jsonJob = {
            createdAt: new Date(),
            job: job.toJSON()
        };
        collection.insert(jsonJob, function (err, result) {
            job.remove(function (err) {
                if (err) throw err;
                winston.info('KUE: removed failed job type %s:#%d', job.type, job.id);
            });
        });

    });
});

q.watchStuckJobs(2000);

// Exports
module.exports.app = kue.app;
module.exports.queue = q;
module.exports.Job = kue.Job;

// Execution block will receive (job,done) data passed will be at job.data
module.exports.addQueueType = function (jobType, concurrency = 2, executionBlock) {
    if (!executionBlock) return false;
    q.process(jobType, concurrency, executionBlock);
    return true;
};

// Process data will be a dictionary of objects to process
// Remember to save the job, add ttl, etc.
module.exports.createJob = function _createJob(queueType, processData) {
    let job = q.create(queueType, processData);
    job.on('complete', function (result) {
        winston.info('KUE DEFAULT: ' + queueType + ' Job completed with data ' + result);

    }).on('failed attempt', function (errorMessage, doneAttempts) {
        winston.error('KUE DEFAULT: ' + queueType + ' Job attempt failed ' + errorMessage);

    }).on('failed', function (errorMessage) {
        winston.error('KUE DEFAULT: ' + queueType + ' Job permanently failed ' + errorMessage);

    }).on('progress', function (progress, data) {
        winston.debug('KUE DEFAULT: ' + queueType + ' Job #' + job.id + ' ' + progress + '% complete with data ' + data);
    });
    return job;
};

// Setup cleanup queue
if (!module.exports.addQueueType("cleanup", 1, function (job, callback) {
        cleanupQueue(job.data.callback)
    })
) {
    winston.error("KUE CLEANUP: Error creating cleanup task");
}
else {
    winston.info("KUE CLEANUP: added type cleanup");
}

module.exports.cleanupQueue = function cleanupQueue(callback) {
    async.parallel(
        [
            function (done) {
                kue.Job.rangeByState('complete', 0, 1000, 'asc', function (err, jobs) {
                    async.each(jobs,function (job,cb) {
                        let jsonJob = {
                            createdAt: new Date(),
                            job: job.toJSON()
                        };
                        collection.insert(jsonJob, function (err, result) {
                            job.remove(function (err) {
                                if (!err) {
                                    winston.debug('KUE CLEANUP: remove completed job type %s:#%d', job.type, job.id);
                                }
                                cb(err);

                            });
                        });
                    },function (err) {
                        done(err);
                    });
                });
            },
            function (done) {
                kue.Job.rangeByState('failed', 0, 1000, 'asc', function (err, jobs) {
                    async.each(jobs,function (job,cb) {
                        if (err) return;
                        let jsonJob = {
                            createdAt: new Date(),
                            job: job.toJSON()
                        };
                        collection.insert(jsonJob, function (err, result) {
                            job.remove(function (err) {
                                if (!err) {
                                    winston.debug('KUE CLEANUP: remove completed job type %s:#%d', job.type, job.id);
                                }
                                cb(err);
                            });
                        });
                    },function (err) {
                        done(err);
                    });
                });
            },
        ],
        function (err) {
            if (callback) callback(err);
        }
    )


};
module.exports.programCleanup = function (minutes) {
    let d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    module.exports.createJob("cleanup",{callback:function (err) {
        if (err) {
            winston.error('KUE CLEANUP: failed to remove jobs ' + err);
        } else {
            winston.info('KUE CLEANUP: removed old jobs.');
        }
        programCleanup(minutes);
    }}).delay(minutes * 60 * 1000);
};