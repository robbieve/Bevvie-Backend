// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Breed = require('api/models/pets/breeds');
let User = require('api/models/users/user');
let dbError = require('lib/loggers/db_error');

// Validator
let expressValidator = require('lib/validation/validator');
let breedValidator = require('api/validators/breedValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    // If not admin, cannot post
    if (!request.user.hasRoles([constants.roleNames.admin])) {
        response.status(403).json({
            localizedError: 'You are not authorized to create or update a breed',
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
     * @api {post} /breeds Post new breed
     * @apiName PostNewBreed
     * @apiVersion 0.3.0
     * @apiGroup Breeds
     * @apiUse BreedParameters
     * @apiSuccess (201) {String} _id the breed's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        breedValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.post(Breed, newObject, request, response, next);
            });
        })

    /**
     * @api {get} /breeds Get breeds
     * @apiName GetBreeds
     * @apiVersion 0.7.0
     * @apiGroup Breeds
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} text text to match on breed name or any other text field
     * @apiParam {String} royalCaninIdentifier royalCaninIdentifier to match
     * @apiParam {String} species species to match
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="common","name"} sort.field=common field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending

     * @apiParam {String="true","false","all"} active=true match active breeds or not

     * @apiSuccess {Object[]} docs       List of breeds.
     * @apiSuccess {String}   docs._id   Id of the breed.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the breed.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        breedValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "royalCaninIdentifier": "royalCaninIdentifier",
                    "species": "species",
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

            // SORT
            let sortTransform = {
                _default: [["common",1],["name",1]],
                common: "common",
                name: "name",
            };

            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);


            route_utils.getAll(Breed,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        breedValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Breed, request, response, next)
        })

    /**
     * @api {get} /breed/id Get breed by id
     * @apiName GetBreed
     * @apiVersion 0.0.1
     * @apiGroup Breeds
     *
     * @apiParam {Number} id id of the breed
     *
     * @apiSuccess {String}   _id   Id of the breed.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /breeds/id Update breed
     * @apiName UpdateBreed
     * @apiVersion 0.0.1
     * @apiGroup Breeds
     * @apiParam {String} id the breed's id
     * @apiUse BreedParameters
     *
     * @apiSuccess (201) {String} _id the breed's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        breedValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Breed, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /breed/id Delete breed by id
     * @apiName DeleteBreed
     * @apiVersion 0.0.1
     * @apiGroup Breeds
     *
     * @apiParam {Number} id id of the breed
     *
     * @apiSuccess {String}   _id   Id of the breed.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        if (!request.user.hasRoles([constants.roleNames.admin])) {
            response.status(403).json({
                localizedError: 'You are not authorized to delete a breed',
                rawError: 'user ' + request.user._id + ' is not admin'
            });
            return;
        }
        Breed.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
