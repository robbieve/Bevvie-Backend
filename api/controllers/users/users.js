// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let User = require('api/models/users/user');

let dbError = require('lib/loggers/db_error');
let redis = require('lib/redis/redis');
let winston = require('lib/loggers/logger').winston;
let stripe = require('lib/stripe/stripe');
let async = require('async');
let moment = require("moment");
let config = require("config");
let mailUtils = require("api/controllers/common/mailUtils");
const errorConstants = require('api/common/errorConstants');


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
     * @api {get} /users Get users
     * @apiName GetUsers
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiHeader  {String} Accept-Language=es Accepted language.
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} text text search on user
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt","name","country","languages","banned"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active users or not
     * @apiParam {String="true","false","all"} admin=false match admin users or not
     *
     *
     * @apiSuccess {Object[]} data       List of users.
     * @apiSuccess {String}   data._id   Id of the users.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        userValidator.getValidator,
        function (request, response, next) {
            let newClient = request.body;

            // FILTER
            let transform = {
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
                    admin: {
                        _default: false,
                        _values: {
                            "true": true,
                            "all": "_delete",
                        }
                    },
                }
            };
            let query = route_utils.filterQuery(request.query, transform);

            // SORT
            let sortTransform = {
                _default: "createdAt",
                createdAt: "createdAt",
                name: "name",
                country: "country",
                languages: "languages",
                banned: "banned",

            };

            let options = {};
            if (request.query.limit !== undefined && Number(request.query.limit) >= 0) {
                options.limit = Number(request.query.limit);
            }
            if (request.query.offset !== undefined && Number(request.query.offset) >= 0) {
                options.offset = Number(request.query.offset);
            }
            else if (request.query.page !== undefined && Number(request.query.page) >= 0) {
                options.page = Number(request.query.page);
            }

            options["sort"] = route_utils.sortQuery(request.query.sort, sortTransform);

            let filterQuery = User.filterQuery(request.user, function (error, filter) {
                if (error) return response.status(404).json(error);
                Object.assign(query, filter);
                let cacheQuery = {};
                Object.assign(cacheQuery, query);
                Object.assign(cacheQuery, options);
                redis.getCachedResults(cacheQuery, User.modelName + "-list", request, function (err, reply) {
                    if (err) {
                        return response.status(500).json({
                            localizedError: 'There was an error at the caching system',
                            rawError: 'error: ' + err
                        });
                    }
                    else if (reply) {
                        response.status(200).json(reply);
                    }
                    else {
                        User.paginate(query, options, function (err, object) {
                            redis.setCachedResult(cacheQuery, User.modelName + "-list", object);
                            if (err) return dbError(err, request, response, next);
                            response.json(object);
                        });
                    }
                });
            });
        });

router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        function (request, response, next) {
            route_utils.getOne(User, request, response, next)
        })

    /**
     * @api {get} /users/id Get user by id
     * @apiName GetUser
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     *
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /users/id Modify user
     * @apiName ModifyUser
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     * @apiDescription This method will update a user.
     *
     * @apiUse UserParameters
     * @apiSuccess {String} name Name of the user
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        userValidator.postUpdateValidator,
        function (request, response, next) {
            let newObject = request.body;
            route_utils.postUpdate(User, {'_id': request.params.id}, newObject, request, response, next);
        })
    /**
     * @api {delete} /users/id Delete user by id
     * @apiName DeleteUser
     * @apiVersion 0.2.0
     * @apiGroup Users
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the user
     *
     */
    .delete(function (request, response) {
        // If not admin, fail
        if (!request.user.admin) {
            return response.status(403).json({
                localizedError: 'You are not authorized to delete users',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
        }
        redis.deleteCachedResult({_id: response.object._id}, User.modelName, function (err) {
            User.deleteByIds([response.object._id], function (err, user) {
                if (err) return dbError(err, request, response, next);
                response.status(200).json(user)
            });
        });

    });


module.exports = router;
