
/**
 * @apiDefine ErrorGroup
 * @apiError (Any Error) {String} localizedDescription A user-friendly description of the error
 * @apiError (Any Error) {String} rawError A technical description of the error
 * @apiError (Any Error) {String} [errorCode] A code for the error
 */
let winston = require("lib/loggers/logger").winston;

module.exports.errorNames = {
    generic: "generic",
    dbGenericError: "dbGenericError",
    mailError: "mailError",
    notFound: "notFound",
    user_facebookLoginAuthFailure: "user_facebookLoginAuthFailure",
};

module.exports.errorCodes = function (code) {
    switch (code){
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
        case module.exports.errorNames.user_facebookLoginAuthFailure:
            return -101;
            break;

        default:
            return -1;
    }
};

module.exports.errors = {
    generic:{
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
    notFound:{
        localizedError: "Object not found.",
        rawError: "Object not found: ",
    },
    user_facebookLoginAuthFailure: {
        localizedError: "Authentication with facebook failed",
        rawError: "Authentication failure: ",
    },
};

module.exports.responseWithError = function (err,key) {
    let error = module.exports.errors[key];
    if (!error){
        error = module.exports.errors.generic;
    }
    error.rawError = error.rawError + JSON.stringify(err);
    error.errorCode = module.exports.errorCodes(key);
    winston.error(error.rawError);
    return error;
};