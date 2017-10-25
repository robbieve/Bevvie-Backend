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
let file = require('api/models/blobs/files');
const endpoint = '/api/v1/files';

let token = "";
let userid = "";
let clientid = "";
let fileId = "";

let adminToken = "";
let adminUserId = "";
let adminClientId = "";
let adminFileId = "";

const fakeObjectId = "590c5df8f7145e88b3c498a9";
let aFile = fs.readFileSync("test/blobs/files/develapps.pdf");
let adminAFile = fs.readFileSync("test/blobs/files/develapps2.pdf");


describe.skip('Files Group', () => {
    // create users and clients
    before(function (done) {
        commonTestInit.before(function () {
            user.remove({}, (err) => {
                should.not.exist(err);
                async.series(
                    [
                        function (callback) {
                            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (aToken, aUserid) {
                                adminToken = aToken;
                                adminUserId = aUserid;
                                callback(null, 'result');
                            });
                        },
                        function (callback) {
                            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.potentialClient, function (aToken, adUserid) {
                                token = aToken;
                                userid = adUserid;
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
            file.remove({}, (err) => {
                should.not.exist(err);
                commonTestInit.after();
                done();
            })
        });
    });

    describe('POST', () => {
        afterEach((done) => { //After each test we empty the database
            file.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        describe('files with no Authorization header', () => {
            it('should fail with 401 unauthenticated', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .set("Content-Type", "multipart/form")
                    .attach("file", aFile, "file.test")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
        });
        describe('files with non admin user', () => {
            it('should succeed to self user with 201 created', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .set("Authorization", "Bearer " + token)
                    .set("Content-Type", "multipart/form")
                    .attach("file", aFile, "file.pdf")
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
        describe('files with admin user', () => {
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
                        .attach("file", aFile, "file.pdf")
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
            const otherFile = aFile;
            const anAdminFile = adminAFile;
            commonTestUtils.test_createFile(server, token, otherFile, "file.pdf", function (objectId) {
                fileId = objectId;
                commonTestUtils.test_createFile(server, adminToken, anAdminFile, "file.pdf", function (objectId) {
                    adminFileId = objectId;
                    done();
                });
            });
        });
        describe('files/ list', () => {
            describe('files/ with no Authorization header', () => {
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
            describe('files/ with admin user', () => {
                it('should success with file data', function (done) {
                    chai.request(server)
                        .get(endpoint)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(1);
                                done();
                            });
                        });
                });
            });
        });
        describe('files/id', () => {
            describe('files/id', () => {
                it('should success for admin', function (done) {
                    chai.request(server)
                        .get(endpoint + '/' + adminFileId)
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
                        .get(endpoint + '/' + fileId)
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
                        .get(endpoint + '/' + 'very-bad-file-id')
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
            file.remove({}, (err) => {
                should.not.exist(err);
                const otherFile = aFile;
                const anAdminFile = adminAFile;
                commonTestUtils.test_createFile(server, token, otherFile, "file.pdf", function (objectId) {
                    fileId = objectId;
                    commonTestUtils.test_createFile(server, adminToken, anAdminFile, "file.pdf", function (objectId) {
                        adminFileId = objectId;
                        done();
                    });
                });
            });
        });

        describe('file/id', () => {
            it('should succeed for admin', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + adminFileId)
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
                    .delete(endpoint + '/' + 'very-bad-file-id')
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
                    .delete(endpoint + '/' + fileId)
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
});
