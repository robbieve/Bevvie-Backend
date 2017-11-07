const User = require('api/models/users/user');

let kue = require('lib/queue/queue');
let config = require("config");
let winston = require("lib/loggers/logger").winston;
let constants = require("api/common/constants");
let Push = require("api/models/push/pushes");
let Chat = require("api/models/push/pushes");
let Device = require("api/models/push/device");
let async = require("async");



module.exports.sendCreateChatPush = function (user, chat, callback = function () {
}) {
    User.findOne({_id: user},function (err, creatorUser) {
        if (err) return callback(err);
        let usersToNotify = chat.members.filter(function(element){
            return !element.creator;
        }).map(function (element) {
            return element.user
        });
        Device.find({user: {$in: usersToNotify}}, function (err, devices) {
            if (err) return callback(err);
            let message = {
                title: 'New chat',
                topic: config.push.topic,
                body: creatorUser.name + ' wants to chat with you', // REQUIRED
                custom: {
                    chatId: chat._id,
                },
                priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
                retries: 3, // gcm, apn
                badge: 2, // gcm for ios, apn
                //expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
            };
            async.each(
                devices,
                function (element, isDone) {
                    let newPush = JSON.parse(JSON.stringify(message));
                    newPush.device = element;
                    let pushObject = new Push(newPush);
                    pushObject.save(function (err,object) {
                        if (err) return callback(err);
                        let job = kue.createJob("push", {
                            token: element.pushToken,
                            message: message
                        });
                        let pushId = object._id;
                        job.on('complete', function (result) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.succeed;
                                object.save(function (err,object) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.info("PUSH: chat create push finished to "+object.device.pushToken);
                                })
                            })
                        }).on('failed attempt', function (result) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.failedAttempt;
                                object.save(function (err) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.warn("PUSH: chat create push failed attempt to "+object.device.pushToken);
                                })
                            })
                        }).on('failed', function (errorMessage) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.failed;
                                object.save(function (err) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.err("PUSH: chat create push failed to "+object.device.pushToken);
                                })
                            })

                            winston.error("PUSH: Failed push " + errorMessage);
                        }).attempts(3).backoff({type: 'exponential'}).save(callback);
                    })
                },
                function (err) {
                    callback(err);
                });
        });
    });
};

module.exports.sendCreateMessagePush = function (message, callback = function () {
}) {
    let creatorUser,chat, devices, message;
    async.series([
        function (isDone) {
            User.findOne({_id: message.user},function (err, aUser) {
                creatorUser = aUser;
                isDone(err);
            });
        },
        function (isDone) {
            Chat.findOne({_id: message.chat},function (err, aChat) {
                chat = aChat;
                isDone(err);
            });
        },
        function (isDone) {
            Device.find({user: {$in: usersToNotify}}, function (err, someDevices) {
                devices = someDevices;
                message = {
                    title: 'New message from '+creatorUser.name ,
                    topic: config.push.topic,
                    body: message.message,
                    custom: {
                        chatId: chat._id,
                    },
                    priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
                    retries: 3, // gcm, apn
                    badge: 2, // gcm for ios, apn
                    //expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
                };
                isDone(err);
            })
        },
        function (isReallyDone) {
            async.each(
                devices,
                function (element, isDone) {
                    let newPush = JSON.parse(JSON.stringify(message));
                    newPush.device = element;
                    let pushObject = new Push(newPush);
                    pushObject.save(function (err,object) {
                        if (err) return isDone(err);
                        let job = kue.createJob("push", {
                            token: element.pushToken,
                            message: message
                        });
                        let pushId = object._id;
                        job.on('complete', function (result) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.succeed;
                                object.save(function (err,object) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.info("PUSH: chat create push finished to "+object.device.pushToken);
                                })
                            })
                        }).on('failed attempt', function (result) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.failedAttempt;
                                object.save(function (err) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.warn("PUSH: chat create push failed attempt to "+object.device.pushToken);
                                })
                            })
                        }).on('failed', function (errorMessage) {
                            Push.findOne({_id:pushId},function (err,object) {
                                return winston.error("PUSH: object not found for id " + pushId);
                                object.status = constants.pushes.statusNames.failed;
                                object.save(function (err) {
                                    return winston.error("PUSH: could not save object for id " + pushId);
                                    winston.err("PUSH: chat create push failed to "+object.device.pushToken);
                                })
                            })

                            winston.error("PUSH: Failed push " + errorMessage);
                        }).attempts(3).backoff({type: 'exponential'}).save(isDone);
                    })
                },
                function (err) {
                    isDone(err);
                });
        }
    ],function (err) {

    })

    User.findOne({_id: message.user},function (err, creatorUser) {

        Device.find({user: {$in: usersToNotify}}, function (err, devices) {
            if (err) return callback(err);
            let message = {
                title: 'New chat',
                topic: config.push.topic,
                body: creatorUser.name + ' wants to chat with you', // REQUIRED
                custom: {
                    chatId: chat._id,
                },
                priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
                retries: 3, // gcm, apn
                badge: 2, // gcm for ios, apn
                //expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
            };

        });
    });
};
