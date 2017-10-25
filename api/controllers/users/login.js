// Globals
let express = require('express');
let router = express.Router();
// parser
let parseJSONencoded = require('lib/parsers/jsonBodyParser');
// Validator
let expressValidator = require('lib/validation/validator.js');
// authentication
let passport = require('passport');
// load the auth variables
let configAuth = require('config').auth;
// Require token
let Token = require('api/models/users/token');
let dbError = require('lib/loggers/db_error');
let winston = require("lib/loggers/logger").winston;
let constants = require("api/common/constants");
let config = require("config");
let moment = require("moment");

// =============
// Default route
router.route('/')
    .all(function (request, response, next) {
        next();
    })
    /**
     * @api {post} /login Logs a user
     * @apiName Logs in a User
     * @apiVersion 0.0.1
     * @apiGroup Users
     * @apiParam {String} email
     * @apiParam {String} password
     *
     * @apiSuccess {String} token access token.
     * @apiUse ErrorGroup
     */
    .post(parseJSONencoded ,
        expressValidator,
        function (request, response, next) {
            request.checkBody('email', 'No valid email provided').notEmpty().isEmail();
            request.checkBody('password', 'No valid password provided').notEmpty();
            request.getValidationResult().then(function (result) {
                if (!result.isEmpty()) {
                    response.status(400).json(result.array()[0]);

                }
                else {
                    next();
                }
            }).catch(function (err) {
                return response.status(500).json({
                    localizedError: 'There was an error at the validation system',
                    rawError: 'error: ' + err
                });
            });
        },
        function (request, response, next) {
            passport.authenticate('local-login', {session: false}, function (err, user, userError) {
                if (user && user.hasRoles([constants.roleNames.client])) {
                    winston.info("ROYAL: Calling Royal Canin Login...");
                    let unixtime = "" + Math.floor(moment().utc() / 1000);
                    let userLogin = {
                        email: user.email,
                        userPassword: request.body.password,
                        appid: config.royalCanin.app_id,
                        clientid: config.royalCanin.client_id,
                        unixtime: unixtime,
                    };
                    royal.login(userLogin, function (err, res) {
                        /*
                        {
                            "sessionId": 97,
                            "accessToken": "NzYwRkRDOUUtRkYxQS00QTE1LUI4RUUtM0IxMEFDMjJBRTM1Ljk3",
                            "expires": 1505825572,
                            "userId": "NkM3Mzc2NUE2NDA0NDU0.29"
                        }
                        */
                        if (err) {
                            if (err["errorCode"] === -1) { // User not found or bad password
                                return response.status(404).json({
                                        'localizedError': 'Invalid Royal Canin User or password.',
                                        'rawError': 'no Royal Canin user found or invalid password'
                                    });
                            }
                            else {
                                winston.error("ROYAL: Royal Canin Error login: " + JSON.stringify(err));
                                return response.status(500).json({
                                    'localizedError': 'there was an error at the Royal Canin auth system',
                                    'rawError': 'there was an error at the Royal Canin auth system ' + JSON.stringify(err)
                                });
                            }
                        }


                        user.royalCaninIdentifier = res.body.userId;
                        user.royalCaninToken = res.body.accessToken;
                        user.royalCaninPassword = request.body.password;
                        request.user = user;
                        next();
                    });
                }
                else if (userError) {
                    return response.status(404).json(userError);
                }
                else if (err) {
                    winston.error("LOGIN: Error at the login system: ", JSON.stringify(err));
                    return response.status(500).json({
                        'localizedError': 'there was an error at the auth system',
                        'rawError': 'there was an error at the auth system'
                    });
                }
                else {
                    request.user = user;
                    next();
                }
            })(request, response);
        },
        function (request, response) {
            let newUser = request.user;
            let token = newUser.generateHash(newUser.username + Date.now() + newUser.password);
            let newToken = new Token({
                'token': token,
            });
            newToken.user = newUser;
            newToken.save(
                function (err) {
                    if (err) {
                        return dbError(err, request, response, next)
                    }
                    else {
                        response.status(201).json({'token': token, 'user': newUser});
                    }
                }
            )
        });

module.exports = router;
