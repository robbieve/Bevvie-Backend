// DB
let Venue = require('api/models/venues/venue');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('geo.lat', 'No valid latitude provided').optional().isFloat();
    request.checkQuery('geo.long', 'No valid longitude provided').optional().isFloat();
    request.checkQuery('geo.dist', 'No valid distance provided').optional().isFloat();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('name', 'No valid name provided');
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('radius', 'No valid radius provided').optional().isFloat();
    request.checkBody('geo.lat', 'No valid latitude provided').optional().isFloat();
    request.checkBody('geo.long', 'No valid longitude provided').optional().isFloat();
    request.checkBody('geo.dist', 'No valid distance provided').optional().isFloat();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('name', 'No valid name provided');
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('radius', 'No valid radius provided').optional().isFloat();
    request.checkBody('geo.lat', 'No valid latitude provided').optional().isFloat();
    request.checkBody('geo.long', 'No valid longitude provided').optional().isFloat();
    request.checkBody('geo.dist', 'No valid distance provided').optional().isFloat();
    commonFunctions.validate(request,response,next);
};