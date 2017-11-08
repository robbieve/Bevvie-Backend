let s3 = require("lib/blobs/s3_blobs");
let fs = require("fs");
let async = require("async");
const md5 = require('md5');
const config = require('config').aws;
let path = require('path');
let basedir = "bootstrap/bevvie/data/images/upload";
let winston = require('lib/loggers/logger').winston;
let s3Files = {};
let glob = require( 'glob' );
let imageModel = require('api/models/blobs/images');
let maxThreads = 10;
let cache = {

};

function _loadImage(file, cb) {
    let baseName = path.basename(file, '.png').replace(/[\u0303]/gi, 'N');
    async.waterfall(
        [
            // TASK1: Upload to S3
            function (callback) {

                fs.readFile(file, function (err, data) {
                    winston.info("Loading image " + baseName);

                    if (err) return cb(err);
                    let identifier = md5(data);
                    // s3file : { Key, Body, encoding, ContentType,  ACL }

                    // Check if object already uploaded at this session
                    if (cache[identifier]){
                        winston.info("Already read image " + identifier);
                        return callback(null, cache[identifier])
                    }


                    // Check if the object exists
                    let s3file = {
                        Key: identifier,
                    };
                    s3.s3_object_info(s3file,function (err, info) {
                        if (err && err.statusCode !== 404) {
                            return callback(err,null)
                        }
                        s3file = {
                            ACL: 'public-read',
                            Key: identifier,
                            Body: data,
                            ContentType: "image/png",
                            StorageClass: "REDUCED_REDUNDANCY",
                            Metadata: {
                                filename: baseName,
                            }
                        };
                        if (info) {
                            winston.info("Image exists " + baseName);
                            cache[identifier] = {
                                identifier: identifier,
                                location: 'https://' + config.s3.bucket + '.s3.amazonaws.com/' + identifier
                            };
                            return callback(null, {
                                identifier: identifier,
                                location: 'https://' + config.s3.bucket + '.s3.amazonaws.com/' + identifier
                            })
                        }
                        let timer = winston.startTimer();
                        s3.upload_to_s3(s3file, function (err, res) {
                            if (err) {
                                callback(err, null)
                            }
                            else {
                                timer.done("Uploaded " + baseName + " time");
                                cache[identifier] = {location: res.Location, identifier: identifier};
                                callback(null, {location: res.Location, identifier: identifier});
                            }
                        });
                    })


                });
            },
            // TASK2: Create the new model
            function (fileData, callback) {
                let image = {};
                image.imageName = baseName;
                image.placeholderName = "placeholderbevvie";
                image.md5 = fileData.identifier;
                image.contentType = 'image/png';
                image.s3 = {};
                image.s3.identifier = fileData.identifier;
                image.s3.url = fileData.location;
                image.owner = "->AdminUser.admin";
                let noPointsBase = baseName.replace(/\./g, "_").replace(/[\u0303]/g, 'N');
                s3Files[noPointsBase] = image;
                callback(null, image)
            }
        ],
        function (err, res) {
            async.setImmediate(function() {
                if (err) {
                    return cb(err)
                }
                else {
                    return cb(null, res)
                }
            })
        })
}


function _getImages(cb) {
    glob( basedir+'/**/*.png', cb);
}

module.exports.loadImages = function (cb) {
    let timer = winston.startTimer();
    _getImages(function (err, files) {
        if (err) return cb(err);
        let processed = 0;
        async.eachLimit(files, maxThreads, function (element,done) {
            _loadImage(element, function (err, result) {
                processed++;
                winston.info(`Processed ${processed}/${files.length}`);
                async.setImmediate(function() {
                    done(err, result)
                })
            })
        }, function (err) {
            /*

            {
                "images": {
                "_model": "Image",
                    "develapps": {
                    "imageName": "develapps",
                        "contentType":"image/png",
                        "md5":"fakeMD5",
                        "client":"->clients.bevvie"
                }
            }
            }
            *
            * */
            if (err) return cb(err);
            let images = {
                "images": {
                    "_model": "Image"
                }
            };
            Object.assign(images.images, s3Files);
            timer.done("Uploaded all images time");
            cb(err,images)
        })
    })
};