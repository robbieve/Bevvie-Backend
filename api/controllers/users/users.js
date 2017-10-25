// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let User = require('api/models/users/user');
let TemporaryToken = require('api/models/users/temporaryTokens');
let ClientUser = require('api/models/users/clientUser');
let PotentialClient = require('api/models/users/potentiaclientUser');
let Pet = require('api/models/pets/pets');
let Plan = require('api/models/plans/plan');

let dbError = require('lib/loggers/db_error');
let redis = require('lib/redis/redis');
let winston = require('lib/loggers/logger').winston;
let stripe = require('lib/stripe/stripe');
let royalCanin = require('api/controllers/common/royalcaninProvider');
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
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} email text to match on user's name
     * @apiParam {String} text text search on user
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="admin","telemarketing","client","vetcenter","potentialClient"} userType user type to match
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
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will update data to Royal Canin if user is type of client.
     *
     * @apiUse UserParameters
     * @apiUse VetCenterParameters
     * @apiUse PotentialClientParameters
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

router.route('/:id/activate')
    .all(expressValidator,
        function (request, response, next) {
            let baseToken = request.headers['register-token'];
            if (baseToken !== config.auth.baseToken) {
                response.status(401).json({
                    'localizedError': 'Not Authorized',
                    'rawError': 'No authorization token'
                });
                return
            }
            TemporaryToken.findOne({code: request.params.id}, function (err, token) {
                if (err) return dbError(err, request, response, next);
                if (!token) {
                    return response.status(400).json({
                        localizedError: 'token not found',
                        rawError: 'token not found ' + request.params.id
                    });
                }
                response.object = token.user;
                next();
            })
        })

    /**
     * @api {get} /users/id/activate Get user by activation token
     * @apiName GetUserActivate
     * @apiVersion 0.0.1
     * @apiGroup Users
     *
     * @apiParam {Number} id activation token
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /users/id/activate Activate a user
     * @apiName ActivateUser
     * @apiVersion 0.0.1
     * @apiGroup Users
     *
     * @apiParam {Number} id activation token
     * @apiDescription This method will activate the user
     *
     * @apiUse UserParameters
     * @apiUse VetCenterParameters
     * @apiUse PotentialClientParameters
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postActivateValidator,
        function (request, response, next) {
            let newObject = request.body;
            let user = response.object;
            if (user.hasRoles([constants.roleNames.client])) {
                return response.status(500).json({
                    localizedError: 'activating a final client is not allowed',
                    rawError: 'activating a final client is not allowed ' + JSON.stringify(user)
                });
            }
            else {
                newObject.active = newObject.active ? newObject.active : true;
                request.user = user;
                route_utils.postUpdate(User, {'_id': user._id}, newObject, request, response, next);
            }
        });

router.route('/:id/resetpassword')
    .all(expressValidator,
        function (request, response, next) {
            let baseToken = request.headers['register-token'];
            if (baseToken !== config.auth.baseToken) {
                response.status(401).json({
                    'localizedError': 'Not Authorized',
                    'rawError': 'No authorization token'
                });
                return
            }
            TemporaryToken.findOne({code: request.params.id}, function (err, token) {
                if (err) return dbError(err, request, response, next);
                if (!token) {
                    return response.status(400).json({
                        localizedError: 'token not found',
                        rawError: 'token not found ' + request.params.id
                    });
                }
                response.object = token.user;
                next();
            })
        })
    /**
     * @api {post} /users/id/resetpassword Reset a user pass
     * @apiName ResetUserPassword
     * @apiVersion 0.0.1
     * @apiGroup Users
     *
     * @apiParam {Number} id token to reset password
     * @apiParam {String} password
     * @apiDescription This method will reset the user password. Use a new password for it
     *
     * @apiSuccess {Object} user the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postResetValidator,
        function (request, response, next) {
            let newObject = request.body;
            let user = response.object;
            if (user.hasRoles([constants.roleNames.client])) { // This cannot be allowed
                return response.status(500).json({
                    localizedError: 'reseting a final client password is not allowed',
                    rawError: 'reseting a final client password is not allowed ' + JSON.stringify(user)
                });
            }
            else {
                newObject.active = true;
                request.user = user;
                route_utils.postUpdate(User, {'_id': user._id}, newObject, request, response, next);
            }
        });

router.route('/:id/upgrade')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            let id = request.params.id;
            PotentialClient.filterQuery(request.user, function (err, filter) {
                let query = {$and: [{_id: id}, filter]};
                PotentialClient.findOne(query).lean(false).exec(function (err, object) {
                    if (err) return dbError(err, request, response, next);
                    if (!object) {
                        let localizedError = {
                            'localizedError': 'Potential client' + id + ' not found',
                            'rawError': id + ' not found'
                        };
                        response.status(404).json(localizedError)
                    }
                    else {
                        response.object = object;
                        response.status(200);
                        next(null, request, response, next);
                    }

                });
            });
        })
    /**
     * @api {post} /users/id/upgrade Upgrade to client
     * @apiName UpgradeUser
     * @apiVersion 0.0.1
     * @apiGroup Users
     *
     * @apiParam {Number} id id of the user
     * @apiParam {Object[]} contracts contracts accepted of the user.
     * @apiParam {String} cardId identity card for the user
     * @apiParam {Object} [creditCard] credit card of the user
     * @apiParam {String} creditCard.exp_month month of the card
     * @apiParam {String} creditCard.exp_year year of the card
     * @apiParam {String} creditCard.number credit card number
     * @apiParam {String} creditCard.cvc cvc of the card
     * @apiParam {String} creditCard.name Name of the customer at the credit card
     * @apiParam {String} royalCaninPassword password for the Royal Canin API
     *
     * @apiUse ClientParameters
     *
     * @apiSuccess {String} _id id of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postUpgradeValidator,
        function (request, response, next) {
            let PotentialClientUser = response.object;
            let newObject = request.body;
            let newUser = new ClientUser();
            let userPets = [];
            async.series([
                    // 1.- check permissions.
                    function (done) {
                        // If not admin, or not vetCenter related to user, or user, not authorized
                        if (!request.user.hasRoles([constants.roleNames.admin]) &&
                            !(request.user.hasRoles([constants.roleNames.vetcenter]) && PotentialClientUser.origin.user && request.user._id === PotentialClientUser.origin.user.toString()) &&
                            !(request.user.hasRoles([constants.roleNames.telemarketing]) && PotentialClientUser.origin.user && request.user._id === PotentialClientUser.origin.user.toString()) &&
                            !(request.user._id.toString() === PotentialClientUser._id.toString())) {
                            let err = {
                                localizedError: 'You are not authorized upgrades this user',
                                rawError: 'user ' + request.user._id + ' is not admin'
                            };
                            response.status(403).json(err);
                            done(err)
                        }
                        else {
                            done();
                        }
                    },
                    // 2.- check if user is potentialClient.
                    function (done) {
                        if (!PotentialClientUser.hasRoles([constants.roleNames.potentialClient])) {
                            let err = {
                                localizedError: 'Could not upgrade user',
                                rawError: 'user ' + request.user._id + ' is not a potential client'
                            };
                            response.status(400).json(err);
                            done(err);
                        }
                        else {
                            done();
                        }
                    },
                    // 3.- Add new data and map old
                    function (done) {
                        newUser = ClientUser.mapObject(newUser, PotentialClientUser);
                        newUser.userType = "ClientUser";
                        newUser.isNew = true;
                        newUser.cardId = newObject.cardId;
                        newUser.contracts = newObject.contracts;
                        newUser.royalCaninPassword = newObject.royalCaninPassword;
                        newUser.roles = [constants.roleNames.client];
                        done();
                    },
                    // 4.- add pets
                    function (done) {
                        Pet.find({owner: newUser._id}, function (err, pets) {
                            if (err) {
                                response.status(500).json(err);
                                done(err);
                            }
                            else if (!pets || pets.length === 0) {
                                let newErr = {
                                    localizedError: 'Could not upgrade user. No pets found',
                                    rawError: 'user ' + request.user._id + ' has no pets'
                                };
                                response.status(400).json(newErr);
                                done(newErr)
                            }
                            else {
                                userPets = pets
                                done();
                            }

                        });
                    },
                    // 5.- Add status to preactive.
                    function (done) {
                        let newStatus = {status: constants.statusNames.preactive};
                        if (!newUser.statuses) {
                            newUser.statuses = [];
                        }
                        newUser.statuses.push(newStatus);
                        done();
                    },
                    // 6.- Add royal canin user
                    function (done) {
                        let royalCaninUser = newUser.mapToRoyalCanin();
                        royalCaninUser.pets = userPets.map(function (aPet) {
                            return aPet.mapToRoyalCanin();
                        });
                        royalCanin.register(royalCaninUser, function (err, royalResponse) {
                            if (err) {
                                // User exists! Try login
                                let aResponse = err;
                                if (aResponse && aResponse.errorCode === -1) {
                                    let loginUser = {
                                        email: newUser.email,
                                        userPassword: newUser.royalCaninPassword,
                                        appid: royalCaninUser.appId,
                                        clientid: royalCaninUser.clientId,
                                        unixtime: Math.floor(moment().utc() / 1000),
                                    };
                                    royalCanin.login(loginUser, function (err, data) {
                                        if (err || !data) {
                                            let newErr = {
                                                localizedError: 'Could not upgrade user. User exists and password is not valid',
                                                rawError: 'Royal Canin answered ' + err
                                            };
                                            response.status(403).json(newErr);
                                            done(err);
                                        }
                                        else {
                                            newUser.royalCaninIdentifier = data.body.userId;
                                            newUser.royalCaninToken = data.body.accessToken;
                                            done();
                                        }
                                    })
                                }
                                else {
                                    let newErr = {
                                        localizedError: 'Could not upgrade user. Could not register to royal canin',
                                        rawError: 'Royal Canin answered ' + err
                                    };
                                    response.status(500).json(newErr);
                                    done(err);
                                }

                            }
                            else {
                                newUser.royalCaninIdentifier = royalResponse.body.userId;
                                done();
                            }
                        });
                    },
                    // 7.- Add stripe credit card
                    function (done) {
                        if (!newObject.creditCard) { // CreditCard is optional
                            return done();
                        }
                        let stripeUser = {
                            email: newUser.email,
                            description: 'Customer for ' + newUser.email
                        };
                        stripeUser["source"] = newObject.creditCard;
                        stripeUser.source["object"] = "card";
                        stripeUser["metadata"] = {
                            id: newUser._id.toString()
                        };
                        stripe.customers.createCustomer(stripeUser, function (err, user) {
                            if (err) {
                                let newErr = {
                                    localizedError: 'Could not create stripe user.',
                                    rawError: 'error returned: ' + err
                                };
                                done(newErr);
                            }
                            else if (!user || !user.id || !user.sources || !user.sources.data || user.sources.data.length === 0) {
                                let newErr = {
                                    localizedError: 'Could not create stripe user.',
                                    rawError: 'user returned: ' + user !== undefined ? user : "no user"
                                };
                                done(newErr);
                            }
                            else {
                                newUser.stripeId = user.id;
                                newUser.stripeCardToken = user.sources.data[0].id;
                                done();
                            }
                        });

                    },

                    // 8.- Clear cache
                    function (done) {
                        redis.deleteCachedResult({$and: [{_id: newUser._id}, {}]}, "PotentialClientUser", function (err) {
                            done(err);
                        })
                    },
                    // 9.- Delete potential client and add new client
                    function (done) {
                        User.deleteByIds([newUser._id], function (err, user) {
                            if (err) {
                                dbError(err, request, response, next);
                                done(err);
                            }
                            else {
                                route_utils.post(ClientUser, newUser, request, response, next, function (err, res) {
                                    done(err);
                                });
                            }
                        });
                    },
                ],
                function (err) {
                    if (err) {
                        winston.error("USERS: Upgrade failed: " + err);
                    }
                }
            );
        });

router.route('/:id/creditcard')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            route_utils.getOne(User, request, response, next)
        })

    /**
     * @api {post} /users/id/creditcard Change or create credit card for user.
     * @apiName UpdateCreditCard
     * @apiVersion 0.5.0
     * @apiGroup Users
     *
     * @apiParam {Number} id id of the user
     * @apiParam {Object} creditCard credit card of the user
     * @apiParam {String} creditCard.exp_month month of the card
     * @apiParam {String} creditCard.exp_year year of the card
     * @apiParam {String} creditCard.number credit card number
     * @apiParam {String} creditCard.cvc cvc of the card
     * @apiParam {String} creditCard.name Name of the customer at the credit card
     *
     * @apiUse ClientParameters
     *
     * @apiSuccess {String} _id id of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postUpdateCreditCard,
        function (request, response, next) {
            let ClientUser = response.object;
            let newObject = request.body;
            async.series([
                    // 1.- check permissions.
                    function (done) {
                        // If not admin, or not vetCenter related to user, or user, not authorized
                        if (!request.user.hasRoles([constants.roleNames.admin]) &&
                            !(request.user.hasRoles([constants.roleNames.vetcenter]) && ClientUser.origin.user && request.user._id === ClientUser.origin.user.toString()) &&
                            !(request.user.hasRoles([constants.roleNames.telemarketing]) && ClientUser.origin.user && request.user._id === ClientUser.origin.user.toString()) &&
                            !(request.user._id.toString() === ClientUser._id.toString())) {
                            let err = {
                                localizedError: 'You are not authorized to update credit card on this user',
                                rawError: 'user ' + request.user._id + ' is not admin'
                            };
                            response.status(403).json(err);
                            done(err)
                        }
                        else {
                            done();
                        }
                    },
                    // 2.- check if user is Client.
                    function (done) {
                        if (ClientUser.roles.indexOf(constants.roleNames.client) === -1) {
                            let err = {
                                localizedError: 'Could not update credit card for not a final client',
                                rawError: 'user ' + request.user._id + ' is not a client'
                            };
                            response.status(400).json(err);
                            done(err);
                        }
                        else {
                            done();
                        }
                    },
                    // 3.- Add stripe user if needed
                    function (done) {
                        if (ClientUser.stripeId) {
                            return done();
                        } // No need to go on
                        let stripeUser = {
                            email: ClientUser.email,
                            description: 'Customer for ' + ClientUser.email
                        };
                        stripeUser["metadata"] = {
                            id: ClientUser._id.toString()
                        };
                        stripe.customers.createCustomer(stripeUser, function (err, user) {
                            if (err) {
                                let newErr = {
                                    localizedError: 'Could not create stripe user.',
                                    rawError: 'error returned: ' + err
                                };
                                done(newErr);
                            }
                            else if (!user || !user.id) {
                                let newErr = {
                                    localizedError: 'Could not create stripe user.',
                                    rawError: 'user returned: ' + user !== undefined ? user : "no user"
                                };
                                done(newErr);
                            }
                            else {
                                ClientUser.stripeId = user.id;
                                done();
                            }
                        });
                    },
                    // 4.- Add stripe credit card
                    function (done) {
                        let source = newObject.creditCard;
                        source["object"] = "card";
                        source["metadata"] = {
                            date: Date()
                        };
                        stripe.sources.createPaymentMethod(ClientUser.stripeId, source, function (err, source) {
                            if (err) {
                                let newErr = {
                                    localizedError: 'Could not create stripe source.',
                                    rawError: 'error returned: ' + err
                                };
                                done(newErr);
                            }
                            else if (!source || !source.id) {
                                let newErr = {
                                    localizedError: 'Could not create stripe source.',
                                    rawError: 'source returned: ' + source !== undefined ? JSON.stringify(source) : "no source"
                                };
                                done(newErr);
                            }
                            else {
                                ClientUser.stripeCardToken = source.id;
                                done();
                            }
                        });

                    },

                    // 5.- Clear cache
                    function (done) {
                        redis.deleteCachedResult({$and: [{_id: ClientUser._id}, {}]}, "ClientUser", function (err) {
                            done(err);
                        })
                    },
                    // 6.- Save client card data
                    function (done) {
                        let cardValues = {
                            stripeId: ClientUser.stripeId,
                            stripeCardToken: ClientUser.stripeCardToken,
                        };
                        route_utils.postUpdate(User, {'_id': request.params.id}, cardValues, request, response, next, function (err, res) {
                            done(err);
                        });
                    },
                ],
                function (err) {
                    if (err) {
                        winston.error("USERS: Update credit card failed: " + err);
                    }
                }
            );
        });

router.route('/:id/deactivate')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            route_utils.getOne(User, request, response, next)
        })

    /**
     * @api {post} /users/id/deactivate Change or create credit card for user.
     * @apiName DeactivateUser
     * @apiVersion 0.7.0
     * @apiGroup Users
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This endpoint can be called by the user or the admin. The user will trigger a mail notification
     * to the admin. The admin will effectivelly deactivate the user if it has no active plans and pets, and will check
     * user is not already inactive.
     *
     * @apiSuccess {String} _id id of the user
     * @apiUse ErrorGroup
     * @apiError (Any Error) errorCode.-2001 Pet already active.
     * @apiError (Any Error) errorCode.-2002 Plan already activate.
     * @apiError (Any Error) errorCode.-2003 User already inactive.
     */
    .post(function (request, response, next) {
        let ClientUser = response.object;
        async.series([
                // 1.- check permissions.
                function (done) {
                    // If not admin, or not user, not authorized
                    if (!request.user.hasRoles([constants.roleNames.admin]) &&
                        !(request.user._id.toString() === ClientUser._id.toString())) {
                        let err = {
                            localizedError: 'You are not authorized to deactivate this user',
                            rawError: 'user ' + request.user._id + ' is not admin'
                        };
                        response.status(403).json(err);
                        done(err)
                    }
                    else {
                        done();
                    }
                },
                // 2.- check if user is Client.
                function (done) {
                    if (ClientUser.roles.indexOf(constants.roleNames.client) === -1) {
                        let err = {
                            localizedError: 'Could not deactivate a non final client',
                            rawError: 'user ' + request.user._id + ' is not a client'
                        };
                        response.status(400).json(err);
                        done(err);
                    }
                    else {
                        done();
                    }
                },
                // 3.- Check if admin or not
                function (done) {
                    if (request.user.hasRoles([constants.roleNames.admin])) { // This is and admin, check prerrequirements
                        async.series([
                            function (isDone) { // Plan should be inactive
                                let error;
                                Plan.find({
                                    $and: [
                                        {"statuses.status": {$ne: constants.planStatusNames.cancelled}},
                                        {"statuses.status": constants.planStatusNames.suscribed},
                                        {owner: ClientUser._id},
                                        {active: true}
                                    ]
                                }, function (err, plans) {
                                    if (err) {
                                        error = errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError)
                                        response.status(500).json(error);
                                    }
                                    else if (plans && plans.length > 0) {
                                        error = errorConstants.responseWithError(plans, errorConstants.errorNames.users_activePlan);
                                        response.status(400).json(error);

                                    }
                                    isDone(error);
                                });

                            },
                            function (isDone) { // Pet should be inactive
                                let error;
                                Pet.find({owner: ClientUser._id, active: true}, function (err, pets) {
                                    if (err) {
                                        error = errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError)
                                        response.status(500).json(error);
                                    }
                                    else if (pets && pets.length > 0) {
                                        error = errorConstants.responseWithError(pets, errorConstants.errorNames.users_activePet);
                                        response.status(400).json(error);

                                    }
                                    isDone(error);
                                });

                            },
                            function (isDone) { // User should be active
                                let error;
                                if (!ClientUser.active) {
                                    error = errorConstants.responseWithError(ClientUser, errorConstants.errorNames.users_inactiveUser);
                                    response.status(400).json(error);
                                }
                                isDone(error);
                            },

                        ], function (err) { // Save user
                            if (err) {
                                return done(err);
                            }
                            ClientUser.statuses.push({
                                status: constants.statusNames.inactive
                            });
                            ClientUser.active = false;
                            route_utils.postUpdate(User, {'_id': ClientUser._id}, ClientUser, request, response,
                                function (err, request, response, next) {
                                response.status(200).json(response.object);
                                done(err);
                            });
                        });

                    }
                    else {
                        mailUtils.sendCancellationRequest();
                        response.status(200).json({});
                        done();
                    }
                },
            ],
            function (err) {
                if (err) {
                    winston.error("USERS: Deactivation of " + ClientUser._id + " failed: " + JSON.stringify(err));
                }
            }
        );
    });

module.exports = router;
