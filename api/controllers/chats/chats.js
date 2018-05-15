// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');
const async = require("async");

// DB
let Chat = require('api/models/chats/chat');
let Message = require('api/models/chats/message');
let User = require('api/models/users/user');
let Block = require('api/models/users/block');
let dbError = require('lib/loggers/db_error');
let pushUtils = require("api/controllers/common/pushUtils");
let blockExecutionUtils = require("api/controllers/common/blockExecutionUtils");
let winston = require("lib/loggers/logger").winston;

// Validator
let expressValidator = require('lib/validation/validator');
let chatValidator = require('api/validators/chatValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");
let redis = require("lib/redis/redis");

var config = require('config');


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
     * @apiParam {String} message initial message of the chat
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     * @apiUse ErrorChatBlocked
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                let notCreators = newObject.members.filter(function (element) {
                    return element && element.user && !element.creator;
                });
                let creator = newObject.members.filter(function (element) {
                    return element && element.user && element.creator;
                });
                if (!creator || creator.length === 0) {
                    notCreators = [];
                }
                if (!notCreators || notCreators.length === 0) {
                    notCreators = [];
                }
                async.each(notCreators, function (userDest, blockDone) {
                    let aBlock = {
                        userBlocks: userDest.user,
                        userBlocked: creator[0].user,
                        active: true
                    };
                    Block.findOne(aBlock, function (err, block) {
                        if (err) {
                            return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                        }
                        if (block) {
                            err = errorConstants.responseWithError(block, errorConstants.errorNames.chat_chatBlocked);
                        }
                        blockDone(err);
                    });
                }, function (err) {
                    if (err) return response.status(403).json(err);
                    let ids = newObject.members.map(function (member) {
                        return member.user;
                    });
                    Chat.find({ "members.user": { $all: ids}, "venue": newObject.venue},{sort: ['createdAt', -1], limit: 1},function(err,chats){
                        let chat = Array.isArray(chats) && chats.length > 0 ? chats[0] : undefined;
                        if(chat){
                            if ( chat.status === constants.chats.chatStatusNames.created ) {
                                chat.status = constants.chats.chatStatusNames.accepted;
                                route_utils.postUpdate(Chat, {'_id': request.params.id}, chat, request, response, next);
                            }
                            // 30 MINUTES COOLDOWN
                            else if(moment.duration(moment().diff(moment(chat.createdAt))).asMinutes() < config.chatCoolDown) {
                                return response.status(409).json(errorConstants.responseWithError(null, errorConstants.errorNames.chat_cooldown));
                            }
                        }
                        else {
                            route_utils.post(Chat, newObject, request, response, next, function (err, chat) {
                                blockExecutionUtils.programChatDeactivation(chat);
                                let theCreators = newObject.members.filter(function (element) {
                                    return element && element.user && element.creator;
                                });
                                if (theCreators && theCreators[0] && theCreators[0].user) {
                                    let message = new Message({
                                        chat: chat._id,
                                        user: theCreators[0].user,
                                        message: request.body.message ? request.body.message : ""
                                    });
                                    message.save(function (err) {
                                        if (err) winston.error("CHATS: There was an error saving the first message " + JSON.stringify(err));
                                        pushUtils.sendCreateChatPush(theCreators[0].user, chat);
                                    })
                                }
                            });
                        }
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
     * @apiParam {String="created","accepted","rejected","exhausted","expired"} [status] status to match. Might be an array
     * @apiParam {String} [user] id of a user in the chat
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt","updatedAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active chats or not
     *
     * @apiSuccess {Object[]} docs       List of chats.
     * @apiSuccess {String}   docs._id   Id of the chat.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the chat.
     * @apiSuccess   {String}   venue match chats on this venue
     *
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .get(expressValidator,
        chatValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "status": "status",
                    "user": "members.user",
                    "venue": "venue",
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
                _default: [["createdAt", 1]],
                createdAt: "createdAt",
                updatedAt: "updatedAt"
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
     * @apiVersion 0.12.0
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
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active chats or not
     * @apiSuccess {String}   _id   Id of the chat.
     * @apiUse ErrorGroup
     */
    .get(function (request, response, next) {
        // FILTER
        let transform = {
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
            _default: [["createdAt", 1]],
            createdAt: "createdAt",
        };

        let query = route_utils.filterQuery(request.query, transform);
        query["chat"] = request.params.id;
        if (request.query.fromDate) {
            query["createdAt"] = {$gte: request.query.fromDate};
        }

        let options = {sort: []};
        options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);

        route_utils.getAll(Message,
            query,
            options,
            request, response, next)
    })
    /**
     * @api {post} /chats/id/messages Post a message
     * @apiName SendChatMessages
     * @apiVersion 0.8.0
     * @apiGroup ChatMessages
     * @apiParam {String} id the chat's id
     * @apiUse MessageParameters
     *
     * @apiSuccess (201) {String} _id the chat's id
     * @apiUse ErrorGroup
     * @apiUse ErrorChatNotYetAccepted
     * @apiUse ErrorChatExhausted
     * @apiUse ErrorChatBlocked
     */
    .post(jsonParser,
        expressValidator,
        chatValidator.postOneMessageValidator,
        function (request, response, next) { // Cannot chat to blocked users
            let notCreators = response.object.members.filter(function (element) {
                return element && element.user && !element.creator;
            });
            if (!notCreators || notCreators.length === 0) {
                return next();
            }
            async.each(notCreators, function (userDest, blockDone) {
                let aBlock = {
                    userBlocks: userDest.user,
                    userBlocked: request.user._id,
                    active: true
                };
                Block.findOne(aBlock, function (err, block) {
                    if (err) {
                        return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    }
                    if (block) {
                        return response.status(403).json(errorConstants.responseWithError(block, errorConstants.errorNames.chat_chatBlocked));
                    }
                    next();
                });
            });
        },
        function (request, response, next) {
            Chat.findOne({_id: response.object._id}, function (err, chat) {
                if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                response.object = chat;
                next();
            });
        },
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
                chat.status === constants.chats.chatStatusNames.exhausted ||
                chat.status === constants.chats.chatStatusNames.rejected ||
                chat.status === constants.chats.chatStatusNames.expired
            ) { // If Chat's state is CREATED and requester's user is Chat's creator, an error will be returned.
                return response.status(400).json(errorConstants.responseWithError(chat, errorConstants.errorNames.chat_chatExhausted));
            }
            else {
                // If this is creator's third message, Chat's state will change to EXHAUSTED and, 18 hours later, it will change to EXPIRED.
                let ownMessages, messagesList, DBMessage;
                async.series([
                    function (doneMes) {
                        Message.find({chat: chat._id}, function (err, messages) {
                            if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                            ownMessages = messages.filter(function (message) {
                                return message.user._id.toString() === request.user._id.toString();
                            });
                            if (ownMessages.length >= constants.chats.maxMessages) {
                                return response.status(400).json(errorConstants.responseWithError(chat, errorConstants.errorNames.chat_chatExhausted));
                            }
                            messagesList = messages;
                            doneMes();
                        });
                    },
                    function (doneMes) {
                        DBMessage = Message.mapObject(null, message);
                        Message.validateObject(DBMessage, function (err) {
                            if (err) {
                                return response.status(400).json(err);
                            }
                            doneMes();
                        });
                    },
                    function (doneMes) {
                        DBMessage.save(function (err) {
                            if (err) {
                                if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                            }
                            doneMes();
                        });
                    },
                    function (doneMes) {
                        let chatUser = chat.members.filter(function (member) {
                            return member.user._id.toString() === DBMessage.user.toString();
                        })[0];
                        if (chatUser) {
                            chatUser.lastMessageSeen = DBMessage._id;
                        }

                        if (chat.status === constants.chats.chatStatusNames.created) {
                            chat.status = constants.chats.chatStatusNames.accepted;
                        }
                        // TODO: JUST IF CREATOR'S 5th Message!
                        let sender = DBMessage.user;
                        if(messagesList.map(message => { return message.user === sender ? item : undefined}) >= constants.chats.maxMessages) {
                            return response.status(409).json(errorConstants.responseWithError(null, errorConstants.errorNames.chat_maxMessages));
                        }
                        if (messagesList.length >= (constants.chats.maxMessages*2)-1) {
                            chat.status = constants.chats.chatStatusNames.exhausted;
                        }

                        chat.save(function (err, chat) {
                            if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                            redis.deleteCachedResult({_id: chat._id}, Chat.modelName);
                            let query = {_id: DBMessage.id};
                            // Delete any listings of this kind of object
                            redis.deleteCachedResult(query, Message.modelName);
                            doneMes();
                        });
                    },

                ], function (err) {
                    pushUtils.sendCreateMessagePush(DBMessage);
                    response.status(201).json(DBMessage);
                })
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
     * @api {post} /chats/id/reject Rejects a chat
     * @apiName RejectChat
     * @apiVersion 0.9.0
     * @apiGroup Chats
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
                pushUtils.sendRejectedChat(aChat, request.user);
            });
        });

module.exports = router;
