// DB
let Checkin = require('api/models/checkins/checkin');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('venue', 'No valid venue provided').optional().isObjectId();
    request.checkQuery('user', 'No valid user provided').optional().isObjectId();
    request.checkQuery('maxAge', 'No valid maxAge provided').optional().isNumeric();
    request.checkQuery('minAge', 'No valid minAge provided').optional().isNumeric();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('user', 'No valid user provided').isObjectId();
    request.checkBody('venue', 'No valid venue provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('user', 'No valid user provided').optional().isObjectId();
    request.checkBody('venue', 'No valid venue provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};