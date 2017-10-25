let winston = require("lib/loggers/logger").winston;
module.exports = function (kue) {
    if (!kue.addQueueType("test",2,function (job,callback) {
            setTimeout(function () {
                job.progress(1,2,"In the middle!")
            }, 2200);
            setTimeout(function () {
                callback(null,"Result data")
            }, 3000)
        }))
    {
        winston.error("KUE: Error creating task");
    }
    else{
        winston.info("KUE: added type test");
    }
};
