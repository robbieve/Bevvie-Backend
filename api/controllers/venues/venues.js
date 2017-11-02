// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Venue = require('api/models/venues/venue');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let venueValidator = require('api/validators/venueValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.hasRoles([constants.roleNames.admin])) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a venue',
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
     * @api {post} /venues Post new venue
     * @apiName PostNewVenue
     * @apiVersion 0.2.0
     * @apiGroup Venues
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse VenueParameters
     * @apiSuccess (201) {String} _id the venue's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        venueValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(Venue, newObject, request, response, next);
            });
        })

    /**
     * @api {get} /venues Get venues
     * @apiName GetVenues
     * @apiVersion 0.2.0
     * @apiGroup Venues
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [name] text to match on venue name
     * @apiParam {String} [geo] geolocation query --> Pagination will not be enabled if geo is present
     * @apiParam {String} geo.lat latitude to match
     * @apiParam {String} geo.long long to match
     * @apiParam {String} [geo.dist]=20 km2 to filter. If venue is further away it will be filtered
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="name"} sort.field=name field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active venues or not

     * @apiSuccess {Object[]} docs       List of venues.
     * @apiSuccess {String}   docs._id   Id of the venue.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the venue.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        venueValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                regexQuery: {
                    "name": "name",
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
                _default: ["name", 1],
                name: "name",
            };

            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);

            if (request.query.geo) {
                let geo = request.query.geo;
                if (!geo.lat || !geo.long){
                    return response.status(400).json(errorConstants.responseWithError(err,errorConstants.errorNames.venue_getGeoInvalidLatOrLongErr));
                }
                let distance = geo.dist ? geo.dist : 30000;
                Venue.aggregate(
                    [
                        {
                            "$geoNear": {
                                "near": {
                                    "type": "Point",
                                    "coordinates": [geo.long,geo.lat]
                                },
                                "distanceField": "distance",
                                "sperical": true,
                                "maxDistance": distance
                            }
                        }
                    ],
                    function (err, results) {
                        if (err) {
                            return response.status(500).json(errorConstants.responseWithError(err,errorConstants.errorNames.dbGenericError));
                        }
                        else if (reply) {
                            response.status(200).json(reply);
                        }
                    }
                )
            }
            else {
                route_utils.getAll(Venue,
                    query,
                    options,
                    request, response, next)
            }
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        venueValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Venue, request, response, next)
        })

    /**
     * @api {get} /venue/id Get venue by id
     * @apiName GetVenue
     * @apiVersion 0.2.0
     * @apiGroup Venues
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the venue
     *
     * @apiSuccess {String}   _id   Id of the venue.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /venues/id Update venue
     * @apiName UpdateVenue
     * @apiVersion 0.2.0
     * @apiGroup Venues
     * @apiParam {String} id the venue's id
     * @apiUse VenueParameters
     *
     * @apiSuccess (201) {String} _id the venue's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        venueValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Venue, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /venue/id Delete venue by id
     * @apiName DeleteVenue
     * @apiVersion 0.2.0
     * @apiGroup Venues
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the venue
     *
     * @apiSuccess {String}   _id   Id of the venue.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.hasRoles([constants.roleNames.admin])) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a venue',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Venue.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
