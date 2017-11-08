// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Chat = require('api/models/chats/chat');
let Message = require('api/models/chats/message');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');
let pushUtils = require("api/controllers/common/pushUtils");

// Validator
let expressValidator = require('lib/validation/validator');
let chatValidator = require('api/validators/chatValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");
let redis = require("lib/redis/redis");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    let userInChat = newObject.members.filter(function (element) {
        return element && element.user && element.user.toString() === request.user._id.toString();
    });
    // If not admin, cannot post
    if (!request.user.admin && userInChat === 0) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update this chat',
            rawError: 'user ' + request.user._id + ' is not admin'
        });
        return;
    }
    callback(newObject);
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /chats Post new chat
     * @apiName PostNewChat
     * @apiVersion 0.8.0
     * @apiGroup Chats
     *
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse ChatParameters
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(Chat, newObject, request, response, next, function (err, chat) {
                    let notCreators = newObject.members.filter(function (element) {
                        return element && element.user && element.user.toString() === request.user._id.toString() && !element.creator;
                    });
                    notCreators.forEach(function (chatUser) {
                        let user = chatUser.user;
                        pushUtils.sendCreateChatPush(user, chat);
                    });

                });
            });
        })

    /**
     * @api {get} /chats Get chats
     * @apiName GetChats
     * @apiVersion 0.8.0
     * @apiGroup Chats
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String="pending","accepted","rejected","exhausted","expired"} [status] status to match. Might be an array
     * @apiParam {String} [user] id of a user in the chat
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active chats or not

     * @apiSuccess {Object[]} docs       List of chats.
     * @apiSuccess {String}   docs._id   Id of the chat.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the chat.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        chatValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "status": "status",
                    "user": "members.user",
                },
                other: {
                    active: {
                        _default: true,
                        _values: {
                            "false": false,
                            "all": "_delete",
                        }
                    },
                }
            };

            // SORT
            let sortTransform = {
                _default: ["createdAt", 1],
                date: "createdAt",
            };

            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Chat,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        chatValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Chat, request, response, next)
        })

    /**
     * @api {get} /chat/id Get chat by id
     * @apiName GetChat
     * @apiVersion 0.8.0
     * @apiGroup Chats
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the chat
     *
     * @apiSuccess {String}   _id   Id of the chat.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /chats/id Update chat
     * @apiName UpdateChat
     * @apiVersion 0.8.0
     * @apiGroup Chats
     * @apiParam {String} id the chat's id
     * @apiUse ChatParameters
     *
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Chat, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /chat/id Delete chat by id
     * @apiName DeleteChat
     * @apiVersion 0.8.0
     * @apiGroup Chats
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the chat
     *
     * @apiSuccess {String}   _id   Id of the chat.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        let chat = response.object;
        let userInChat = chat.members.filter(function (element) {
            return element.user._id.toString() === request.user._id.toString();
        });
        if (!request.user.admin && userInChat.length === 0) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a chat',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Chat.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

router.route('/:id/messages')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        chatValidator.getOneMessageValidator,
        function (request, response, next) {
            route_utils.getOne(Chat, request, response, next)
        })

    /**
     * @api {get} /chat/id/messages Get messages by chat by id
     * @apiName GetChatMessages
     * @apiVersion 0.8.0
     * @apiGroup ChatMessages
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the chat
     * @apiParam {Date} [fromDate] messages from date
     * @apiSuccess {String}   _id   Id of the chat.
     * @apiUse ErrorGroup
     */
    .get(function (request, response, next) {
        let options = {sort: [["createdAt", -1]]};
        let query = {chat: request.params.id};
        if (request.query.fromDate) {
            query["createdAt"] = {$gte: request.query.fromDate};
        }
        route_utils.getAll(Message,
            query,
            options,
            request, response, next)
    })
    /**
     * @api {post} /chats/id/messages post a message
     * @apiName SendChatMessages
     * @apiVersion 0.8.0
     * @apiGroup ChatMessages
     * @apiParam {String} id the chat's id
     * @apiUse ChatParameters
     *
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postOneMessageValidator,
        function (request, response, next) {
            let chat = response.object;
            let userInChat = chat.members.filter(function (element) {
                return element.user._id.toString() === request.user._id.toString();
            });
            // If not admin, cannot post
            if (!request.user.admin && userInChat.length === 0) {
                response.status(403).json({
                    localizedError: 'You are not authorized to create a message',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
                return;
            }
            let message = {
                chat: chat._id,
                user: request.user._id,
                message: request.body.message
            };
            if (
                chat.status === constants.chats.chatStatusNames.created &&
                chat.chatCreator().user._id.toString() === request.user._id.toString()
            ) { // If Chat's state is CREATED and requester's user is Chat's creator, an error will be returned.
                return response.status(400).json(errorConstants.responseWithError(request.user, errorConstants.errorNames.chat_chatNotYetAccepted));
            }
            else if (
                chat.status === constants.chats.chatStatusNames.created &&
                chat.chatCreator().user._id.toString() !== request.user._id.toString()
            ) { // If Chat's state is CREATED and requester's user isn't Chat's creator, Chat's state will change to ACCEPTED.
                chat.status = constants.chats.chatStatusNames.accepted;
                chat.save(function (err, chat) {
                    if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    redis.deleteCachedResult({_id: chat._id}, Chat.modelName, function (err) {
                        route_utils.post(Message, message, request, response, next, function (err, message) {
                            pushUtils.sendCreateMessagePush(message);
                        });
                    });
                })
            }
            else if (
                chat.status === constants.chats.chatStatusNames.accepted &&
                chat.chatCreator().user._id.toString() === request.user._id.toString()
            ) { // If this is creator's third message, Chat's state will change to EXHAUSTED and, 18 hours later, it will change to EXPIRED.
                Message.count({chat: chat._id}, function (err, count) {
                    if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    if (count >= constants.chats.maxMessages - 1) {
                        chat.status = constants.chats.chatStatusNames.exhausted;
                    }
                    chat.save(function (err, chat) {
                        if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                        redis.deleteCachedResult({_id: chat._id}, Chat.modelName, function (err) {
                            route_utils.post(Message, message, request, response, next, function (err, message) {
                                pushUtils.sendCreateMessagePush(message);
                            });
                        });
                    })
                })
            }
            else if (
                chat.status === constants.chats.chatStatusNames.exhausted ||
                chat.status === constants.chats.chatStatusNames.rejected ||
                chat.status === constants.chats.chatStatusNames.expired
            ) { // If Chat's state is CREATED and requester's user is Chat's creator, an error will be returned.
                return response.status(400).json(errorConstants.responseWithError(chat, errorConstants.errorNames.chat_chatExhausted));
            }
            else {
                redis.deleteCachedResult({_id: chat._id}, Chat.modelName, function (err) {
                    route_utils.post(Message, message, request, response, next, function (err, message) {
                        pushUtils.sendCreateMessagePush(message);
                    });
                });
            }
        });

router.route('/:id/reject')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        chatValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Chat, request, response, next)
        })

    /**
     * @api {post} /chats/id/reject post a message
     * @apiName RejectChatMessages
     * @apiVersion 0.9.0
     * @apiGroup ChatMessages
     * @apiParam {String} id the chat's id
     * @apiUse ChatParameters
     *
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postRejectValidator,
        function (request, response, next) {
            let chat = response.object;
            // If not admin, cannot post
            if (!request.user.admin && request.user._id.toString() === chat.chatCreator().user._id.toString()) {
                response.status(403).json({
                    localizedError: 'You are not authorized to reject a chat',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
                return;
            }
            chat.status = constants.chats.chatStatusNames.rejected
            route_utils.post(Chat, chat, request, response, next, function (err, aChat) {
                pushUtils.sendRejectedChat(aChat,request.user);
            });
        });

module.exports = router;
