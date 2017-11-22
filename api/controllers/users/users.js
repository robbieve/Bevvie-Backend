// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let User = require('api/models/users/user');
let Image = require('api/models/blobs/images');

let dbError = require('lib/loggers/db_error');
let redis = require('lib/redis/redis');
let winston = require('lib/loggers/logger').winston;
let stripe = require('lib/stripe/stripe');
let async = require('async');
let moment = require("moment");
let config = require("config");
let mailUtils = require("api/controllers/common/mailUtils");
let pushUtils = require("api/controllers/common/pushUtils");
let token = require("api/models/users/token");
let device = require("api/models/push/device");
let checkin = require("api/models/checkins/checkin");

const errorConstants = require('api/common/errorConstants');


// Validator
let expressValidator = require('lib/validation/validator');
let userValidator = require('api/validators/userValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {get} /users Get users
     * @apiName GetUsers
     * @apiVersion 0.11.0
     * @apiGroup Users
     * @apiHeader  {String} Accept-Language=es Accepted language.
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {String} name name search on user
     * @apiParam {String} text text search on user
     * @apiParam {String="true","false","pending"} [validated] filter by validated.
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt","name","country","languages","banned"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active users or not
     * @apiParam {String="true","false","all"} admin=false match admin users or not
     *
     *
     * @apiSuccess {Object[]} data       List of users.
     * @apiSuccess {String}   data._id   Id of the users.
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .get(expressValidator,
        userValidator.getValidator,
        function (request, response, next) {
            let newClient = request.body;

            // FILTER
            let transform = {
                regexQuery: {
                    "name": "name",
                },
                textQuery: {
                    language: request.headers["Accept-Language"]
                },
                other: {
                    active: {
                        _default: true,
                        _values: {
                            "false": false,
                            "all": "_delete",
                        }
                    },
                    admin: {
                        _default: false,
                        _values: {
                            "true": true,
                            "all": "_delete",
                        }
                    },
                }
            };
            let query = route_utils.filterQuery(request.query, transform);


            let options = {};
            async.series([
                function (isDone) {
                    // SORT
                    let sortTransform = {
                        _default: [["createdAt", 1]],
                        createdAt: "createdAt",
                        name: "name",
                        country: "country",
                        languages: "languages",
                        banned: "banned",

                    };

                    if (request.query.limit !== undefined && Number(request.query.limit) >= 0) {
                        options.limit = Number(request.query.limit);
                    }
                    if (request.query.offset !== undefined && Number(request.query.offset) >= 0) {
                        options.offset = Number(request.query.offset);
                    }
                    else if (request.query.page !== undefined && Number(request.query.page) >= 0) {
                        options.page = Number(request.query.page);
                    }

                    options["sort"] = route_utils.sortQuery(request.query.sort, sortTransform);
                    isDone();
                },
                function (isDone) {
                    if (!request.query.validated) {
                        isDone();
                    }
                    else {
                        let validated = request.query.validated;
                        if (validated === constants.users.validationTypeNames.pending) {
                            validated = null;
                        }
                        Image.find({validated: validated}, function (err, result) {
                            if (err) return isDone(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                            let ids = result.map(function (image) {
                                return image.owner;
                            });
                            //({$or: [{_id: {$in: ids}},{about_validated: validated}]})
                            query["about_validated"] = validated;
                            query = {
                                $or: [
                                    {_id: {$in: ids}},
                                    query
                                ]
                            }
                            isDone();
                        })
                    }
                }
            ], function (err) {
                User.filterQuery(request.user, function (error, filter) {
                    if (error) return response.status(404).json(error);
                    Object.assign(query, filter);
                    let cacheQuery = {};
                    Object.assign(cacheQuery, query);
                    Object.assign(cacheQuery, options);
                    redis.getCachedResults(cacheQuery, User.modelName + "-list", request, function (err, reply) {
                        if (err) {
                            return response.status(500).json({
                                localizedError: 'There was an error at the caching system',
                                rawError: 'error: ' + err
                            });
                        }
                        else if (reply) {
                            response.status(200).json(reply);
                        }
                        else {
                            User.paginate(query, options, function (err, object) {
                                redis.setCachedResult(cacheQuery, User.modelName + "-list", object);
                                if (err) return dbError(err, request, response, next);
                                response.json(object);
                            });
                        }
                    });
                });
            })


        });

router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            route_utils.getOne(User, request, response, next)
        })

    /**
     * @api {get} /users/id Get user by id
     * @apiName GetUser
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /users/id Modify user
     * @apiName ModifyUser
     * @apiVersion 0.15.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will update a user.
     *
     * @apiUse UserParameters
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postUpdateValidator,
        function (request, response, next) {
            let newObject = request.body;
            route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
        })
    /**
     * @api {delete} /users/id Delete user by id
     * @apiName DeleteUser
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     *
     */
    .delete(function (request, response) {
        // If not admin, fail
        if (!request.user.admin) {
            return response.status(403).json({
                localizedError: 'You are not authorized to delete users',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
        }
        redis.deleteCachedResult({_id: response.object._id}, User.modelName, function (err) {
            User.deleteByIds([response.object._id], function (err, user) {
                if (err) return dbError(err, request, response, next);
                response.status(200).json(user)
            });
        });

    });

router.route('/:id/validate')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            // If not admin, fail
            if (!request.user.admin) {
                return response.status(403).json({
                    localizedError: 'You are not authorized to validate profiles',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
            }
            route_utils.getOne(User, request, response, next)
        })
    /**
     * @api {post} /users/id/validate Validate a user profile or images
     * @apiName ValidateUserProfile
     * @apiVersion 0.11.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiParam {String[]} validated_images id of the validated images
     * @apiParam {String[]} rejected_images id of the rejected images
     * @apiParam {Boolean} about_validated whether the about has been validated or not
     * @apiDescription This method will update a user.
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postValidateValidator,
        function (request, response, next) {
            let sendPushType;
            let validationObject = request.body;
            let user = response.object;
            async.series([
                    function (isDone) {
                        if (request.body.about_validated !== undefined) {
                            user.about_validated = request.body.about_validated;
                        }
                        isDone();
                    },
                    function (isDone) {
                        if (!validationObject.validated_images || !Array.isArray(validationObject.validated_images)) {
                            return isDone();
                        }
                        else {
                            async.each(
                                validationObject.validated_images,
                                function (element, isDoneImage) {
                                    Image.findOne({_id: element}, function (err, image) {
                                        if (err) return isDoneImage(err)
                                        image.validated = true;
                                        image.save(isDoneImage);
                                    })
                                },
                                function (err) {
                                    isDone(err);
                                })
                        }
                    },
                    function (isDone) {
                        if (!validationObject.rejected_images || !Array.isArray(validationObject.rejected_images)) {
                            return isDone();
                        }
                        else {
                            async.each(
                                validationObject.rejected_images,
                                function (element, isDoneImage) {
                                    Image.remove({_id: element}, isDoneImage)
                                },
                                function (err) {
                                    isDone(err);
                                })
                        }
                    },
                    function (isDone) {
                        Image.find({_id: {$in: user.images}, validated:true },function (err,images) {

                            /* // Full validation
                            if (!images || images.length < 3){
                                sendPushType = constants.pushes.pushTypeNames.invalidProfile;
                            }
                            else if (validationObject.about_validated && validationObject.about_validated === false || ){
                                sendPushType = constants.pushes.pushTypeNames.validProfileReview;
                            }
                            else if (validationObject.rejected_images && Array.isArray(validationObject.rejected_images) && validationObject.rejected_images>0) {
                                sendPushType = constants.pushes.pushTypeNames.validProfileReview;
                            }
                            else{
                                sendPushType = constants.pushes.pushTypeNames.validProfile;
                            }
                            */

                            if (validationObject.about_validated && validationObject.about_validated === "false"){
                                sendPushType = constants.pushes.pushTypeNames.validProfileReview;
                            }
                            else if (validationObject.rejected_images && Array.isArray(validationObject.rejected_images) && validationObject.rejected_images>0) {
                                sendPushType = constants.pushes.pushTypeNames.validProfileReview;
                            }
                            else{
                                sendPushType = constants.pushes.pushTypeNames.validProfile;
                            }

                            isDone();
                        })
                    },

                ],
                function (err) {
                    if (err) return isDone(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    route_utils.postUpdate(User, {'_id': request.params.id}, validationObject, request, response, next);
                    if (sendPushType) {
                        pushUtils.sendValidationPush(request.params.id, sendPushType);
                    }
                })
        })


