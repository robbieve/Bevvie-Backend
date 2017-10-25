// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let RegionPonderation = require('api/models/plans/regionPonderation');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let regionPonderationValidator = require('api/validators/regionPonderationValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.hasRoles([constants.roleNames.admin])) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a regionPonderation',
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
     * @api {post} /regionPonderations Post new regionPonderation
     * @apiName PostNewRegionPonderation
     * @apiVersion 0.3.0
     * @apiGroup RegionPonderations
     * @apiUse RegionPonderationParameters
     * @apiSuccess (201) {String} _id the regionPonderation's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        regionPonderationValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(RegionPonderation, newObject, request, response, next);
            });
        })

    /**
     * @api {get} /regionPonderations Get regionPonderations
     * @apiName GetRegionPonderations
     * @apiVersion 0.1.0
     * @apiGroup RegionPonderations
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} text text to match on regionPonderation name or any other text field
     * @apiParam {String} country country to match
     * @apiParam {String} country country to match
     * @apiParam {String} region region to match
     * @apiParam {String} postalCode postalCode to match
     *
     * @apiParam {String="true","false","all"} active=true match active regionPonderations or not

     * @apiSuccess {Object[]} docs       List of regionPonderations.
     * @apiSuccess {String}   docs._id   Id of the regionPonderation.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the regionPonderation.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        regionPonderationValidator.getValidator,
        function (request, response, next) {
            let query = {
                active: true
            };
            ["country","region","postalCode"].forEach(function (element) {
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

            route_utils.getAll(RegionPonderation,
                query,
                {sort: {createdAt: 1}},
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        regionPonderationValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(RegionPonderation, request, response, next)
        })

    /**
     * @api {get} /regionPonderation/id Get regionPonderation by id
     * @apiName GetRegionPonderation
     * @apiVersion 0.1.0
     * @apiGroup RegionPonderations
     *
     * @apiParam {Number} id id of the regionPonderation
     *
     * @apiSuccess {String}   _id   Id of the regionPonderation.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /regionPonderations/id Update regionPonderation
     * @apiName UpdateRegionPonderation
     * @apiVersion 0.3.0
     * @apiGroup RegionPonderations
     * @apiParam {String} id the regionPonderation's id
     * @apiUse RegionPonderationParameters
     *
     * @apiSuccess (201) {String} _id the regionPonderation's id
     */
    .post(jsonParser,
        expressValidator,
        regionPonderationValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(RegionPonderation, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /regionPonderation/id Delete regionPonderation by id
     * @apiName DeleteRegionPonderation
     * @apiVersion 0.1.0
     * @apiGroup RegionPonderations
     *
     * @apiParam {Number} id id of the regionPonderation
     *
     * @apiSuccess {String}   _id   Id of the regionPonderation.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.hasRoles([constants.roleNames.admin])) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a regionPonderation',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        RegionPonderation.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
