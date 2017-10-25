// DB
let Breed = require('api/models/pets/breeds');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('royalCaninIdentifier', 'No valid royalCaninIdentifier of breed provided').optional().isAlphanumeric();
    request.checkQuery('species', 'No valid species provided').optional().isAlpha();
    request.checkQuery('text', 'No valid name of breed provided').optional().isAlpha();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('royalCaninIdentifier', 'No valid royalCaninIdentifier of breed provided').isAlphanumeric();
    request.checkBody('name', 'No valid name provided');
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('species', 'No valid species provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    request.checkBody('royalCaninIdentifier', 'No valid royalCaninIdentifier of breed provided').isAlphanumeric();
    request.checkBody('name', 'No valid name provided');
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    request.checkBody('species', 'No valid species provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);
};