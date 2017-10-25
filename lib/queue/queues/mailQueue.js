let winston = require("lib/loggers/logger").winston;
const mailer = require('lib/mailer/mailer');

function checkJobs(kue) {
    kue.Job.rangeByType( 'email', 'failed', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 1000 ) {
            winston.error( 'KUE: WARNING email queue failures '+jobs.length );
        }
    });
    kue.Job.rangeByType( 'email', 'inactive', 0, 10000, 'asc', function( err, jobs ) {
        if( jobs.length > 100 ) {
            winston.error( 'KUE: WARNING email queue is growing '+jobs.length );
        }
    });
}

module.exports = function (kue) {
    if (!kue.addQueueType("email",4,function (job,callback) {
            checkJobs(kue);
            // Message object
            if (!job.data.message){
                callback("No message to send!",null);
                return;
            }
            job.progress(1,3,"Preparing message");
            let message = job.data.message;
            job.progress(2,3,"Sending message");
            winston.info('KUE: email: Sending Mail to '+message.to+ ' subject: '+message.subject);
            winston.debug('KUE: email: Sending: '+JSON.stringify(message));
            mailer.sendMail(message, function(error, info) {
                if (error) {
                    job.progress(3,3,"Message failed");
                    callback(error,null);
                    return;
                }
                job.progress(3,3,"Message sent");
                callback(null,"message sent");
                winston.info('KUE: email: Sending mail success to '+message.to+ ' subject: '+message.subject);
                winston.debug('KUE: email: Success: '+JSON.stringify(message));
            })
        }))
    {
        winston.error("KUE: Error creating task");
    }
    else{
        winston.info("KUE: added queue type email");

    }
};
