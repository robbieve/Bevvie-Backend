// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let User = require('api/models/users/user');
let VetCenter = require('api/models/users/vetcenterUser');

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
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {get} /rcVetCenters Get vetcenters
     * @apiName GetRoyalCaninVetCenters
     * @apiVersion 0.0.4
     * @apiGroup Users
     *
     * @apiParam {String} postalCode postal code to match
     * @apiSuccess {Object} prescriber List of royal canin vet centers.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        userValidator.rcVetCentersValidator,
        function (request, response) {
            royalCanin.clinicsData(request.query.postalCode, function (err, res) {
                if (err) {
                    return response.status(500).json({
                        localizedError: 'There was an error communicating with RoyalCanin',
                        rawError: 'RoyalCanin answered an error '+err,
                    });
                }
                response.status(200).json(res.body.prescribers);

            });
        });


module.exports = router;
