// DB
let Imabe = require('api/models/blobs/images');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");
const mime = require("node-mime");

module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('s3.identifier', 'No valid s3 identifier for image provided').optional().isAlphanumeric();
    request.checkQuery('s3.url', 'No valid s3 url for image provided').optional().isURL();
    request.checkQuery('contentType', 'No valid contentType provided').optional().isIn(Object.keys(mime.types));
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('owner', 'No valid owner provided').optional().isMongoId();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('md5', 'No valid md5 for image provided').optional().isAlphanumeric();
    request.checkBody('s3.identifier', 'No valid s3 identifier for image provided').optional().isAlphanumeric();
    request.checkBody('s3.url', 'No valid s3 url for image provided').optional().isURL();
    commonFunctions.validate(request,response,next);
};
