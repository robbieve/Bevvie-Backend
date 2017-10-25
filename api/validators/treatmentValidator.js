// DB
let Treatment = require('api/models/plans/treatment');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('vetCenter', 'No valid vetCenter of treatment provided').optional().isObjectId();
    request.checkQuery('originUser', 'No valid origin.user of treatment provided').optional().isObjectId();
    request.checkQuery('pet', 'No valid pet of treatment provided').optional().isObjectId();
    request.checkQuery('text', 'No valid text of treatment provided').optional().isAlpha();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('name', 'No valid name of treatment provided').notEmpty();
    request.checkBody('description', 'No valid description of treatment provided').notEmpty();
    request.checkBody('reason', 'No valid reason of treatment provided').notEmpty();
    request.checkBody('vetCenter', 'No valid vetCenter of treatment provided').optional().isMongoId();
    request.checkBody('origin.user', 'No valid origin.user of treatment provided').optional().isObjectId();
    request.checkBody('pet', 'No valid pet of treatment provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('name', 'No valid name of treatment provided').notEmpty();
    request.checkBody('description', 'No valid description of treatment provided').notEmpty();
    request.checkBody('reason', 'No valid reason of treatment provided').notEmpty();
    request.checkBody('vetCenter', 'No valid vetCenter of treatment provided').optional().isMongoId();
    request.checkBody('origin.user', 'No valid origin.user of treatment provided').optional().isObjectId();
    request.checkBody('pet', 'No valid pet of treatment provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};