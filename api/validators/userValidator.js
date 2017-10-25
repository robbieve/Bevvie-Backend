// DB
let User = require('api/models/users/user');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('email', 'No valid email of user provided').optional().isEmail();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    request.checkQuery('sort.field', 'No valid sort field provided').optional().isIn(constants.sortNames);
    request.checkQuery('sort.order', 'No valid sort order provided').optional().isIn(constants.sortOrderNames);
    request.checkBody('userType', 'No valid userType provided').optional().isIn(constants.roleNames);
    commonFunctions.validate(request,response,next);
};


module.exports.rcVetCentersValidator = function (request, response, next) {
    request.checkQuery('postalCode', 'No valid postalCode provided').optional().isAlphanumeric();
    commonFunctions.validate(request,response,next);
};

module.exports.regions = function (request, response, next) {
    request.checkQuery('country', 'No valid country provided').optional().isIn(constants.allCountries);
    commonFunctions.validate(request,response,next);
};


module.exports.postUpdateValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    request.checkBody('email', 'No valid email provided').optional().isEmail();
    request.checkBody('admin', 'No valid admin value provided').optional().isBoolean();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postActivateValidator = function (request, response, next) {
    request.checkBody('email', 'No valid email provided').optional().isEmail();
    request.checkBody('admin', 'No valid admin value provided').optional().isBoolean();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postResetValidator = function (request, response, next) {
    request.checkBody('email', 'No valid email provided').optional().isEmail();
    request.checkBody('password', 'No valid password provided').notEmpty();
    request.checkBody('admin', 'No valid admin value provided').optional().isBoolean();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpgradeValidator = function (request, response, next) {
    request.checkParams('id', 'Bad id provided').isObjectId();
    request.checkBody('contracts', 'Bad contracts list provided').exists();
    request.checkBody('cardId', 'Bad id card provided').isAlphanumeric();
    request.checkBody('creditCard.number', 'Bad credit card number provided').optional().isCreditCard();
    request.checkBody('creditCard.exp_month', 'Bad credit card expiration month provided').optional().isNumeric();
    request.checkBody('creditCard.exp_year', 'Bad credit card expiration year provided').optional().isNumeric();

    commonFunctions.validate(request,response,next);
};

module.exports.activationValidator = function (request, response, next) {
    request.checkBody('email', 'No valid email provided').notEmpty().isEmail();
    request.checkBody('type', 'No valid type provided').notEmpty().isIn(constants.verificationTypes);
    request.checkHeaders('Accept-Language', 'No valid language provided').optional().isIn(constants.allLanguages);
    request.checkBody('country', 'No valid country provided').optional().isIn(constants.allCountries);
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateCreditCard = function (request, response, next) {
    request.checkParams('id', 'Bad id provided').isObjectId();
    request.checkBody('creditCard.number', 'Bad credit card number provided').isCreditCard();
    request.checkBody('creditCard.exp_month', 'Bad credit card expiration month provided').isNumeric();
    request.checkBody('creditCard.exp_year', 'Bad credit card expiration year provided').isNumeric();
    request.checkBody('creditCard.cvc', 'Bad credit card cvc provided').isNumeric();
    request.checkBody('creditCard.name', 'Bad credit card name provided').notEmpty();
    commonFunctions.validate(request,response,next);
};
