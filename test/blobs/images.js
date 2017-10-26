/**
 * Created by pablo on 7/7/17.
 */
const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
const async = require('async');
const fs = require("fs");
const validator = require('validator');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// DB
let user = require('api/models/users/user');
let image = require('api/models/blobs/images');
const endpoint = '/api/v1/images';

let token = "";
let userid = "";
let clientid = "";
let imageId = "";

let adminToken = "";
let adminUserId = "";
let adminClientId = "";
let adminImageId = "";

const fakeObjectId = "590c5df8f7145e88b3c498a9";
let imageFile = fs.readFileSync("test/blobs/images/develapps.png");
let adminImageFile = fs.readFileSync("test/blobs/images/develapps2.png");


describe.skip('Images Group', () => {
    // create users and clients
    before(function (done) {
        commonTestInit.before(function () {
            user.remove({}, (err) => {
                should.not.exist(err);
                async.series(
                    [
                        function (callback) {
                            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (user) {
                                adminToken = user.token;
                                adminUserId = user.user;
                                callback(null, 'result');
                            });
                        },
                        function (callback) {
                            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.userOne, function (user) {
                                token = user.token;
                                userid = user.user;
                                callback(null, 'result');
                            });
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
            image.remove({}, (err) => {
                should.not.exist(err);
                commonTestInit.after();
                done();
            })
        });
    });

    describe('POST', () => {
        afterEach((done) => { //After each test we empty the database
            image.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        describe('images with no Authorization header', () => {
            it('should fail with 401 unauthenticated', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .set("Content-Type", "multipart/form")
                    .attach("file", imageFile, "file.test")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
        });
        describe('images with non admin user', () => {
            it('should success to self user with 201 created', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .set("Authorization", "Bearer " + token)
                    .set("Content-Type", "multipart/form")
                    .attach("file", imageFile, "file.png")
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.body.should.be.an('object');
                        let keys = [
                            "__v",
                            "_id",
                            "apiVersion",
                            "owner",
                            "contentType",
                            "md5",
                            "s3",
                        ];
                        res.body.should.contain.all.keys(keys);
                        res.body.s3.should.contain.all.keys('identifier', 'url');
                        chai.expect(validator.isURL(res.body.s3.url)).to.be.true;
                        done();
                    });
            });
        });
        describe('images with admin user', () => {
            const tests = [
                {'md5': 'falseMD5$'},
            ];
            tests.forEach(function (parameters) {
                it('should fail with 400 with parameters ' + JSON.stringify(parameters), (done) => {
                    let key = Object.keys(parameters)[0];
                    let value = parameters[key];
                    chai.request(server)
                        .post(endpoint)
                        .set("Authorization", "Bearer " + adminToken)
                        .attach("file", imageFile, "file.png")
                        .field(key, value)
                        .set("Content-Type", "multipart/form")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            });
                        });
                });
            });
            it('should fail with 400 without file', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .set("Authorization", "Bearer " + adminToken)
                    .field("md5", "valid")
                    .set("Content-Type", "multipart/form")
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
        });
    });
    describe('GET', () => {
        beforeEach((done) => {
            const aFile = imageFile;
            const anAdminFile = adminImageFile;
            commonTestUtils.test_createImage(server,token, aFile, function (objectId) {
                imageId = objectId;
                commonTestUtils.test_createImage(server,adminToken, anAdminFile, function (objectId) {
                    adminImageId = objectId;
                    done();
                });
            });
        });
        describe('images/ list', () => {
            describe('images/ with no Authorization header', () => {
                it('should fail with 401 unauthorized', (done) => {
                    chai.request(server)
                        .get(endpoint)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(401);
                            done();
                        });
                });
            });
            describe('images/ with admin user', () => {
                it('should success with image data', function (done) {
                    chai.request(server)
                        .get(endpoint)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                done();
                            });
                        });
                });
            });
        });
        describe('images/id', () => {
            describe('images/id', () => {
                it('should success for admin', function (done) {
                    chai.request(server)
                        .get(endpoint + '/' + adminImageId)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'owner', 'contentType', 'md5', 's3', 'apiVersion');
                            done();
                        });
                });
                it('should success for non admin on its owner', function (done) {
                    chai.request(server)
                        .get(endpoint + '/' + imageId)
                        .set("Authorization", "Bearer " + token)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'owner', 'contentType', 'md5', 's3', 'apiVersion');
                            done();
                        });
                });
                it('should fail for bad id with 400', function (done) {
                    chai.request(server)
                        .get(endpoint + '/' + 'very-bad-image-id')
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })

                        });
                });
                it('should fail for non existing section id with 404', function (done) {
                    chai.request(server)
                        .get(endpoint + '/' + fakeObjectId)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })

                        });
                });
            });
        });
    });
    describe('DELETE', function () {

        beforeEach((done) => {
            image.remove({}, (err) => {
                should.not.exist(err);
                const aFile = imageFile;
                const anAdminFile = adminImageFile;
                commonTestUtils.test_createImage(server,token, aFile, function (objectId) {
                    imageId = objectId;
                    commonTestUtils.test_createImage(server,adminToken, anAdminFile, function (objectId) {
                        adminImageId = objectId;
                        done();
                    });
                });
            });
        });

        describe('image/id', () => {
            it('should succeed for admin', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + adminImageId)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        done();
                    });
            });

            it('should fail for bad id with 400', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + 'very-bad-image-id')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for bad owner id with 404', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + fakeObjectId)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })

                    });
            });
            it('should success for non admin on its owner', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + imageId)
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        done();
                    });
            });
        });
    });
})
;
