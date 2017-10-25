// Globals
const express = require('express');
const router = express.Router();

// authentication
const passport = require('passport');

// parser
const uploadInMemory = require('lib/blobs/blob_upload_inmemory');

// validator
const expressValidator = require('lib/validation/validator');
const validator = require("api/validators/blobsValidator");

// Use gridfs to store images
const gfs = require('lib/blobs/gridfs_storage');

// DB & utils
const Image = require('api/models/blobs/images');
const route_utils = require('api/controllers/common/routeUtils');
const dbError = require('lib/loggers/db_error');

// S3
const s3 = require('lib/blobs/s3_blobs');
const str = require('streamifier');
const md5 = require('md5');

// Async
const async = require('async');


// Default route
router.route('/')
    .all(passport.authenticate('bearer', {session: false}))
    /**
     * @api {post} /image Post new image
     * @apiName PostNewImage
     * @apiVersion 0.1.0
     * @apiGroup Images
     *
     * @apiParam {Data} file file to upload
     *
     * @apiUse ImageParameters
     * @apiUse ErrorGroup
     */
    .post(uploadInMemory.single('file'), expressValidator, validator.postValidator, function (request, response, next) {
        if (request.file === undefined) {
            response.status(400).json({'localizedError': 'No file provided', 'rawError': 'no file included'});
            return;
        }
        // Upload to s3
        let identifier = md5(request.file.buffer);
        // s3file : { Key, Body, encoding, ContentType,  ACL }
        let s3file = {
            ACL: 'public-read',
            Key: identifier,
            Body: request.file.buffer,
            ContentType: request.file.mimetype || "image/png",
            StorageClass: "REDUCED_REDUNDANCY"
        };

        let storedImage;
        async.waterfall(
            [
                // TASK1: Check if it is the same image as one we have stored
                function (callback) {
                    Image.findOne({"md5": identifier}, function (err, image) {
                        if (err) return callback(err, null);
                        if (image) { // Same image name and same image
                            storedImage = image;
                            callback(null, image.s3.url)
                        }
                        else {
                            callback(null, null)
                        }
                    })
                },
                // TASK2: Upload to S3
                function (url, callback) {
                    if (url) { // Already stored, pass to next task
                        callback(null, url);
                        return
                    } // No need to go on
                    s3.upload_to_s3(s3file, function (err, res) {
                        if (err) {
                            response.status(500).json({'localizedError': 'There was an error saving the data: ' + err});
                            callback(null, null)
                        }
                        else {
                            callback(null, res.Location);
                        }
                    })
                },
                // TASK3: Store the new model
                function (location, callback) {
                    if (!location) {
                        callback(null, null);
                        return
                    } // No need to go on

                    // Use the stored image or create a new one
                    let image = storedImage;
                    if (!image) {
                        image = new Image()
                    }
                    image.md5 = identifier;
                    image.contentType = request.file.mimetype;
                    image.s3.identifier = identifier;
                    image.s3.url = location;
                    image.owner = request.user;
                    image.save(function (err) {
                        callback(err, image)
                    })
                },
            ],
            function (err, res) {
                if (err) {
                    return dbError(err, request, response, next)
                }
                else if (res) {
                    response.status(201).json(res);
                }
            })

    })
    /**
     * @api {get} /images Get images
     * @apiName GetImages
     * @apiVersion 0.1.0
     * @apiGroup Images
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [imageName] text to match on image name
     * @apiParam {String} [placeholderName] text to match on placeholder name.
     * @apiParam {String} [contentType] text to match content
     * @apiParam {Object} [s3] s3 object
     * @apiParam {String} [s3.identifier] identifier at s3
     * @apiParam {String} [s3.url] url at s3
     * @apiParam {String} [owner] client
     *
     * @apiSuccess {Object[]} docs       List of objects.
     * @apiSuccess {String}   docs._id   Id of the objects.
     * @apiUse ErrorGroup
     */
    .get(expressValidator, validator.getValidator, function (request, response, next) {
        // FILTER
        let transform = {
            directQuery: {
                "imageName": "imageName",
                "placeholderName": "placeholderName",
                "contentType":"contentType"
            }
        };
        let query = route_utils.filterQuery(request.query, transform);

        // SORT
        let sortTransform = {
            _default: [["createdAt",1]],
        };

        let options = {sort: []};
        options.sort = route_utils.sortQuery(request.query.sort, sortTransform, options.sort);
        route_utils.getAll(Image,
            query,
            options,
            request, response, next)
    });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        validator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(Image, request, response, next)
        })
    /**
     * @api {get} /image/id Get image by id
     * @apiName GetImage
     * @apiVersion 0.1.0
     * @apiGroup Images
     *
     * @apiParam {Number} id id of the image
     *
     * @apiSuccess {String} _id Id of the image.
     * @apiUse ErrorGroup
     */

    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {delete} /image/id Delete an image
     * @apiName DeleteImage
     * @apiVersion 0.1.0
     * @apiGroup Images
     *
     * @apiParam {String} id file to delete
     *
     * @apiSuccess {String}   id    id of the deleted object.
     */
    .delete(function (request, response) {
        let s3file = {
            Key: response.object.s3.identifier,
        };

        // We do not wait for s3 to delete the image
        async.parallel(
            [
                function (callback) {
                    s3.remove_from_s3(s3file, function (err, res) {
                        if (err) {
                            callback({'localizedError': 'There was an error deleting the data on s3: ' + err})
                        }
                        else {
                            callback()
                        }
                    })
                },
                function (callback) {
                    Image.deleteByIds([response.object._id], function (err, result) {
                        if (err) return dbError(err, request, response, next);
                        callback(null, result)
                    });
                }
            ],
            function (err, results) {
                if (err) {
                    response.status(500).json(err)
                }
                else {
                    response.status(200).json({})
                }
            })
    });


module.exports = router;
