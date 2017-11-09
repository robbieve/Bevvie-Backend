// DB
let Report = require('api/models/users/report');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('userReports', 'No valid userReports provided').optional().isObjectId();
    request.checkQuery('userReported', 'No valid userReported provided').optional().isObjectId();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('userReported', 'No valid userReported provided').isObjectId();
    request.checkBody('userReports', 'No valid userReport provided').isObjectId();
    request.checkBody('reason', 'No valid reason provided').notEmpty();
    commonFunctions.validate(request,response,next);
};

