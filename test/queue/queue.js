const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
const async = require('async');
const fs = require("fs");
const config = require("config");

let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let winston = require('lib/loggers/logger').winston;
// DB
let user = require('api/models/users/user');
let kue = require('lib/queue/queue');
const endpoint = '/api/v1/section';

const pjson = require('package.json');

let prefix = pjson.name + ':' + process.env.NODE_ENV;

let token = "";
let userid = "";
let clientid = "";
let catalogId = "";
let adminToken = "";
let adminUserId = "";
let adminClientId = "";
let adminCatalogId = "";
let adminSectionId = "";

let dataversionId = "";
let adminDataVersionId = "";

let fakeObjectId = "590c5df8f7145e88b3c498a9";
require('lib/queue/queues/testQueue')(kue);

describe('Queue Group', () => {
    // create users and clients
    before(function (done) {
        commonTestInit.before(function () {
            // Register queues (only after redis is connected)
            user.remove({}, (err) => {
                should.not.exist(err);
                async.series(
                    [
                        function (callback) {
                            kue.cleanupQueue(callback)
                        }
                    ], function (err, results) {
                        done()
                    });
            });
        });
    });

    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            should.not.exist(err);
            commonTestInit.after();
            done();
        });
    });

    describe('Create Jobs', () => {
        describe('directly on queue', () => {
            // noinspection NodeModulesDependencies
            it('should succeed', function (done) {
                let job = kue.createJob("test", {title: "This is a test", data: "other data"});
                job.on('complete', function (result) {
                    done();
                }).on('failed', function (errorMessage) {
                    should.not.exist(errorMessage);
                    done()
                }).save();
            });
        });
        describe('to send mail on queue', () => {
            it('should succeed', function (done) {
                let job = kue.createJob("email", {
                    title: "This is a test",
                    message: {

                        // sender info
                        from: config.nodemailer.mailfrom,

                        // Comma separated list of recipients
                        to: '"Development Develapps" <development@develapps.es>',

                        // Subject of the message
                        subject: config.nodemailer.subject_prefix + 'Testing 😀🤘✌️',

                        // plaintext body
                        text: 'Hola nene!, aquí tu cola',

                        // HTML body
                        html: '<p><b>Hola</b> Nene<img src="cid:note@node"/></p>' +
                        '<p>Esto es un texto HTML<br/></p>'
                    }
                });
                job.on('complete', function (result) {
                    done();
                }).on('failed', function (errorMessage) {
                    should.not.exist(errorMessage);
                    done()
                }).attempts(3).backoff({type: 'exponential'}).save()
            });
            it('should fail with no message', function (done) {
                let job = kue.createJob("email", {
                    title: "This is a test",
                });

                job.on('complete', function (result) {
                    should.not.exist(result);
                    done();
                }).on('failed attempt', function (errorMessage) {

                }).on('failed', function (errorMessage) {
                    should.exist(errorMessage);
                    done()
                }).attempts(3).backoff(true).save();
            });
        });

    });
});
