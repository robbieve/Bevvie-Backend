// DB
let Chat = require('api/models/chats/chat');
// Validator
let expressValidator = require('lib/validation/validator');
let constants = require("api/common/constants");
let commonFunctions = require("api/validators/common");


module.exports.getOneValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.getValidator = function (request, response, next) {
    request.checkQuery('user', 'No valid user provided').optional().isObjectId();
    request.checkQuery('status', 'No valid status provided').optional().isArrayAndIsIn(constants.chats.chatStatuses);
    request.checkQuery('venue', 'No valid venue provided').optional().isObjectId();
    request.checkQuery('maxAge', 'No valid maxAge provided').optional().isNumeric();
    request.checkQuery('minAge', 'No valid minAge provided').optional().isNumeric();
    request.checkQuery('limit', 'No valid limit provided').optional().isNumeric();
    request.checkQuery('offset', 'No valid offset provided').optional().isNumeric();
    request.checkQuery('active', 'No valid active provided').optional().isAlpha();
    commonFunctions.validate(request,response,next);};

module.exports.postValidator = function (request, response, next) {
    request.checkBody('status', 'No valid status provided').isIn(constants.chats.chatStatuses);
    commonFunctions.validate(request,response,next);
};

module.exports.postUpdateValidator = function (request, response, next) {
    request.checkBody('status', 'No valid status provided').isIn(constants.chats.chatStatuses);
    commonFunctions.validate(request,response,next);
};

module.exports.getOneMessageValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id of chat provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

module.exports.postOneMessageValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id of chat provided').isObjectId();
    request.checkBody('message', 'No valid message for chat provided').notEmpty();
    commonFunctions.validate(request,response,next);
};
module.exports.postRejectValidator = function (request, response, next) {
    request.checkParams('id', 'No valid id of chat provided').isObjectId();
    commonFunctions.validate(request,response,next);
};

