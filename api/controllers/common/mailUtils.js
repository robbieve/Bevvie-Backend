const User = require('api/models/users/user');
const TemporaryToken = require('api/models/users/temporaryTokens');

let kue = require('lib/queue/queue');
let config = require("config");
let winston = require("lib/loggers/logger").winston;
let constants = require("api/common/constants");

module.exports.sendMailToken = function (temporaryToken, callback = function (err) {}) {
    let theID = temporaryToken._id.toString();
    TemporaryToken.findOne({_id: theID }, function (err, newTemporaryToken) {
        if (err || !newTemporaryToken) {
            winston.error("ERROR: error retrieving token for mailSend. "+err);
            return;
        }

        let link = "";
        let activationText = {}
        let activationTextHTML = {};
        let subject = {};

        switch (newTemporaryToken.tokenType){
            case constants.verificationTypeNames.activation:
                let userString;
                if (newTemporaryToken.user.hasRoles([constants.roleNames.telemarketing])) { userString = "telemarketing"}
                else if (newTemporaryToken.user.hasRoles([constants.roleNames.vetcenter])) { userString = "clinic"}
                else {userString = "client"}

                link = "http://bevvie.com/activate-"+userString+"/" + newTemporaryToken.code;
                activationText = {
                    "es": "Hola, estás a punto de activar tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: " + link,
                    "pt": "Hola, estás a punto de activar tu cuenta en Bevvie. Sólo tienes que activar el siguiente link_PT: " + link,
                };

                activationTextHTML = {
                    "es": "Hola, estás a punto de activar tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: <a href=" + link+">"+link+"</a>",
                    "pt": "PT_Hola, estás a punto de activar tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: <a href=" + link+">"+link+"</a>"
                };

                subject = {
                    "es": config.nodemailer.subject_prefix + " Activa tu cuenta en Bevvie",
                    "pt": config.nodemailer.subject_prefix + " Activa tu cuenta en Bevvie_PT",
                };
                break;
            case constants.verificationTypeNames.resetPassword:
                link = "http://bevvie.com/forgot-password/" + newTemporaryToken.code;
                activationText = {
                    "es": "Hola, estás a punto de cambiar la contraseña de tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: " + link,
                    "pt": "Hola, estás a punto de cambiar la contraseña de tu cuenta en Bevvie. Sólo tienes que activar el siguiente link_PT: " + link,
                };

                activationTextHTML = {
                    "es": "Hola, estás a punto de cambiar la contraseña de tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: <a href=" + link+">"+link+"</a>",
                    "pt": "PT_Hola, estás a punto de cambiar la contraseña de tu cuenta en Bevvie. Sólo tienes que activar el siguiente link: <a href=" + link+">"+link+"</a>"
                };

                subject = {
                    "es": config.nodemailer.subject_prefix + " Cambia la contraseña de tu cuenta en Bevvie",
                    "pt": config.nodemailer.subject_prefix + " Cambia la contraseña de tu cuenta en Bevvie_PT",
                };
                break;
            case constants.verificationTypeNames.simulatePlan:
                link = "http://bevvie.com/simulate/" + newTemporaryToken.code;
                activationText = {
                    "es": "Hola, estás a punto de ver tu plan de Bevvie. Sólo tienes que ir al siguiente link: " + link,
                    "pt": "PT_Hola, estás a punto de ver tu plan de Bevvie. Sólo tienes que ir al siguiente link: " + link,
                };

                activationTextHTML = {
                    "es": "Hola, estás a punto de ver tu plan de Bevvie. Sólo tienes que ir al siguiente link:  <a href=" + link+">"+link+"</a>",
                    "pt": "PT_Hola, estás a punto de ver tu plan de Bevvie. Sólo tienes que ir al siguiente link:  <a href=" + link+">"+link+"</a>"
                };

                subject = {
                    "es": config.nodemailer.subject_prefix + " Descubre tu plan en Bevvie",
                    "pt": config.nodemailer.subject_prefix + " Descubre tu plan en Bevvie_PT",
                };
                break;
            default:
                return winston.error("ERROR: type of token not valid -> "+JSON.stringify(newTemporaryToken));
                break;
        }
        let mailValues = {
            "activationText": activationText[newTemporaryToken.preferedLanguage],
            "activationTextHTML": activationTextHTML[newTemporaryToken.preferedLanguage],
            "subject": subject[newTemporaryToken.preferedLanguage],
        };
        let job = kue.createJob("email", {
            title: "EMAIL: temporaryToken mail for: " + newTemporaryToken.user.email,
            message: {

                // sender info
                from: config.nodemailer.mailfrom,

                // Comma separated list of recipients
                to: newTemporaryToken.user.email,

                // Subject of the message
                subject: mailValues.subject,
                text: mailValues.activationText,
                html: mailValues.activationTextHTML
            }
        });
        job.on('complete', function (result) {
            TemporaryToken.findOne({_id: theID }, function (err, retrievedToken) {
                if (err) {
                    winston.err("MAIL: Could retrieve token -> " + JSON.stringify(newTemporaryToken, 0, 2) + " error " + err);
                }
                else if (retrievedToken) {
                    retrievedToken.status.push({
                        status: constants.temporaryTokenStatusNames.mailSent,
                        date: Date(),
                        description: "sent mail to user"
                    });
                    retrievedToken.save();
                }
                else {
                    winston.warn("MAIL: Could not find token -> " + JSON.stringify(retrievedToken, 0, 2));
                }
            });
        }).on('failed attempt', function (result) {
            TemporaryToken.findOne({_id: theID }, function (err, retrievedToken) {
                if (err) {
                    winston.err("MAIL: Could retrieve token -> " + JSON.stringify(newTemporaryToken, 0, 2) + " error " + err);
                }
                else if (retrievedToken) {
                    retrievedToken.status.push({
                        status: constants.temporaryTokenStatusNames.mailFailedAttempt,
                        date: Date(),
                        description: "failed attempt to send mail to user"
                    });
                    retrievedToken.save();
                }
                else {
                    winston.warn("MAIL: Could not find token -> " + JSON.stringify(newTemporaryToken, 0, 2));
                }
            });
        }).on('failed', function (errorMessage) {
            TemporaryToken.findOne({_id: theID }, function (err, retrievedToken) {
                if (err) {
                    winston.err("MAIL: Could retrieve token -> " + JSON.stringify(newTemporaryToken, 0, 2) + " error " + err);
                }
                else if (retrievedToken) {
                    retrievedToken.status.push({
                        status: constants.temporaryTokenStatusNames.mailFailed,
                        date: Date(),
                        description: "failed mail to user"
                    });
                    retrievedToken.save();
                }
                else {
                    winston.warn("MAIL: Could not find token -> " + JSON.stringify(newTemporaryToken, 0, 2));
                }
            });
        }).attempts(3).backoff({type: 'exponential'}).save(callback);
    });
};
module.exports.sendMailModifications = function (modifications, user, callback = function () {}) {
    let job = kue.createJob("email", {
        title: "EMAIL: Solocitud de cambios para: " + modifications._id,
        message: {

            // sender info
            from: config.nodemailer.mailfrom,

            // Comma separated list of recipients
            to: user.email,

            // Subject of the message
            subject: "Modificación solicitada para "+modifications._id,
            text: "El usuario "+user.email+" ha solicitado las siguientes modificaciones: " +
            "\n "+ JSON.stringify(modifications, 0, 2),
            html: "El usuario "+user.email+" ha solicitado las siguientes modificaciones: " +
            "\n "+ JSON.stringify(modifications, 0, 2),
        }
    });
    job.on('complete', function (result) {
        winston.info("MAIL: Sent mail to " + user.email);
    }).on('failed attempt', function (result) {
        winston.warn("MAIL: Failed mail attempt to "+ user.email);
    }).on('failed', function (errorMessage) {
        winston.error("MAIL: Failed mail attempt to "+ user.email + " values " +  JSON.stringify(modifications, 0, 2));
    }).attempts(3).backoff({type: 'exponential'}).save(callback);
};
module.exports.sendCancellationRequest = function (plan, user, callback = function () {}) {
    let job = kue.createJob("email", {
        title: "EMAIL: Solicitud de cancelación para: " + plan._id,
        message: {

            // sender info
            from: config.nodemailer.mailfrom,

            // Comma separated list of recipients
            to: user.email,

            // Subject of the message
            subject: "Modificación solicitada para "+modifications._id,
            text: "El usuario "+user.email+" ha solicitado cancelar el siguiente plan: " +
            "\n "+ JSON.stringify(plan, 0, 2),
            html: "El usuario "+user.email+" ha solicitado cancelar el siguiente plan: " +
            "\n "+ JSON.stringify(plan, 0, 2),
        }
    });
    job.on('complete', function (result) {
        winston.info("MAIL: Cancellation sent to " + user.email);
    }).on('failed attempt', function (result) {
        winston.warn("MAIL: Cancellation failed mail attempt to "+ user.email);
    }).on('failed', function (errorMessage) {
        winston.error("MAIL: Cancellation failed mail to "+ user.email + " values " +  JSON.stringify(plan, 0, 2));
    }).attempts(3).backoff({type: 'exponential'}).save(callback);
};
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