/**
 * Created by pablo on 6/7/17.
 */
let aws = require('../aws/aws_config');
const s3 = new aws.S3();
const config = require('config').aws;
const randomstring = require("randomstring");

// file : { filename, bucketName, encoding, mimetype, extension, size, truncated, buffer,  ACL }

/*
*
* Uploads a file to S3
*
* SAMPLE
*
* .post(uploadInMemory.single('file'), function (request, response, next) {

 // Upload to s3

 let stream = str.createReadStream(request.file.buffer)
 let identifier = md5(stream)
 // s3file : { Key, Body, encoding, ContentType,  ACL }
 let s3file = {
 ACL: 'public-read',
 Key: identifier,
 Body: stream,
 ContentType: request.file.mimetype
 }

 s3.upload_to_s3(s3file, function (err, res) {
 if (err) {
 response.status(500).json({'localizedError': 'There was an error saving the data: ' + err})
 }
 else {
 response.status(201).json({'id': s3file.Key, url: res.Location})
 }
 })
* */
exports.upload_to_s3 = function upload_to_s3(file,callback)
{
    let bucketName = file.Bucket || config.s3.bucket;
    // noinspection UnnecessaryLocalVariableJS
    var modified_file = file;
    modified_file.Bucket = bucketName;
    /* http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property */
    s3.upload(file, callback);
};

/*
*
* Removes an object from S3
*
* SAMPLE
*
*  .delete(function (request, response) {
 var options = {
 filename: request.params.identifier,
 root: 'images',// Gridfs bucket
 };
 let s3file = {
 Key: request.params.identifier,
 }

 s3.remove_from_s3(s3file, function (err, res) {
 if (err) {
 response.status(500).json({'localizedError': 'There was an error deleting the data: ' + err})
 }
 else {
 response.status(200).json({'id': s3file.Key, url: res})
 }
 })


 })
*
* */
exports.remove_from_s3 = function remove_from_s3(file,callback)
{
    let bucketName = file.Bucket || config.s3.bucket;
    let modified_file = file;
    modified_file.Bucket = bucketName;
    /* http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property */
    s3.deleteObject(modified_file, callback);
};

/* Pass options
* options:
*   - Bucket: OPTIONAL: the bucket
*   - Key: the name for the file
*   - Expires: expiration time in seconds
*
*   SAMPLE
*  get(function (request, response) {

 // Get an authenticated url for S3

 // s3file : { Bucket, Bucket, Expires }

 let s3file = {
 // Key: request.params.identifier, You can pass options if you wish
 "ContentType": "image/png"
 }

 s3.get_upload_s3_url(s3file,function (err,res) {
 if (err){
 response.status(500).json({'localizedError':'There was an error saving the data: ' + err})
 }
 else{
 response.status(201).json({'file':s3file.Key, 'oid':JSON.stringify(s3file) ,response: res})
 }
 })
*   */
exports.get_upload_s3_url = function (options = {}, callback) {
    let params = options;
    let bucketName = options.Bucket || config.s3.bucket;
    let expires = options.Expires || 900;
    let identifier = options.key || randomstring.generate();
    params.Bucket = bucketName;
    params.Key = identifier;
    params.Expires = expires;
    s3.getSignedUrl('putObject', params, callback);
};

/*
* Return head of a file.
*
* Can be used to check for an object
*
* */
exports.s3_object_info = function (options = {}, callback) {
    let params = options;
    let bucketName = options.Bucket || config.s3.bucket;
    let Key = options.Key;
    if (Key == undefined){
        return callback('no key passed',null)
    }
    params.Bucket = bucketName;
    params.Key = Key;
    s3.headObject(params, callback);
};