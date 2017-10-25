// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
let parseUrlencoded = require('lib/parsers/jsonBodyParser');
// Validator
let expressValidator = require('lib/validation/validator');
let userValidator = require('api/validators/userValidator');
let winston = require('lib/loggers/logger').winston;

// DB
let User = require('api/models/users/user');
let Pet = require('api/models/pets/pets');
let Plan = require('api/models/plans/plan');

let TemporaryToken = require("api/models/users/temporaryTokens");
let dbError = require('lib/loggers/db_error');

let royalCanin = require('api/controllers/common/royalcaninProvider');
let moment = require("moment");

// load the auth variables
let configAuth = require('config').auth;

let constants = require('api/common/constants');
let crypto = require("crypto");
let mailutils = require("api/controllers/common/mailUtils");
let planUtils = require("api/controllers/common/planUtils");
const errorConstants = require('api/common/errorConstants');

// =============
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
     * @api {post} /sendlink Send a link to verify an action
     * @apiName SendLink
     * @apiVersion 0.1.0
     * @apiGroup Users
     *
     * @apiHeader  {String} register-token Authorization token.
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiDescription this method will allow users to confirm their email to activate an account or to
     * reset a password, or start a simulation.
     *
     * @apiParam {String} email email to send the verification
     * @apiParam {String="activation","resetPassword","simulatePlan"} type type of verification mail
     * @apiParam {Object} [pet] pet for the simulation
     * @apiParam {String} [postalCode] postalCode for the simulation. Mandatory for simulation.
     * @apiParam {String} [region] region for the simulation.  Mandatory for simulation.
     * @apiParam {String="ES","PT"} [country] country for the simulation. Mandatory for simulation.
     *
     * @apiSuccess {String} user Will return the created user
     * @apiUse ErrorGroup
     * @apiError (Any Error) errorCode.-1000 Not suitable clinic found for simulation.
     */
    .post(parseUrlencoded,
        expressValidator,
        userValidator.activationValidator,
        function (request, response, next) {
            let body = request.body;
            User.findOne({email: body.email}, function (err, userFound) {
                if (!userFound) {
                    response.status(404).json({
                        'localizedError': 'user not found',
                        'rawError': 'user not found',
                    });
                    return
                }
                let newActivationToken = new TemporaryToken();
                newActivationToken.expiration = moment().add(1, 'day');
                newActivationToken.code = crypto.randomBytes(20).toString('hex');
                newActivationToken.status = [{
                    status: constants.temporaryTokenStatusNames.pending,
                    description: "pending mail to user",
                }];
                newActivationToken.tokenType = body.type;
                newActivationToken.preferedLanguage = request.headers["Accept-Language"] ? request.headers["Accept-Language"] : "es";
                newActivationToken.user = userFound._id;

                let tokenSave = function () {
                    newActivationToken.save(function (err) {
                        if (err) {
                            return dbError(err, request, response, next)
                        }
                        else {
                            mailutils.sendMailToken(newActivationToken, function (err) {
                                if (err) {
                                    winston.err("QUEUE: There was an error creating the mail for " + JSON.stringify(newActivationToken));
                                    return response.status(500).json({
                                        'localizedError': 'could not create link',
                                        'rawError': 'could not create link ' + JSON.stringify(err),
                                    });
                                }
                                response.status(201).json(newActivationToken);
                            });
                        }
                    });
                }

                switch (newActivationToken.tokenType) {
                    case constants.verificationTypeNames.activation:
                        if (userFound.active) {
                            response.status(409).json({
                                'localizedError': 'user ' + userFound.email + ' already exists and is activated',
                                'rawError': 'user ' + userFound.email + ' exists',
                            });
                            return;
                        }
                        tokenSave();
                        break;
                    case constants.verificationTypeNames.resetPassword:
                        if (userFound.hasRoles([constants.roleNames.client])) { // If final user, call royalCanin
                            /*
                            *
                            * email	string	User's email
                            * */
                            let mapped = userFound.mapToRoyalCanin();
                            royalCanin.resetPassword(mapped, function (err, res) {
                                if (err) {
                                    return response.status(500).json({
                                        'localizedError': 'Royal Canin returned an error',
                                        'rawError': 'Royal Canin answered an error ' + err,
                                    });
                                }
                                newActivationToken.expiration = Date(); // Will not be saved.
                                return response.status(201).json(newActivationToken);
                            });
                        }
                        else {
                            tokenSave();
                        }
                        break;
                    case constants.verificationTypeNames.simulatePlan:
                        let postalCode = body.postalCode;
                        let country = body.country;
                        let region = body.region;
                        if (!postalCode || !country|| !region) {
                            return response.status(400).json({
                                'localizedError': 'Bad postal code / region / country for simulation',
                                'rawError': 'Bad postal code / region / country for simulation ' + JSON.stringify(body),
                            });
                        }
                        else {
                            User.find(
                                {roles: constants.roleNames.vetcenter, "address.region": region, active: true},
                                function (err, res) {
                                    if (err) {
                                        return response.status(500).json({
                                            localizedError: 'There was an error communicating with RoyalCanin',
                                            rawError: 'RoyalCanin answered an error ' + err,
                                        });
                                    }
                                    let clinics = res;
                                    if (!clinics || clinics.length === 0) {
                                        return response.status(404).json(errorConstants.responseWithError(res,errorConstants.errorNames.plans_noClinicFound));
                                    }
                                    else { // there are clinics
                                        let pet = new Pet(body.pet);
                                        pet.active = false;
                                        pet.owner = userFound._id;
                                        pet.save(function (err) {
                                            if (err) {
                                                return response.status(400).json({
                                                    localizedError: 'Could not save pet',
                                                    rawError: 'Could not save pet ' + JSON.stringify(pet) + "err :" + JSON.stringify(err),
                                                });
                                            }
                                            Plan.generateNewSimulation(pet,userFound,country,region,postalCode,function (err,plan) {
                                                if (err) {
                                                    return response.status(500).json({
                                                        localizedError: 'Could not generate plan',
                                                        rawError: 'Could not generate plan err :' + JSON.stringify(err)
                                                    });
                                                }
                                                else{
                                                    // Plan is saved with all the information of treatments
                                                    plan.save(function (err) {
                                                        Plan.findOne({_id: plan._id}, function (err, aPlan) {
                                                            newActivationToken.plan = plan;
                                                            tokenSave();
                                                        });
                                                    });

                                                }
                                            })
                                        });
                                    }
                                });

                        }
                        break;
                    default:
                        return response.status(400).json({
                            'localizedError': 'Error in type of sendlink',
                            'rawError': 'Unrecognized sendlink type ' + body.tokenType,
                        });
                        break;
                }
            });
        });
module.exports = router;
