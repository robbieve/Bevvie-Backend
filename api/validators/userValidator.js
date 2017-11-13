// DB
let User = require('api/models/users/user');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('validated', 'No valid validated field provided').optional().isIn(constants.users.validationTypes);
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    request.checkQuery('sort.field', 'No valid sort field provided').optional().isIn(constants.users.sortNames);
    request.checkQuery('sort.order', 'No valid sort order provided').optional().isIn(constants.sortOrderNames);
    request.checkQuery('admin', 'No valid admin provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);
};


module.exports.postUpdateValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    request.checkBody('admin', 'No valid admin value provided').optional().isBoolean();
    request.checkBody('image', 'No valid image provided').optional().isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postValidateValidator = function (request, response, next) {

    request.checkParams('id', 'No valid id provided').isObjectId();
    request.checkBody('validated_images', 'No valid validated_images value provided').isArrayOfObjectId();
    request.checkBody('rejected_images', 'No valid rejected_images provided').isArrayOfObjectId();
    request.checkBody('about_validated', 'No valid about_validated provided').isBoolean();
    commonFunctions.validate(request,response,next);
};

module.exports.postValidateValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};
