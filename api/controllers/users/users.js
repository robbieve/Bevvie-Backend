// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let User = require('api/models/users/user');

let dbError = require('lib/loggers/db_error');
let redis = require('lib/redis/redis');
let winston = require('lib/loggers/logger').winston;
let stripe = require('lib/stripe/stripe');
let async = require('async');
let moment = require("moment");
let config = require("config");
let mailUtils = require("api/controllers/common/mailUtils");
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
     * @apiVersion 0.0.1
     * @apiGroup Users
     * @apiHeader  {String} Accept-Language=es Accepted language.
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} email text to match on user's name
     * @apiParam {String} text text search on user
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="admin","telemarketing","client","vetcenter","userOne"} userType user type to match
     * @apiParam {String="createdAt","origin","city","name","email"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active users or not

     * @apiSuccess {Object[]} data       List of users.
     * @apiSuccess {String}   data._id   Id of the users.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        userValidator.getValidator,
        function (request, response, next) {
            let newClient = request.body;

            // FILTER
            let transform = {
                directQuery: {
                    "email": "email",
                    "userType": "roles",
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
                }
            };
            let query = route_utils.filterQuery(request.query, transform);

            // SORT
            let sortTransform = {
                createdAt: "createdAt",
                email: "email",
                origin: "sort.name",
                city: "address.city",
                name: "name",

            };

            let options = {};
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

            let filterQuery = User.filterQuery(request.user, function (error, filter) {
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
     * @apiVersion 0.0.1
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
     * @apiVersion 0.0.1
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will update data to Royal Canin if user is type of client.
     *
     * @apiUse UserParameters
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postUpdateValidator,
        function (request, response, next) {
            let newObject = request.body;
            let user = response.object;
            let userPets = [];
            if (user.roles.indexOf(constants.roleNames.client) > -1) { // This is a final client, modify on royalCanin
                async.series([
                    function (done) {  // Should login first to get token
                        let royalCaninUser = user.mapToRoyalCanin();
                        let loginUser = {
                            email: user.email,
                            userPassword: user.royalCaninPassword,
                            appid: royalCaninUser.appId,
                            clientid: royalCaninUser.clientId,
                            unixtime: Math.floor(moment().utc() / 1000),
                        };
                        royalCanin.login(loginUser, function (err, data) {
                            if (err || !data) {
                                let newErr = {
                                    localizedError: 'Could not change user data. User exists and password is not valid',
                                    rawError: 'Royal Canin answered ' + err
                                };
                                response.status(403).json(newErr);
                                done(newErr);
                            }
                            else {
                                newObject.royalCaninToken = data.body.accessToken;
                                royalCanin.accessToken = data.body.accessToken;
                                done();
                            }

                        });
                    },
                    function (done) { // If new password, change it
                        // If new password, change it
                        if (newObject.password && user.royalCaninPassword && user.royalCaninIdentifier) {
                            royalCanin.changePassword(user.royalCaninIdentifier, user.royalCaninPassword, newObject.password, function (err, res) {
                                if (err) {
                                    let newErr = {
                                        localizedError: 'Could not change user password on royal canin',
                                        rawError: 'Royal Canin answered ' + err
                                    };
                                    response.status(500).json(newErr);
                                    return done(newErr);
                                }
                                // Save new password
                                newObject.royalCaninPassword = newObject.password;
                                return done();
                            });
                        }
                        else {
                            done();
                        }
                    },
                    function (done) {
                        // Get pets
                        Pet.find({owner: user._id}, function (err, pets) {
                            if (err) {
                                response.status(500).json(err);
                                done(err);
                            }
                            else if (!pets || pets.length === 0) {
                                let newErr = {
                                    localizedError: 'Could not update user. No pets found',
                                    rawError: 'user ' + request.user._id + ' has no pets'
                                };
                                response.status(400).json(newErr);
                                done(newErr)
                            }
                            else {
                                userPets = pets;
                                done();
                            }

                        });
                    }
                    ,
                    function (done) { // Change new data
                        let newUser = user.mapObject(null, newObject);
                        let royalCaninUser = newUser.mapToRoyalCanin();
                        royalCaninUser.pets = userPets.map(function (aPet) {
                            return aPet.mapToRoyalCanin();
                        });
                        royalCanin.updateUserData(royalCaninUser, user.royalCaninIdentifier, function (err, res) {
                            if (err) {
                                let newErr = {
                                    localizedError: 'Could not change user data on royal canin',
                                    rawError: 'Royal Canin answered ' + err
                                };
                                response.status(500).json(newErr);
                                return done(newErr);
                            }
                            return done();
                        });
                    },
                ], function (err) {
                    if (err) {
                        winston.error("ERROR: Updating user " + newObject.email + " data " + newObject + " response " + err);
                    }
                    else {
                        route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
                    }
                });
            }
            else if (user.roles.indexOf(constants.roleNames.vetcenter) > -1) { // Vetcenter can be modified by admin
                if (request.user.roles.indexOf(constants.roleNames.admin) > -1) {
                    route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
                }
                else if (
                    request.user.roles.indexOf(constants.roleNames.telemarketing) > -1 ||
                    request.user.roles.indexOf(constants.roleNames.vetcenter) > -1
                ) { // Send mail to admin
                    User.find({roles: constants.roleNames.admin}, function (err, admins) {
                        if (err) {
                            return response.status(500).json(errorConstants.errorNames(err, constants.errorNames.dbGenericError));
                        }
                        async.each(admins,
                            function (admin, isDone) {
                                let modifications = JSON.parse(JSON.stringify(request.body));
                                modifications._id = request.params.id;
                                mailUtils.sendMailModifications(modifications, admin, isDone)
                            },
                            function (err) {
                                if (err) {
                                    return response.status(500).json(errorConstants.errorNames(err, constants.errorNames.mailError));
                                }
                                return response.status(200).json({});

                            });
                    });
                }
            }
            else {
                route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
            }
        })
    /**
     * @api {delete} /users/id Delete user by id
     * @apiName DeleteUser
     * @apiVersion 0.0.1
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     *
     */
    .delete(function (request, response) {
        // If not admin, fail
        if (!request.user.hasRoles([constants.roleNames.admin])) {
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


module.exports = router;
