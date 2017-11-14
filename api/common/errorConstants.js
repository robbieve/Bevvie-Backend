/**
 * @apiDefine ErrorGroup
 * @apiError (Any Error) {String} localizedDescription A user-friendly description of the error
 * @apiError (Any Error) {String} rawError A technical description of the error
 * @apiError (Any Error) {String} [errorCode] A code for the error
 * @apiError (Any Error) errorCode.-1 Generic error. See "rawError".
 * @apiError (Any Error) errorCode.-2 Database Error
 * @apiError (Any Error) errorCode.-3 Mail Error
 * @apiError (Any Error) errorCode.-4 Not Found.
 */
let winston = require("lib/loggers/logger").winston;

module.exports.errorNames = {
    generic: "generic",
    dbGenericError: "dbGenericError",
    mailError: "mailError",
    notFound: "notFound",
    user_facebookLoginAuthFailure: "user_facebookLoginAuthFailure",
    user_firebaseLoginAuthFailure: "user_firebaseLoginAuthFailure",
    user_banned: "user_banned",
    venue_getGeoInvalidLatOrLongErr: "venue_getGeoInvalidLatOrLongErr",
    chat_chatNotYetAccepted: "chat_chatNotYetAccepted",
    chat_chatExhausted: "chat_chatExhausted",
    chat_chatBlocked: "chat_chatBlocked",
};

module.exports.errorCodes = function (code) {
    switch (code) {
        case module.exports.errorNames.generic:
            return -1;
            break;
        case module.exports.errorNames.dbGenericError:
            return -2;
            break;
        case module.exports.errorNames.mailError:
            return -3;
            break;
        case module.exports.errorNames.notFound:
            return -4;
            break;
        /**
         * @apiDefine ErrorFacebookLogin
         * @apiError (Any Error) errorCode.-101 Facebook login failed.
         */
        case module.exports.errorNames.user_facebookLoginAuthFailure:
            return -101;
            break;
        /**
         * @apiDefine ErrorFirebaseLogin
         * @apiError (Any Error) errorCode.-102 Firebase login failed
         */
        case module.exports.errorNames.user_firebaseLoginAuthFailure:
            return -102;
            break;
        /**
         * @apiDefine ErrorBannedLogin
         * @apiError (Any Error) errorCode.-103 User banned
         */
        case module.exports.errorNames.user_banned:
            return -103;
            break;
        /**
         * @apiDefine ErrorInvalidGeoLocation
         * @apiError (Any Error) errorCode.-201 Geolocation invalid
         */
        case module.exports.errorNames.venue_getGeoInvalidLatOrLongErr:
            return -201;
            break;
        /**
         * @apiDefine ErrorChatNotYetAccepted
         * @apiError (Any Error) errorCode.-301 Receiver has not yet accepted the chat.
         */
        case module.exports.errorNames.chat_chatNotYetAccepted:
            return -301;
            break;
        /**
         * @apiDefine ErrorChatExhausted
         * @apiError (Any Error) errorCode.-302 Chat exhausted
         */
        case module.exports.errorNames.chat_chatExhausted:
            return -302;
            break;
        /**
         * @apiDefine ErrorChatBlocked
         * @apiError (Any Error) errorCode.-303 Chat blocked
         */
        case module.exports.errorNames.chat_chatBlocked:
            return -303;
            break;

        default:
            return -1;
    }
};

module.exports.errors = {
    generic: {
        localizedError: "An error occurred.",
        rawError: "Error: ",
    },
    dbGenericError: {
        localizedError: "A DB Error occurred.",
        rawError: "DB Error: ",
    },
    mailError: {
        localizedError: "A mailing error occurred.",
        rawError: "Mail Error: ",
    },
    notFound: {
        localizedError: "Object not found.",
        rawError: "Object not found: ",
    },
    user_facebookLoginAuthFailure: {
        localizedError: "Authentication with facebook failed",
        rawError: "Authentication failure: ",
    },
    user_firebaseLoginAuthFailure: {
        localizedError: "Authentication with firebase failed",
        rawError: "Authentication failure: ",
    },
    user_banned: {
        localizedError: "User banned",
        rawError: "User banned: ",
    },
    venue_getGeoInvalidLatOrLongErr: {
        localizedError: "No valid latitude and longitude provided",
        rawError: "No valid latitude and longitude provided: ",
    },
    chat_chatNotYetAccepted: {
        localizedError: "User has not accepted to chat yet",
        rawError: "User has not accepted to chat yet: ",
    },
    chat_chatExhausted: {
        localizedError: "No more messages available. Chat exhausted.",
        rawError: "No more messages available. Chat exhausted: ",
    },
    chat_chatBlocked: {
        localizedError: "You cannot chat with that user.",
        rawError: "User blocked: ",
    }


};

module.exports.responseWithError = function (err, key) {
    let error = module.exports.errors[key];
    if (!error) {
        error = module.exports.errors.generic;
    }
    error.rawError = error.rawError + JSON.stringify(err);
    error.errorCode = module.exports.errorCodes(key);
    winston.error(error.rawError);
    return error;
};