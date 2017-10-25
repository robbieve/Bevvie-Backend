// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');
const configAuth = require("config").auth;

// DB

let dbError = require('lib/loggers/db_error');
let redis = require('lib/redis/redis');
let winston = require('lib/loggers/logger').winston;
let royalCanin = require('api/controllers/common/royalcaninProvider');
let async = require('async');
let moment = require("moment");

// Validator
let expressValidator = require('lib/validation/validator');
let userValidator = require('api/validators/userValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Default route
router.route('/')
    .all(function (request, response, next) {
        let baseToken = request.headers['register-token'];
        if (baseToken !== configAuth.baseToken) {
            response.status(401).json({'localizedError': 'Not Authorized', 'rawError': 'No authorization token'});
            return
        }
        else {
            next();
        }
    })
    /**
     * @api {get} /regions Get regions
     * @apiName GetRegions
     * @apiVersion 0.2.0
     * @apiGroup Regions
     *
     * @apiParam {String="ES","PT"} country="ES" country to match
     * @apiSuccess {Object[]} List of postalCodes.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        userValidator.regions,
        function (request, response) {
            if (request.query["country"]==="PT"){
                response.status(200).json(constants.portugalRegions);
            }
            else{
                response.status(200).json(constants.spainRegions);
            }
        });


module.exports = router;
