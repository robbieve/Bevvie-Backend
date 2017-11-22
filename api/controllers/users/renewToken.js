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
let config = require("config");
let mailUtils = require("api/controllers/common/mailUtils");
let pushUtils = require("api/controllers/common/pushUtils");
let token = require("api/models/users/token");
let device = require("api/models/push/device");
let checkin = require("api/models/checkins/checkin");
let moment = require("moment");

const errorConstants = require('api/common/errorConstants');


// Validator
let expressValidator = require('lib/validation/validator');
let userValidator = require('api/validators/userValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

router.route('/')
/**
 * @api {post} /renewToken Tries to renew a token
 * @apiName Renew token
 * @apiVersion 0.17.0
 * @apiGroup Users
 * @apiUse AuthorizationTokenHeader
 * @apiParam {Number} expiration=8760 token expiration hours.
 * @apiSuccess {Object} the token
 * @apiUse ErrorGroup
 */
    .post(jsonParser,
        expressValidator,
        passport.authenticate('bearer', {session: false}),
        function (request, response, next) {
            let bearer = request.header("Authorization");
            let aToken = bearer.split(" ")[1];
            let expirationNumber = 8670;
            if (request.body && request.body.expiration && request.body.expiration < 8670){
                expirationNumber = request.body.expiration;
            }
            let newExpiration = moment().add(expirationNumber,"hours");
            token.findOneAndUpdate(
                {token: aToken},
                {$set: {expiration: newExpiration }},
                {new: true},
                function (err, newToken) {
                    if (err){
                        return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    }else{
                        response.status(200).json(newToken);
                    }
                });
        });
module.exports = router;
