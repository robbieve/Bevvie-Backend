// DB
let Block = require('api/models/users/block');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('userBlocks', 'No valid userBlocks provided').optional().isObjectId();
    request.checkQuery('userBlocked', 'No valid userBlocked provided').optional().isObjectId();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('userBlocked', 'No valid userBlocked provided').isObjectId();
    request.checkBody('userBlocks', 'No valid userBlock provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

