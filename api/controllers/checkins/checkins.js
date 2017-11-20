// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Checkin = require('api/models/checkins/checkin');
let Venue = require('api/models/venues/venue');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let checkinValidator = require('api/validators/checkinValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.admin && request.user._id.toString() !== newObject.user) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update this checkin',
            rawError: 'user ' + request.user._id + ' is not admin'
        });
        return;
    }
    User.findOne({_id: newObject.user},function (err,theUser) {
        if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
        if (!theUser) return response.status(404).json(errorConstants.responseWithError(request.user.id,errorConstants.errorNames.notFound));
        newObject.user_age = theUser.birthday?
             moment().diff(theUser.birthday, 'years',false):
            constants.users.maxAge ;
        Venue.findOne({_id: newObject.venue},function (err,theVenue) {
                newObject.expiration = moment().add(theVenue.maxTimePerCheck(),"seconds");
                callback(newObject);
        });
    });

}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /checkins Post new checkin
     * @apiName PostNewCheckin
     * @apiVersion 0.3.0
     * @apiGroup Checkins
     * @apiDescription User will be removed from any other venue it might be present in
     *
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse CheckinParameters
     * @apiSuccess (201) {String} _id the checkin's id
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .post(jsonParser,
        expressValidator,
        checkinValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                Checkin.remove({user: request.user._id},function (err) {
                    if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    route_utils.post(Checkin, newObject, request, response, next);
                });
            });
        })

    /**
     * @api {get} /checkins Get checkins
     * @apiName GetCheckins
     * @apiVersion 0.3.0
     * @apiGroup Checkins
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {String} [venue] id of the venue to match on checkin name
     * @apiParam {String} [user] id of the user to match on checkin name
     * @apiParam {String} [maxAge] max age of the users
     * @apiParam {String} [minAge] min age of the users
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="date"} sort.field=date field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active checkins or not

     * @apiSuccess {Object[]} docs       List of checkins.
     * @apiSuccess {String}   docs._id   Id of the checkin.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the checkin.
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .get(expressValidator,
        checkinValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "venue": "venue",
                    "user": "user",
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

            // SORT
            let sortTransform = {
                _default: [["date", 1]],
                date: "date",
            };

            let query = route_utils.filterQuery(request.query, transform);

            let ageRequest;
            if (request.query.maxAge){
                ageRequest = {};
                Object.assign(ageRequest,{user_age:{$lte: request.query.maxAge}});
            }
            if (request.query.minAge){
                ageRequest = ageRequest ? ageRequest : {user_age: {}};
                Object.assign(ageRequest["user_age"],{$gte: request.query.minAge});
            }
            Object.assign(query, ageRequest);
            let options = {sort: []};
             options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Checkin,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        checkinValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Checkin, request, response, next)
        })

    /**
     * @api {get} /checkin/id Get checkin by id
     * @apiName GetCheckin
     * @apiVersion 0.3.0
     * @apiGroup Checkins
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the checkin
     *
     * @apiSuccess {String}   _id   Id of the checkin.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /checkins/id Update checkin
     * @apiName UpdateCheckin
     * @apiVersion 0.3.0
     * @apiGroup Checkins
     * @apiParam {String} id the checkin's id
     * @apiUse CheckinParameters
     *
     * @apiSuccess (201) {String} _id the checkin's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        checkinValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Checkin, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /checkin/id Delete checkin by id
     * @apiName DeleteCheckin
     * @apiVersion 0.3.0
     * @apiGroup Checkins
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the checkin
     *
     * @apiSuccess {String}   _id   Id of the checkin.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.admin &&request.user._id.toString() !== response.object.user._id.toString()) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a checkin',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Checkin.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
