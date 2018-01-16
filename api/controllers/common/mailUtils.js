const User = require('api/models/users/user');

let kue = require('lib/queue/queue');
let config = require("config");
let winston = require("lib/loggers/logger").winstonCategoryLogger("MAIL");

let constants = require("api/common/constants");

module.exports.sendDeactivationRequest = function (user, admin, callback = function () {}) {
    let job = kue.createJob("email", {
        title: "EMAIL: Solicitud de cancelación de cuenta para: " + user.email,
        message: {

            // sender info
            from: config.nodemailer.mailfrom,

            // Comma separated list of recipients
            to: admin.email,

            // Subject of the message
            subject: "Modificación solicitada para "+modifications._id,
            text: "El usuario "+user.email+" ha solicitado cancelar su cuenta: " +
            "\n "+ JSON.stringify(user, 0, 2),
            html: "El usuario "+user.email+" ha solicitado cancelar su cuenta: " +
            "\n "+ JSON.stringify(user, 0, 2),
        }
    });
    job.on('complete', function (result) {
        winston.info("MAIL: Deactivation mail to " + admin.email);
    }).on('failed attempt', function (result) {
        winston.warn("MAIL: Failed deactivation mail attempt to "+ admin.email);
    }).on('failed', function (errorMessage) {
        winston.error("MAIL: Failed deactivation mail to "+ admin.email + " values " +  JSON.stringify(user, 0, 2));
    }).attempts(3).backoff({type: 'exponential'}).save(callback);
};