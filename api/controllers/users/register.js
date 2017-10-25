// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
let parseUrlencoded = require('lib/parsers/jsonBodyParser');
// Validator
let expressValidator = require('lib/validation/validator');
// DB
let User = require('api/models/users/user');

let Token = require('api/models/users/token');
let dbError = require('lib/loggers/db_error');

// load the auth variables
let configAuth = require('config').auth;

let constants = require('api/common/constants');

// =============
// Default route


router.route('/')
    .all(function (request, response, next) {
        next();
    })
    /**
     * @api {post} /register Registers a user
     * @apiName Register New User
     * @apiVersion 0.0.1
     * @apiGroup Users
     *
     * @apiHeader  {String} register-token Authorization token for registering.
     *
     * @apiDescription this method will need different parameters depending on the type of user being registered. The
     * parameters suitable for a concrete type are detailed as part of that type.
     *
     * The method will look at "roles" object to find if it finds a suitable user role. Therefore depending on that
     * it will register an admin, potentialClient, telemarketing or vetcenter.
     *
     * This method will *not* register final client user. To register a final client
     * create a potential client user and transform it using the suitable endpoint
     *
     * @apiUse UserParameters
     * @apiUse VetCenterParameters
     * @apiUse PotentialClientParameters
     *
     * @apiSuccess {String} token access token.
     * @apiUse ErrorGroup
     */
    .post(parseUrlencoded, expressValidator, function (request, response, next) {
        let baseToken = request.headers['register-token'];
        if (baseToken !== configAuth.baseToken) {
            response.status(401).json({'localizedError': 'Not Authorized', 'rawError': 'No authorization token'});
            return
        }
        request.checkBody('email', 'No valid email provided').notEmpty().isEmail();
        request.checkBody('name', 'No valid name provided').notEmpty();
        request.checkBody('password', 'No valid password provided').notEmpty();
        request.checkBody('preferedLanguage', 'No valid preferedLanguage provided').optional().isIn(constants.allLanguages);
        request.checkBody('roles', 'No valid roles provided').notEmpty().isPrototypeOf(Array);
        request.checkBody('image', 'No valid image provided').optional().isObjectId();
        request.checkBody('origin.user', 'No valid related user provided').optional().isObjectId();
        request.getValidationResult().then(function (result) {
            if (!result.isEmpty()) {
                response.status(400).json(result.array()[0]);
                return;
            }

            let newUser = request.body;
            newUser.email = newUser.email.toLowerCase();

            User.findOne({email: newUser.email}, function (err, userFound) {
                let user = User.mapObject(null, newUser);
                if (userFound) {
                    response.status(409).json({
                        'localizedError': 'user ' + newUser.email + ' already exists',
                        'rawError': 'user ' + newUser.email + ' exists',
                    });
                    return;
                }

                let random = Math.random().toString(36);
                let token = user.generateHash(newUser.email + Date.now() + random + newUser.password);
                let newToken = new Token({
                    'token': token,
                });
                user.tokens = [newToken];
                newToken.user = user;

                let saveUser = function () {
                    user.save(function (err) {
                        if (err) {
                            return dbError(err, request, response, next)
                        }
                        else {
                            newToken.save(
                                function (err) {
                                    if (err) {
                                        return dbError(err, request, response, next)
                                    }
                                    else {
                                        response.status(201).json({'token': token, 'user': user});
                                    }
                                }
                            )

                        }
                    });
                };

                let saveOrCreateUser = function () {
                    if (user._id
                    ) { // If not new, save user
                        User.deleteByIds([user._id], function (err, user) {
                            if (err) {
                                dbError(err, request, response, next);
                            }
                            else {
                                saveUser();
                            }
                        });
                    }
                    else {
                        saveUser();
                    }
                };
                if (newUser["origin"] && newUser["origin"]["user"]) {
                    User.findOne({_id: newUser["origin"]["user"]},function (err, related) {
                        if (err){
                            return dbError(err, request, response, next)
                        }
                        else if (related === undefined || related === null){
                            response.status(404).json({
                                'localizedError': 'Origin user '+newUser["origin"]["user"] + ' not found',
                                'rawError': 'No origin for '+JSON.stringify(newUser)
                            });
                            return
                        }
                        if (!user["sort"]) { user["sort"]={} }
                        user.sort.name = related.name;
                        saveOrCreateUser()
                    })
                }
                else{
                    saveOrCreateUser();
                }
            });
        }).catch(function (err) {
            return response.status(500).json({
                localizedError: 'There was an error at the validation system',
                rawError: 'error: ' + err
            });
        });
    })
;
module.exports = router;
