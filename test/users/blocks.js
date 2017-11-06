const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
let moment = require('moment');
let async = require('async');
let fs = require('fs');

// User
let user = require('api/models/users/user');
let blocks = require('api/models/users/block');

const endpoint = '/api/v1/blocks';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let adminId = "";
let adminToken = "";

let develappsBlock = {};
let develappsBlockTwo = {};

describe('Blocks Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        async.series([
                function (doneFunc) {
                    commonTestInit.before(function () {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    commonTestUtils.testBuild_createUsersAndVenues(server, null, function (res) {
                        adminId = res.admin.user._id;
                        adminToken = res.admin.token;
                        clientId = res.userOne.user._id;
                        clientIdTwo = res.userTwo.user._id;

                        clientToken = res.userOne.token;
                        develappsBlock = {
                            userBlocks: clientId,
                            userBlocked: clientIdTwo
                        };

                        doneFunc();
                    });
                }],
            function (err) {
                should.not.exist(err);
                done();
            });
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            blocks.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            blocks.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should succeed for good values', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(develappsBlock)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.contain.all.keys('_id', 'userBlocks', 'userBlocked');
                    done();
                });
        });

        it('should fail for bad UserId', (done) => {
            let block = JSON.parse(JSON.stringify(develappsBlock));
            block.userBlocks = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(block)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should fail for bad UserId blocked', (done) => {
            let block = JSON.parse(JSON.stringify(develappsBlock));
            block.userBlocked = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(block)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
    });
    describe('GET', () => {
        before((done) => { //Before each test create the object
            blocks.remove({}, (err) => {
                develappsBlock = {
                    userBlocks: clientId,
                    userBlocked: clientIdTwo
                };
                develappsBlockTwo = {
                    userBlocks: clientIdTwo,
                    userBlocked: clientId
                };
                commonTestUtils.test_createBlock(server, adminToken, develappsBlock, function (realBlock) {
                    develappsBlock = realBlock;
                    commonTestUtils.test_createBlock(server, adminToken, develappsBlockTwo, function (realBlock) {
                        develappsBlockTwo = realBlock;
                        done();
                    });
                });
            });
        });
        describe('blocks/', () => {
            it('should fail with no auth header', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should succeed with client token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with admin token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });

            it('should succeed with userBlocks', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userBlocks': develappsBlock.userBlocks})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].userBlocks._id.should.equal(develappsBlock.userBlocks);
                            done();
                        });
                    });
            });
            it('should succeed with userBlocked', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userBlocked': develappsBlock.userBlocked})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].userBlocked._id.should.equal(develappsBlock.userBlocked);
                            done();
                        });
                    });
            });


        });
        describe('blocks/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsBlock._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'userBlocks', 'userBlocked');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsBlock._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'userBlocks', 'userBlocked');
                        done();
                    });
            });
            it('should fail for bad id with 400', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + 'bad--id')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for non existing block id with 404', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + "59ce0578f418c80bde508890")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })

                    });
            });
        });
    });
    describe('DELETE', function () {
        beforeEach((done) => { //Before each test create the object
            blocks.remove({}, (err) => {
                develappsBlock = {
                    userBlocks: clientId,
                    userBlocked: clientIdTwo
                };
                develappsBlockTwo = {
                    userBlocks: clientIdTwo,
                    userBlocked: clientId
                };
                commonTestUtils.test_createBlock(server, adminToken, develappsBlock, function (realBlock) {
                    develappsBlock = realBlock;
                    commonTestUtils.test_createBlock(server, adminToken, develappsBlockTwo, function (realBlock) {
                        develappsBlockTwo = realBlock;
                        done();
                    });
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsBlock._id)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should succeed for client', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsBlock._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for client on other`s block', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsBlockTwo._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for bad id with 400', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + 'bad-id')
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    })

                });
        });
        it('should fail for bad client id with 404', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + "59ce0742e8ae010c38c73f9f")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })

                });
        });

    });
});