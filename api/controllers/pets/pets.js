// Globals
let express = require('express');
let router = express.Router();
// authentication
let passport = require('passport');
// parser
const jsonParser = require('lib/parsers/jsonBodyParser');

// DB
let Pet = require('api/models/pets/pets');
let User = require('api/models/users/user');
let Plan = require('api/models/plans/plan');
let dbError = require('lib/loggers/db_error');
// Validator
let expressValidator = require('lib/validation/validator');
let petValidator = require('api/validators/petValidator');
// utils
const route_utils = require('api/controllers/common/routeUtils');
const constants = require('api/common/constants');
const async = require("async");

// Prepost function
function _prepost(request, response, next, callback) {
    let newObject = request.body;
    User.findOne({_id: newObject.owner}, function (err, clientOrPotentialClient) {
        if (err) return dbError(err, request, response, next);
        if (!clientOrPotentialClient) {
            let localizedError = {
                'localizedError': 'owner not found',
                'rawError': newObject.owner + ' not found'
            };
            response.status(404).json(localizedError)
        }
        else {
            // If not admin, or not vetCenter related to user, or user, not authorized
            if (!request.user.hasRoles([constants.roleNames.admin]) &&
                !(request.user.hasRoles([constants.roleNames.vetcenter]) && request.user._id === clientOrPotentialClient.vetcenter.origin.user.toString()) &&
                !(request.user._id.toString() === clientOrPotentialClient._id.toString())) {
                response.status(403).json({
                    localizedError: 'You are not authorized to create or update a pet',
                    rawError: 'user ' + request.user._id + ' is not admin'
                });
                return;
            }
            callback(newObject)
        }
    })
}

// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /pets Post new pet
     * @apiName PostNewPet
     * @apiVersion 0.3.0
     * @apiGroup Pets
     * @apiUse PetParameters
     * @apiUse BreedParameters
     * @apiSuccess (201) {String} _id the pet's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        petValidator.postValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                async.parallel([
                    function (isDone) {
                        let vetCenter = newObject.vetCenter; // Add ordering for vetCenter
                        if (!vetCenter) {return isDone();}
                        if (vetCenter["_id"]){ vetCenter = vetCenter._id }
                        User.findOne({_id: vetCenter},function (err,object) {
                            newObject["sort"] = newObject["sort"] ? newObject["sort"] : {};
                            newObject.sort.vetCenterName = object.name;
                            let anErr = err;
                            if (!object){
                                anErr = {"error": "not found object for vetcenter "+vetCenter}
                            }
                            isDone(anErr)
                        })

                    },
                    function (isDone) {
                        let petCreated = newObject._id; // Add ordering for subscription
                        if (!petCreated) {return isDone();}
                        Plan.findOne({_id: petCreated, "statuses.status":"suscribed"},function (err,object) {
                            newObject["sort"] = newObject["sort"] ? newObject["sort"] : {};
                            newObject.sort.planCreationDate= object.createdAt;
                            let anErr = err;
                            if (!object){
                                anErr = {"error": "not found plan for pet "+petCreated}
                            }
                            isDone(anErr)
                        })
                    },
                ],function (err) {
                    if (err){
                        return response.status(404).json({
                            localizedError: 'Not found related info.',
                            rawError: 'Not found related info: ' + JSON.stringify(err)
                        });

                    }
                    route_utils.post(Pet, newObject, request, response, next);
                });
            });
        })

    /**
     * @api {get} /pets Get pets
     * @apiName GetPets
     * @apiVersion 0.3.0
     * @apiGroup Pets
     * @apiHeader  {String} Accept-Language=es Accepted language.
     *
     * @apiParam {Number} limit number of slices to get
     * @apiParam {Number} offset start of slices to get
     * @apiParam {String} text text to match on pet name or any other text field
     * @apiParam {String} owner user id to match the owner
     * @apiParam {String} status status to match
     * @apiParam {String} vetCenter vetCenter id  to match
     * @apiParam {String="true","false","all"} active=true match active pets or not
     *
     * @apiParam {Object[]} [sort] sort struct array
     * @apiParam {String="status","planCreationDate","name","vetCenterName"} sort.field=createdAt field to sort with
     * @apiParam {String="asc","desc"} sort.order=asc whether to sort ascending or descending
     *
     *
     * @apiSuccess {Object[]} docs       List of pets.
     * @apiSuccess {String}   docs._id   Id of the pet.
     * @apiSuccess {String}   docs.versionNumber   versionNumber of the pet.
     * @apiUse ErrorGroup
     */
    .get(expressValidator,
        petValidator.getValidator,
        function (request, response, next) {

            // FILTER
            let transform = {
                directQuery: {
                    "vetCenter": "vetCenter",
                    "owner": "owner",
                    "status": "statuses.status",
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
                _default: [["name",1]],
                status: "statuses.status",
                planCreationDate: "sort.planCreationDate",
                name: "name",
                vetCenterName: "sort.vetCenterName",
            };
            let query = route_utils.filterQuery(request.query, transform);
            let options = {sort: []};
            options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
            route_utils.getAll(Pet,
                query,
                options,
                request, response, next)
        });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        petValidator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Pet, request, response, next)
        })

    /**
     * @api {get} /pet/id Get pet by id
     * @apiName GetPet
     * @apiVersion 0.0.1
     * @apiGroup Pets
     *
     * @apiParam {Number} id id of the pet
     *
     * @apiSuccess {String}   _id   Id of the pet.
     * @apiUse ErrorGroup
     */
    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {post} /pets/id Update pet
     * @apiName UpdatePet
     * @apiVersion 0.3.0
     * @apiGroup Pets
     * @apiParam {String} id the pet's id
     * @apiUse PetParameters
     * @apiUse BreedParameters
     *
     *
     * @apiSuccess (201) {String} _id the pet's id
     * @apiUse ErrorGroup
     */
    .post(jsonParser,
        expressValidator,
        petValidator.postUpdateValidator,
        function (request, response, next) {
            _prepost(request, response, next, function (newObject) {
                route_utils.postUpdate(Pet, {'_id': request.params.id}, newObject, request, response, next);
            });
        })
    /**
     * @api {delete} /pet/id Delete pet by id
     * @apiName DeletePet
     * @apiVersion 0.0.1
     * @apiGroup Pets
     *
     * @apiParam {Number} id id of the pet
     *
     * @apiSuccess {String}   _id   Id of the pet.
     * @apiUse ErrorGroup
     */
    .delete(function (request, response) {
        Pet.deleteByIds([response.object._id], function (err, result) {
            if (err) return dbError(err, request, response, next);
            response.status(200).json(result)
        });
    });

module.exports = router;