router.route('/:id/ban')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            // If not admin, fail
            if (!request.user.admin) {
                return response.status(403).json({
                    localizedError: 'You are not authorized to delete users',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
            }
            route_utils.getOne(User, request, response, next)
        })
    /**
     * @api {post} /users/id/ban Ban a user
     * @apiName BanUser
     * @apiVersion 0.11.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will ban a user, delete its access token but not delete the user. Therefore you
     * can unban the user changing the "banned" attribute of the user.
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postBanValidator,
        function (request, response, next) {
            let sendPushType;
            let newObject = request.body;
            async.series([
                    function (isDone) {
                        newObject.banned = true;
                        isDone();
                    },
                    function (isDone) {
                        token.remove({user: request.params.id}, isDone);
                    }
                ],
                function (err) {
                    if (err) return isDone(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
                })
        })

router.route('/:id/deactivate')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            // If not admin or self, fail
            if (!request.user.admin && request.user._id.toString() !== request.params.id.toString()) {
                return response.status(403).json({
                    localizedError: 'You are not authorized to deactivate users',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
            }
            route_utils.getOne(User, request, response, next)
        })
    /**
     * @api {post} /users/id/deactivate Deactivate a user.
     * @apiName DeactivateUser
     * @apiVersion 0.14.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will deactivate the user, delete auth tokens and devices. A user can activate the account again using a login
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postDeactivateValidator,
        function (request, response, next) {
            let sendPushType;
            let newObject = request.body;
            async.series([
                    function (isDone) {
                        newObject.active = false;
                        isDone();
                    },
                    function (isDone) {
                        token.remove({user: request.params.id}, isDone);
                    },
                    function (isDone) {
                        device.remove({user: request.params.id}, isDone);
                    },
                    function (isDone) {
                        checkin.remove({user: request.params.id}, isDone);
                    }
                ],
                function (err) {
                    if (err) return isDone(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
                })
        })

module.exports = router;
