
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
    plans_noClinicFound: "plans_noClinicFound",
    plans_ownerNotFinalClient: "plans_ownerNotFinalClient",
    plans_alreadyActivated: "plans_alreadyActivated",
    plans_notActivePlan: "plans_notActivePlan",
    users_activePet: "users_activePet",
    users_activePlan: "users_activePlan",
    users_inactiveUser: "users_inactiveUser",
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
        case module.exports.errorNames.plans_noClinicFound:
            return -1000;
            break;
        case module.exports.errorNames.plans_ownerNotFinalClient:
            return -1001;
            break;
        case module.exports.errorNames.plans_alreadyActivated:
            return -1002;
            break;
        case module.exports.errorNames.plans_noCreditCard:
            return -1003;
            break;
        case module.exports.errorNames.plans_alreadyActivePlan:
            return -1004;
            break;
        case module.exports.errorNames.plans_notActivePlan:
            return -1005;
            break;
        case module.exports.errorNames.users_activePet:
            return -2001;
            break;
        case module.exports.errorNames.users_activePlan:
            return -2002;
            break;
        case module.exports.errorNames.users_inactiveUser:
            return -2003;
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
    plans_ownerNotFinalClient: {
        localizedError: "Owner is not a final client",
        rawError: "Owner is not a final client: ",
    },
    plans_noClinicFound: {
        localizedError: "Not found a suitable clinic",
        rawError: "Not found a suitable clinic: ",
    },
    plans_alreadyActivated: {
        localizedError: "Plan already activated",
        rawError: "Plan already active: ",
    },
    plans_noCreditCard: {
        localizedError: "Owner has no credit card",
        rawError: "Owner has no credit card associated: ",
    },
    plans_alreadyActivePlan: {
        localizedError: "There is an active plan for this pet",
        rawError: "There is an active plan for this pet: ",
    },
    plans_notActivePlan: {
        localizedError: "There is no active plan for this pet",
        rawError: "There is no active plan for this pet: ",
    },
    users_activePet: {
        localizedError: "There is still an active pet for this user",
        rawError: "There is still an active pet for this user: ",
    },
    users_activePlan: {
        localizedError: "There is still an active plan for this user",
        rawError: "There is still an active plan for this user: ",
    },
    users_inactiveUser: {
        localizedError: "User already inactive",
        rawError: "User already inactive: ",
    }
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