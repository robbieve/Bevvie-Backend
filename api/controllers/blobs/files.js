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

// Use gridfs to store files
const gfs = require('lib/blobs/gridfs_storage');

// DB & utils
const File = require('api/models/blobs/files');
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
     * @api {post} /file Post new file
     * @apiName PostNewFile
     * @apiVersion 0.1.0
     * @apiGroup Files
     * @apiUse AuthorizationTokenHeader
     * @apiParam {Data} file file to upload
     *
     * @apiUse FileParameters
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
            ContentType: request.file.mimetype,
            StorageClass: "REDUCED_REDUNDANCY"
        };

        let storedFile;
        async.waterfall(
            [
                // TASK1: Check if it is the same file as one we have stored
                function (callback) {
                    File.findOne({"md5": identifier}, function (err, file) {
                        if (err) return callback(err, null);
                        if (file) { // Same file name and same file
                            storedFile = file;
                            callback(null, file.s3.url)
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

                    // Use the stored file or create a new one
                    let file = storedFile;
                    if (!file) {
                        file = new File()
                    }
                    file.md5 = identifier;
                    file.contentType = request.file.mimetype;
                    file.s3.identifier = identifier;
                    file.s3.url = location;
                    file.owner = request.user;
                    file.save(function (err) {
                        callback(err, file)
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
     * @api {get} /files Get files
     * @apiName GetFiles
     * @apiVersion 0.1.0
     * @apiGroup Files
     *
     * @apiParam {Number} [limit] number of slices to get
     * @apiParam {Number} [offset] start of slices to get
     * @apiParam {String} [fileName] text to match on file name
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
                "fileName": "fileName",
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
        route_utils.getAll(File,
            query,
            options,
            request, response, next)
    });


router.route('/:id')
    .all(passport.authenticate('bearer', {session: false}),
        expressValidator,
        validator.getOneValidator,
        function (request, response, next) {
            route_utils.getOne(File, request, response, next)
        })
    /**
     * @api {get} /file/id Get file by id
     * @apiName GetFile
     * @apiVersion 0.1.0
     * @apiGroup Files
     *
     * @apiParam {Number} id id of the file
     *
     * @apiSuccess {String} _id Id of the file.
     * @apiUse ErrorGroup
     */

    .get(function (request, response) {
        response.status(200).json(response.object)
    })
    /**
     * @api {delete} /file/id Delete an file
     * @apiName DeleteFile
     * @apiVersion 0.1.0
     * @apiGroup Files
     *
     * @apiParam {String} id file to delete
     *
     * @apiSuccess {String}   id    id of the deleted object.
     */
    .delete(function (request, response) {
        let s3file = {
            Key: response.object.s3.identifier,
        };

        // We do not wait for s3 to delete the file
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
                    File.deleteByIds([response.object._id], function (err, result) {
                        if (err) return dbError(err, request, response, next);
                        callback(null, result)
                    });
                }
            ],
            function (err, results) {
                if (err) {
                    response.status(500).json(err);
                }
                else {
                    response.status(200).json({});
                }
            })
    });


module.exports = router;
