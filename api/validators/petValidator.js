// DB
let Pet = require('api/models/pets/pets');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('text', 'No valid petname of pet provided').optional().isAlpha();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('name', 'No valid petname provided').optional().isAlpha();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('owner', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('owner', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};