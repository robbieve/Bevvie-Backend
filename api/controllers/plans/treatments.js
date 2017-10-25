// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Pet = require('api/models/pets/pets');
let Treatment = require('api/models/plans/treatment');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let treatmentValidator = require('api/validators/treatmentValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.hasRoles([constants.roleNames.admin])) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a treatment',
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
     * @api {post} /treatments Post new treatment
     * @apiVersion 0.3.0
     * @apiName PostNewTreatment
     * @apiGroup Treatments
     * @apiUse TreatmentParameters
     * @apiSuccess (201) {String} _id the treatment's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        treatmentValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(Treatment, newObject, request, response, next);
            });
        })

    /**
     * @api {get} /treatments Get treatments
     * @apiName GetTreatments
     * @apiGroup Treatments
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} text text to match on treatment name or any other text field
     * @apiParam {String} pet pet to match
     * @apiParam {String} vetCenter vetCenter to match
     * @apiParam {String} originUser originUser to match
     *
     * @apiParam {String="true","false","all"} active=true match active treatments or not

     * @apiSuccess {Object[]} docs       List of treatments.
     * @apiSuccess {String}   docs._id   Id of the treatment.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the treatment.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        treatmentValidator.getValidator,
        function (request, response, next) {
            let query = {
                active: true
            };
            ["active","name","reasonAgainst","vetCenter","pet","testDistance","vaccineFamily"].forEach(function (element) {
                query[element] = request.query[element]
            });

            if (request.query.text !== undefined) {
                query['$text'] = {'$search': request.query.text};
                if (request.headers["Accept-Language"]) {
                    query['$text']['$language'] = request.headers["Accept-Language"]
                }
            }
            query["active"]=true;
            if (request.query["active"]==="false"){
                query["active"]=false;
            }
            else if (request.query["active"]==="all"){
                delete query["active"];
            }

            if (request.query["originUser"]!==undefined){
                query["origin.user"]=request.query["originUser"];
            }
            route_utils.getAll(Treatment,
                query,
                {sort: {createdAt: 1}},
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        treatmentValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Treatment, request, response, next)
        })

    /**
     * @api {get} /treatment/id Get treatment by id
     * @apiName GetTreatment
     * @apiVersion 0.0.5
     * @apiGroup Treatments
     *
     * @apiParam {Number} id id of the treatment
     *
     * @apiSuccess {String}   _id   Id of the treatment.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /treatments/id Update treatment
     * @apiName UpdateTreatment
     * @apiVersion 0.3.0
     * @apiGroup Treatments
     * @apiParam {String} id the treatment's id
     * @apiUse TreatmentParameters
     *
     * @apiSuccess (201) {String} _id the treatment's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        treatmentValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Treatment, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /treatment/id Delete treatment by id
     * @apiName DeleteTreatment
     * @apiVersion 0.0.5
     * @apiGroup Treatments
     *
     * @apiParam {Number} id id of the treatment
     *
     * @apiSuccess {String}   _id   Id of the treatment.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.hasRoles([constants.roleNames.admin])) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a treatment',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Treatment.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
