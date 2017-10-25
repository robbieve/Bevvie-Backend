// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');
let ObjectId = require('mongoose').Types.ObjectId;
let async = require("async");
// DB
let Plan = require('api/models/plans/plan');
let Pet = require('api/models/pets/pets');
let Treatment = require('api/models/plans/treatment');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let planValidator = require('api/validators/planValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const winston = require('lib/loggers/logger').winston;
const mailUtils = require('api/controllers/common/mailUtils');

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.hasRoles([constants.roleNames.admin])) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a plan',
            rawError: 'user ' + request.user._id + ' is not admin'
        });
        return;
    }
    callback(newObject)
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /plans Post new plan
     * @apiName PostNewPlan
     * @apiVersion 0.0.5
     * @apiGroup Plans
     * @apiUse PlanParameters
     * @apiSuccess (201) {String} _id the plan's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        planValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                newObject["statuses"] = newObject["statuses"] ? newObject["statuses"] : {status: constants.planStatusNames.presubscription};

                let owner = newObject.owner;
                async.series([
                    function (isDone) {
                        if (ObjectId.isValid(owner)) {
                            User.findOne({_id: owner}, function (err, aUser) {
                                owner = aUser;
                                isDone();
                            })
                        }
                        else {
                            isDone();
                        }
                    },
                    function (isDone) {
                        let err;
                        if (!owner
                            || !owner["address"]
                            || !owner.address["region"]
                            || !owner.address["postalCode"]
                            || !owner.address["country"]) {
                            err = {
                                localizedError: 'Address not valid for owner. Please set an address to the owner',
                                rawError: 'Address not valid for owner: ' + owner,
                            };
                        }
                        isDone(err);
                    }
                ], function (err) {
                    if (err) {
                        return response.status(400).json(err);
                    }
                    if (!newObject.treatments) {
                        Plan.addTreatments(newObject, owner.address.country, owner.address.region, owner.address.postalCode, function (err, thePlan) {
                            route_utils.post(Plan, newObject, request, response, next);
                        });
                    }
                    else {
                        route_utils.post(Plan, newObject, request, response, next);
                    }

                });
            });
        })

    /**
     * @api {get} /plans Get plans
     * @apiName GetPlans
     * @apiVersion 0.0.5
     * @apiGroup Plans
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [text] text to match on plan name or any other text field
     * @apiParam {String} [pet] pet to match
     * @apiParam {Boolean} [isSimulation=false] match simulation only plans
     * @apiParam {String} [vetCenter] vetCenter to match
     * @apiParam {String} [originUser] originUser to match
     * @apiParam {String} [owner] owner to match
     * @apiParam {Object[String]} [statuses] statuses to match. Finds any of them
     * @apiParam {String="true","false","all"} active=true match active plans or not
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt","updatedAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiSuccess {Object[]} docs       List of plans.
     * @apiSuccess {String}   docs._id   Id of the plan.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the plan.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        planValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "isSimulation": "isSimulation",
                    "pet": "pet",
                    "vetCenter": "vetCenter",
                    "owner": "owner",
                    "originUser": "origin.user",
                    "statuses": "statuses.status",
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
            let query = {
                active: true,
                isSimulation: false
            };
            query = route_utils.filterQuery(request.query, transform);

            // SORT
            let sortTransform = {
                _default: [["createdAt", 1]],
                createdAt: "createdAt",
                updatedAt: "updatedAt",
            };

            let options = {};
            options["sort"] = route_utils.sortQuery(request.query.sort, sortTransform);

            route_utils.getAll(Plan,
                query,
                options,
                request, response, next)
        });

router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        planValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Plan, request, response, next)
        })

    /**
     * @api {get} /plan/id Get plan by id
     * @apiName GetPlan
     * @apiVersion 0.0.5
     * @apiGroup Plans
     *
     * @apiParam {Number} id id of the plan
     *
     * @apiSuccess {String}   _id   Id of the plan.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /plans/id Update plan
     * @apiName UpdatePlan
     * @apiVersion 0.0.5
     * @apiGroup Plans
     * @apiParam {String} id the plan's id
     * @apiUse PlanParameters
     *
     * @apiSuccess (201) {String} _id the plan's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        planValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Plan, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /plan/id Delete plan by id
     * @apiName DeletePlan
     * @apiVersion 0.0.5
     * @apiGroup Plans
     *
     * @apiParam {Number} id id of the plan
     *
     * @apiSuccess {String}   _id   Id of the plan.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.hasRoles([constants.roleNames.admin])) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a plan',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Plan.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });


router.route('/:id/simulate')
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
                // TODO: Add token for user.
                response.object = token.plan;
                next();
            })
        })

    /**
     * @api {get} /plans/id/simulate Get simulation information
     * @apiName GetPlanSimulation
     * @apiVersion 0.1.0
     * @apiGroup Plans
     *
     * @apiParam {Number} id simulation token
     *
     * @apiSuccess {Object} plan the user's plan
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    });


router.route('/:id/activate')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        planValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Plan, request, response, next)
        })
    /**
     * @api {post} /plans/id/activate Activate a plan
     * @apiName Activate Plan
     * @apiVersion 0.6.0
     * @apiGroup Plans
     * @apiParam {String} id the plan's id
     * @apiDescription This endpoint will fail if owner is not final client, the plan is already active,
     * the pet has an active plan or there are no payment methods for the owner.
     *
     * @apiSuccess (201) {String} _id the plan's id
     * @apiUse ErrorGroup
     * @apiError (Any Error) errorCode.-1001 Owner is not a final client.
     * @apiError (Any Error) errorCode.-1002 Plan already activated.
     * @apiError (Any Error) errorCode.-1003 No credit card associated with owner.
     * @apiError (Any Error) errorCode.-1004 There is an active plan for this pet.
     */
    .post(function (request, response, next) {
        let newObject = response.object;
        async.series([
            // 1.- Check permissions
            function (isDone) {
                let err;
                if (!request.user.hasRoles([constants.roleNames.admin]) &&
                    request.user._id.toString() !== newObject.owner._id.toString()) {
                    err = {
                        localizedError: 'You are not authorized to create or update a plan',
                        rawError: 'user ' + request.user._id + ' is not admin'
                    };
                    response.status(403).json(err);
                }
                isDone(err);
            },
            // 2.- Check plan prerrequirements
            function (isDone) {
                let err;
                if (newObject.isActive()) {
                    err = errorConstants.responseWithError(newObject, errorConstants.errorNames.plans_alreadyActivated);
                    response.status(400).json(err);
                }
                else if (!newObject.owner.hasRoles(constants.roleNames.client)) {
                    err = errorConstants.responseWithError(newObject.owner, errorConstants.errorNames.plans_ownerNotFinalClient);
                    response.status(400).json(err);
                }
                else if (!newObject.owner.stripeCardToken) {
                    err = errorConstants.responseWithError(newObject.owner, errorConstants.errorNames.plans_noCreditCard);
                    response.status(400).json(err);
                }
                isDone(err);
            },
            // 3.- Check no other plans for the pet are active
            function (isDone) {
                let error;
                Plan.findOne({
                    _id: newObject._id,
                    "statuses.status": constants.planStatusNames.suscribed
                }, function (err, plan) {
                    if (err) {
                        error = err;
                        response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    }
                    else if (plan) {
                        error = errorConstants.responseWithError(plan, errorConstants.errorNames.plans_alreadyActivePlan);
                        response.status(404).json(error);
                    }
                    isDone(error);
                });
            },
            // 4.- Change pet statuses
            function (isDone) {
                let pet = newObject.pet;
                pet.statuses.push({
                    status: constants.petStatusNames.suscribed
                });
                pet.save(function (err) {
                    if (err) {
                        response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    }
                    isDone(err);
                });
            },

            // 5.- Change plan statuses
            function (isDone) {
                newObject.statuses.push({
                    status: constants.planStatusNames.suscribed
                });
                if (newObject.isSimulation) { // If simulation, save a new object
                    newObject.isSimulation = false;
                    newObject.isNew = true;
                    delete newObject._id;
                    route_utils.post(Plan, newObject, request, response, next);
                }
                else {
                    route_utils.postUpdate(Plan, {'_id': request.params.id}, newObject, request, response, next);
                }
            },
        ], function (err) {
            if (err) {
                winston.error("PLANS: Error activating plan: " + JSON.stringify(err))
            }
        });
    });

