// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Device = require('api/models/push/device');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');
let pushUtils = require("api/controllers/common/pushUtils");

// Validator
let expressValidator = require('lib/validation/validator');
let deviceValidator = require('api/validators/deviceValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.admin && newObject.user.toString() !== request.user._id.toString()) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update this device',
            rawError: 'user ' + request.user._id + ' is not admin'
        });
        return;
    }
    callback(newObject);
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /devices Post new device
     * @apiName PostNewDevice
     * @apiVersion 0.8.0
     * @apiGroup Devices
     *
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse DeviceParameters
     * @apiSuccess (201) {String} _id the device's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        deviceValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                Device.findOne({pushToken: newObject.pushToken}, function (err, token) {
                    if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    if (token) {
                        return response.status(409).json({
                            localizedError: 'Token exists',
                            rawError: 'token ' + JSON.stringify(token),
                            data: token
                        });
                    }
                    route_utils.post(Device, newObject, request, response, next);
                })

            });
        })

    /**
     * @api {get} /devices Get devices
     * @apiName GetDevices
     * @apiVersion 0.8.0
     * @apiGroup Devices
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {String} [user] id of a user in the device
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active devices or not

     * @apiSuccess {Object[]} docs       List of devices.
     * @apiSuccess {String}   docs._id   Id of the device.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the device.
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .get(expressValidator,
        deviceValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
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
                _default: [["createdAt", 1]],
                date: "createdAt",
            };

            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Device,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        deviceValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Device, request, response, next)
        })

    /**
     * @api {get} /device/id Get device by id
     * @apiName GetDevice
     * @apiVersion 0.8.0
     * @apiGroup Devices
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the device
     *
     * @apiSuccess {String}   _id   Id of the device.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /devices/id Update device
     * @apiName UpdateDevice
     * @apiVersion 0.8.0
     * @apiGroup Devices
     * @apiParam {String} id the device's id
     * @apiUse DeviceParameters
     *
     * @apiSuccess (201) {String} _id the device's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        deviceValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Device, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /device/id Delete device by id
     * @apiName DeleteDevice
     * @apiVersion 0.8.0
     * @apiGroup Devices
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the device
     *
     * @apiSuccess {String}   _id   Id of the device.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.admin && request.user._id.toString() !== response.object.user._id.toString()) {
            return response.status(403).json({
                localizedError: 'You are not authorized to delete a device',
                rawError: 'user ' + request.user._id + ' is not admin'
            });

        }
        else {
            Device.deleteByIds([response.object._id], function (err, result) {
                if (err) {
                    return dbError(err, request, response, next);
                }
                else {
                    response.status(200).json(result)
                }
            });
        }
    });


module.exports = router;
