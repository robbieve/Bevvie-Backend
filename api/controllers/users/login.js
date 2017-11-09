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
let errorConstants = require("api/common/errorConstants");
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
     * @apiUse RegisterTokenHeader
     * @apiDescription This method can login a user provided an accessKey is provided.
     *
     * @apiParam {String} [id] id of the user
     * @apiParam {String} accessKey accessToken of the service
     * @apiParam {String="facebook","firebase","password"} accessType type of auth
     *
     * @apiSuccess {String} token access token.
     * @apiUse ErrorGroup
     * @apiUse ErrorFacebookLogin
     * @apiUse ErrorFirebaseLogin
     */
    .post(parseJSONencoded,
        expressValidator,
        function (request, response, next) {
            let baseToken = request.headers['register-token'];
            if (baseToken !== configAuth.baseToken) {
                response.status(401).json({'localizedError': 'Not Authorized', 'rawError': 'No authorization token'});
                return
            }
            request.checkBody('id', 'No valid id provided').optional().isObjectId();
            request.checkBody('accessType', 'No valid accessType provided').notEmpty().isIn(constants.users.accessTypes);
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
        function (request, response, next) { // User authentication
            let responseCallback = function (err, user, userError) {
                if (err && err["name"] === "InternalOAuthError") // Check facebook errors
                {
                    userError = errorConstants.responseWithError(err,errorConstants.errorNames.user_facebookLoginAuthFailure);
                }
                if (userError) {
                    return response.status(403).json(userError);
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
            };
            switch (request.body.accessType) {
                case constants.users.accessTypeNames.facebook:
                    request.body.access_token = request.body.accessKey;
                    passport.authenticate('facebook-token', {session: false}, responseCallback)(request, response);
                    break;
                case constants.users.accessTypeNames.firebase:
                    request.body.access_token = request.body.accessKey;
                    passport.authenticate('firebase-token', {session: false}, responseCallback)(request, response);
                    break;
                case constants.users.accessTypeNames.password:
                    passport.authenticate('local-login', {session: false}, responseCallback)(request, response);
                    break;
                default:
                    return response.status(400).json({
                        localizedError: 'No access type sent',
                        rawError: 'error: ' + JSON.stringify(request.body),
                    });
            }

        },
        function (request, response) {
            let newUser = request.user;
            let token = newUser.generateHash(newUser.name + Date.now() + newUser._id);
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
