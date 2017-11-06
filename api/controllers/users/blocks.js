// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Block = require('api/models/users/block');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let blockValidator = require('api/validators/blockValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const errorConstants = require('api/common/errorConstants');
const moment = require("moment");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    callback(newObject);
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /blocks Post new block
     * @apiName PostNewBlock
     * @apiVersion 0.7.0
     * @apiGroup Blocks
     *
     * @apiUse AuthorizationTokenHeader
     *
     * @apiUse BlockParameters
     * @apiSuccess (201) {String} _id the block's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        blockValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {

                Block.remove({user: request.user._id},function (err) {
                    if (err) return response.status(500).json(errorConstants.responseWithError(err, errorConstants.errorNames.dbGenericError));
                    route_utils.post(Block, newObject, request, response, next);
                });
            });
        })

    /**
     * @api {get} /blocks Get blocks
     * @apiName GetBlocks
     * @apiVersion 0.7.0
     * @apiGroup Blocks
     * @apiUse AuthorizationTokenHeader
     *
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [userBlocks] id of the user who blocks to match
     * @apiParam {String} [userBlocked] id of the user who is blocked to match
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="createdAt"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     * @apiParam {String="true","false","all"} active=true match active blocks or not

     * @apiSuccess {Object[]} docs       List of blocks.
     * @apiSuccess {String}   docs._id   Id of the block.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the block.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        blockValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "userBlocks": "userBlocks",
                    "userBlocked": "userBlocked",
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
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Block,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        blockValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Block, request, response, next)
        })

    /**
     * @api {get} /block/id Get block by id
     * @apiName GetBlock
     * @apiVersion 0.7.0
     * @apiGroup Blocks
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the block
     *
     * @apiSuccess {String}   _id   Id of the block.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {delete} /block/id Delete block by id
     * @apiName DeleteBlock
     * @apiVersion 0.7.0
     * @apiGroup Blocks
     * @apiUse AuthorizationTokenHeader
     *
     * @apiParam {Number} id id of the block
     *
     * @apiSuccess {String}   _id   Id of the block.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.admin && request.user._id.toString() !== response.object.userBlocks._id.toString()) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a block',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Block.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
