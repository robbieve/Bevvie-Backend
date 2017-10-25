
// DB
let RegionPonderation = require('api/models/plans/regionPonderation');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('country', 'No valid country of regionPonderation provided').optional().isIn(constants.allCountries);
    request.checkQuery('text', 'No valid text of regionPonderation provided').optional().isAlpha();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('country', 'No valid country of regionPonderation provided').optional().isIn(constants.allCountries);
    request.checkBody('ponderation', 'No valid ponderation of regionPonderation provided').isFloat();
    request.checkBody('text', 'No valid text of regionPonderation provided').optional().isAlpha();
    request.checkBody('limit', 'No valid limit provided').optional().isNumeric();
    request.checkBody('offset', 'No valid limit provided').optional().isNumeric();
    request.checkBody('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('country', 'No valid country of regionPonderation provided').optional().isIn(constants.allCountries);
    request.checkBody('ponderation', 'No valid ponderation of regionPonderation provided').isFloat();
    request.checkBody('text', 'No valid text of regionPonderation provided').optional().isAlpha();
    request.checkBody('limit', 'No valid limit provided').optional().isNumeric();
    request.checkBody('offset', 'No valid limit provided').optional().isNumeric();
    request.checkBody('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);
};