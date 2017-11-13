const User = require('api/models/users/user');
const Chat = require('api/models/chats/chat');
let kue = require('lib/queue/queue');
let config = require("config");
let winston = require("lib/loggers/logger").winston;
let constants = require("api/common/constants");
let redis = require("lib/redis/redis");


function checkJobs(kue) {
    kue.Job.rangeByType( 'deactivateChat', 'failed', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 1000 ) {
            winston.error( 'KUE: WARNING deactivateChat queue failures '+jobs.length );
        }
    });
    kue.Job.rangeByType( 'deactivateChat', 'inactive', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 100 ) {
            winston.error( 'KUE: WARNING deactivateChat queue is growing '+jobs.length );
        }
    });
}

module.exports.deactivationJobType = function (kue) {
    if (!kue.addQueueType("deactivateChat",4,function (job,callback) {
            checkJobs(kue);
            // Message object
            let chat = job.data.chat;
            if (!chat){
                callback("No chat to deactivate!",null);
                return;
            }
            job.progress(1,2,"Preparing deactivation");
            winston.info('KUE: deactivateChat: Executing block');
            Chat.findOne({_id: chat._id},function (err,theChat) {
                if (err) return callback(err,null);
                if (!theChat) return callback("No chat found",null);
                theChat.status = constants.chats.chatStatusNames.expired;
                theChat.save(function (err) {
                    if (err) return callback(err,null);
                    let query = {_id: theChat._id};
                    // Delete any listings of this kind of object
                    redis.deleteCachedResult(query, "Chat", function (err) {
                        job.progress(2,2,"Finished");
                        if (err) {
                            winston.error('KUE: deactivateChat: Execution error ' + JSON.stringify(err));
                        }else{
                            winston.info('KUE: deactivateChat: Execution success '+JSON.stringify(theChat));
                        }
                        callback(err,theChat);
                    });
                });
            });

        }))
    {
        winston.error("KUE: Error creating task");
    }
    else{
        winston.info("KUE: added queue type deactivateChat");

    }
};

module.exports.programChatDeactivation = function (chat, delay = 18* 60 * 60 * 1000 ,callback = function () {}) {
    let job = kue.createJob("deactivateChat", {
        chat: chat
    });
    job.on('complete', function (result) {
        winston.info("CHAT DEACTIVATION: Deactivation succeed " + JSON.stringify(result));
    }).on('failed attempt', function (result) {
        winston.warn("CHAT DEACTIVATION: Failed deactivation attempt"+ JSON.stringify(result));
    }).on('failed', function (errorMessage) {
        winston.error("CHAT DEACTIVATION: Failed deactivation " +  JSON.stringify(errorMessage, 0, 2));
    }).attempts(3).backoff({type: 'exponential'})
        .delay(delay) // 18 hours
        .save(callback);
};
