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
     * @apiDescription This endpoint allows manual user registration.
     *
     * @apiUse UserParameters
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
        request.checkBody('name', 'No valid name provided').notEmpty();
        request.checkBody('banned', 'No valid banned provided').optional().isBoolean();
        request.checkBody('admin', 'No valid admin provided').optional().isBoolean();

        request.getValidationResult().then(function (result) {
            if (!result.isEmpty()) {
                response.status(400).json(result.array()[0]);
                return;
            }

            let newUser = request.body;
            let user = User.mapObject(null, newUser);
            let random = Math.random().toString(36);
            let token = user.generateHash(newUser.name + Date.now() + random + newUser.accessKey);
            let newToken = new Token({
                'token': token,
            });
            user.tokens = [newToken];
            newToken.user = user;

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
        }).catch(function (err) {
            return response.status(500).json({
                localizedError: 'There was an error at the validation system',
                rawError: 'error: ' + err
            });
        });
    });
module.exports = router;
