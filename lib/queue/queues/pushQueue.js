let winston = require("lib/loggers/logger").winston;
const pushService = require('lib/push/push');

function checkJobs(kue) {
    kue.Job.rangeByType( 'push', 'failed', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 1000 ) {
            winston.error( 'KUE: WARNING push queue failures '+jobs.length );
        }
    });
    kue.Job.rangeByType( 'push', 'inactive', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 100 ) {
            winston.error( 'KUE: WARNING push queue is growing '+jobs.length );
        }
    });
}

module.exports = function (kue) {
    if (!kue.addQueueType("push",4,function (job,callback) {
            checkJobs(kue);
            // Message object
            if (!job.data.message){
                callback("No message to send!",null);
                return;
            }
            else if (!job.data.token){
                callback("No token to send to!",null);
                return;
            }
            job.progress(1,3,"Preparing message");
            let message = job.data.message;
            let token = job.data.token;
            job.progress(2,3,"Sending message to token "+token);
            winston.info('KUE: PUSH: Sending push to '+token+ ' title: '+message.title +' push: '+message.body);
            winston.debug('KUE: PUSH: Sending: '+JSON.stringify(message));

            pushService.sendPush(token, message, function (error,info) {
                if (error) {
                    job.progress(3,3,"Message failed");
                    winston.info('KUE: PUSH ERROR: Sending push to '+token+' err: '+JSON.stringify(err));
                    callback(error,null);
                    return;
                }
                job.progress(3,3,"Message sent");
                callback(null,"message sent");
                winston.info('KUE: push: Sending push success to '+token+ ' title: '+message.title);
                winston.debug('KUE: push: Success: '+JSON.stringify(message));
            })
        }))
    {
        winston.error("KUE: Error creating task for push");
    }
    else{
        winston.info("KUE: added queue type push");
    }
};
