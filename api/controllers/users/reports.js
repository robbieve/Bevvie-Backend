// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');
var mongoose = require('mongoose');

// DB
let Report = require('api/models/users/report');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let reportValidator = require('api/validators/reportValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");
const config = require("config");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    callback(newObject);
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /reports Post new report
     * @apiName PostNewReport
     * @apiVersion 0.10.0
     * @apiGroup Reports
     *
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse ReportParameters
     * @apiSuccess (201) {String} _id the report's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        reportValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(Report, newObject, request, response, next);
            });
        })

    /**
     * @api {get} /reports Get reports
     * @apiName GetReports
     * @apiVersion 0.10.0
     * @apiGroup Reports
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {String} [userReports] id of the user who reports to match
     * @apiParam {String} [userReported] id of the user who is reported to match
     * @apiParam {Boolean} [statistics] report grouped by
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active reports or not
     * @apiDescription If you run with "statistics", a grouped statistic for each reported user will be returned. 
     * @apiSuccess {Object[]} docs       List of reports.
     * @apiSuccess {String}   docs._id   Id of the report.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the report.
     * @apiUse ErrorGroup
     * @apiUse PaginationGroup
     */
    .get(expressValidator,
        reportValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "userReports": "userReports",
                    "userReported": "userReported",
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
                _default: ["createdAt", 1],
                date: "createdAt",
            };

            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: [["createdAt", 1]]};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            if (request.query.statistics === "true") {
                let aggregateSort={};
                options.sort.forEach(function (pair) {
                    aggregateSort[pair[0]]=pair[1];
                })
                if (query.userReported){ query.userReported = mongoose.Types.ObjectId(query.userReported);}
                if (query.userReports){ query.userReports = mongoose.Types.ObjectId(query.userReports);}
                Report.aggregate([
                    {$match: query},
                    {
                        $group: {
                            _id: "$userReported",
                            count: {$sum: 1},
                            reports: {'$push': '$$ROOT'},
                        },
                    },
                    {$sort: aggregateSort},
                    {$skip: request.query.offset ? request.query.offset : 0},
                    {$limit: request.query.limit ? request.query.limit : config.paginationSize}
                ], function (err, reports) {
                    let objectResponse = {docs: reports}
                    response.status(200).json(objectResponse);
                });
            }
            else {
                route_utils.getAll(Report,
                    query,
                    options,
                    request, response, next)
            }
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        reportValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Report, request, response, next)
        })

    /**
     * @api {get} /reports/id Get report by id
     * @apiName GetReport
     * @apiVersion 0.10.0
     * @apiGroup Reports
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the report
     *
     * @apiSuccess {String}   _id   Id of the report.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {delete} /reports/id Delete report by id
     * @apiName DeleteReport
     * @apiVersion 0.10.0
     * @apiGroup Reports
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the report
     *
     * @apiSuccess {String}   _id   Id of the report.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.admin && request.user._id.toString() !== response.object.userReports._id.toString()) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a report',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Report.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
