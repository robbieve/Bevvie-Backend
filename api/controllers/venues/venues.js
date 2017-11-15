// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');
const configAuth = require("config").auth;
// DB
let Venue = require('api/models/venues/venue');
let Checkin = require('api/models/checkins/checkin');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let venueValidator = require('api/validators/venueValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const async = require("async");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.admin) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a venue',
            rawError: 'user ' + request.user._id + ' is not admin'
        });
        return;
    }
    if (request.body.location && !request.body.location.type) {
        request.body.location.type = constants.geo.formNames.Point;
    }
    callback(newObject)
}

// Default route
router.route('/')
    .all()
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
    .post(
        passport.authenticate('bearer', {session: false})
        ,jsonParser,
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
     * @apiVersion 0.16.0
     * @apiGroup Venues
     * @apiUse RegisterTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {String} [name] text to match on venue name
     * @apiParam {String} [geo] geolocation query --> Pagination will not be enabled if geo is present
     * @apiParam {String} geo.lat latitude to match
     * @apiParam {String} geo.long long to match
     * @apiParam {String} [geo.dist]=20 km2 to filter. If venue is further away it will be filtered
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="name"} sort.field=name field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active venues or not
     * @apiDescription this method will return the number of checkins for each venue if geo filtering is enabled.
     * Registration token must be used
     *
     * @apiSuccess {Object[]} docs       List of venues.
     * @apiSuccess {String}   docs._id   Id of the venue.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the venue.
     * @apiUse ErrorGroup
     * @apiUse ErrorInvalidGeoLocation
     * @apiUse PaginationGroup
     */
    .get(
        expressValidator,
        venueValidator.getValidator,
        function (request, response, next) {
            let baseToken = request.headers['register-token'];
            if (baseToken !== configAuth.baseToken) {
                response.status(401).json({'localizedError': 'Not Authorized', 'rawError': 'No authorization token'});
                return
            }

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
                if (!geo.lat || !geo.long) {
                    return response.status(400).json(errorConstants.responseWithError(err, errorConstants.errorNames.venue_getGeoInvalidLatOrLongErr));
                }
                let distance = geo.dist ? geo.dist : 30000;
                distance = parseFloat(distance);
                let distances = [];
                Venue.geoNear(
                    {type: "Point", coordinates: [parseFloat(geo.long), parseFloat(geo.lat)]},
                    {
                        spherical: true,
                        maxDistance: distance,
                        query: {
                            active: true
                        }
                    })
                    .then(function (results) {
                        distances = results.map(function (x) {
                            return x.dis;
                        });
                        let populateResults = results.map(function (x) {
                            delete x.dis;
                            return new Venue(x.obj);
                        });
                        return Venue.populate(populateResults, {path: "image"})
                    })
                    .then(function (results) {
                        return Venue.populate(results, {path: "images"});
                    })
                    .then((results) => {
                        let finalResults = [];
                        async.eachOf(results,
                            function (venue, index,isDone) {
                                Checkin.count({venue: venue._id}, function (err, count) {
                                    let finalVenue = venue.toJSON();
                                    finalVenue.checkins = count;
                                    finalVenue.distance = distances[index];
                                    finalResults.push(finalVenue);
                                    isDone(err);
                                });
                            },
                            function (err) {
                                if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                                return response.status(200).json({docs: finalResults});
                            });
                    }).catch((err) => {
                    return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));

                })
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
        if (!request.user.admin) {
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
