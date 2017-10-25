/**
 * Created by pablo on 6/7/17.
 */
const AWS = require('aws-sdk');
const config = require('config').aws;
const accessKeyId =  process.env.PM2_AWS_ACCESS_KEY || config.accessKeyId;
const secretAccessKey = process.env.PM2_AWS_SECRET_KEY || config.secretAccessKey;
AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey
});
module.exports = AWS;