router.route('/:id/deactivate')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        planValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Plan, request, response, next)
        })
    /**
     * @api {post} /plans/id/deactivate Deactivate a plan
     * @apiName Deactivate Plan
     * @apiVersion 0.6.0
     * @apiGroup Plans
     * @apiParam {String} id the plan's id
     * @apiParam {String="notRenewed","deceased","moveToOtherCity","other"} cancellationReason the plan's cancellationReason.
     * @apiDescription This endpoint will fail if plan is not already activated. Admin can cancel plans, users cannot.
     * A mail will be sent to admin to cancel a Plan.
     *
     * @apiSuccess (201) {String} _id the plan's id
     * @apiUse ErrorGroup
     * @apiError (Any Error) errorCode.-1005 Plan is not active
     */
    .post(jsonParser,
        expressValidator,
        planValidator.postDeactivationValidator,
        function (request, response, next) {
            let newObject = response.object;
            async.series([
                // 1.- Check permissions
                function (isDone) {
                    let err;
                    if (!request.user.hasRoles([constants.roleNames.admin]) &&
                        request.user._id.toString() !== newObject.owner._id.toString()) {
                        err = {
                            localizedError: 'You are not authorized to update a plan',
                            rawError: 'user ' + request.user._id + ' is not admin'
                        };
                        response.status(403).json(err);
                    }
                    isDone(err);
                },
                // 2.- Check plan prerrequirements
                function (isDone) {
                    let err;
                    if (!newObject.isActive()) {
                        err = errorConstants.responseWithError(newObject, errorConstants.errorNames.plans_notActivePlan);
                        response.status(400).json(err);
                    }
                    isDone(err);
                },
                // 3.- Change pet statuses
                function (isDone) {
                    if (request.user.hasRoles(constants.roleNames.admin)) {
                        let pet = newObject.pet;
                        let reason = {
                            status: constants.petStatusNames.unsuscribed
                        };
                        if (request.query.cancellationReason === constants.planCancellationNames.deceased) {
                            reason = {
                                status: constants.petStatusNames.deceased
                            };
                        }
                        pet.statuses.push(reason);
                        pet.save(function (err) {
                            if (err) {
                                response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                            }
                            isDone(err);
                        });
                    }
                    else { // user cannot change statuses
                        isDone();
                    }
                },

                // 5.- Change plan statuses
                function (isDone) {
                    let newStatus = {
                        status: constants.planStatusNames.cancelled
                    };
                    if (!request.user.hasRoles(constants.roleNames.admin)) {
                        newStatus= {
                            status: constants.planStatusNames.cancelPending
                        }
                    }
                    newObject.statuses.push(newStatus);
                    newObject.cancelationReason = request.query.cancelationReason;

                    if (!request.user.hasRoles(constants.roleNames.admin)) {
                        mailUtils.sendCancellationRequest(newObject,request.user,function (err) {
                           if (err){
                               return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.mailError));
                           }
                           route_utils.postUpdate(Plan, {'_id': request.params.id}, newObject, request, response, next);
                        });
                    }
                    else{
                        route_utils.postUpdate(Plan, {'_id': request.params.id}, newObject, request, response, next);
                    }

                },
            ], function (err) {
                if (err) {
                    winston.error("PLANS: Error activating plan: " + JSON.stringify(err))
                }
            });
        });


module.exports = router;
