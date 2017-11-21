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
let checkins = require('api/models/checkins/checkin');
let venues = require('api/models/venues/venue');

const endpoint = '/api/v1/checkins';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let adminId = "";
let adminToken = "";
let venueDevelapps = "";
let venueBolos = "";

let develappsCheckin = {};
let bolosCheckin = {};
let develappsCheckinTwo = {};

describe('Checkins Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        async.series([
                function (doneFunc) {
                    commonTestInit.before(function () {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    commonTestUtils.testBuild_createUsersVenuesAndImages(server, null, function (res) {
                        adminId = res.admin.user._id;
                        adminToken = res.admin.token;
                        clientId = res.userOne.user._id;
                        clientIdTwo = res.userTwo.user._id;

                        clientToken = res.userOne.token;
                        venueDevelapps = res.venueDevelapps;
                        venueBolos = res.venueBolos;
                        develappsCheckin = {
                            user: clientId,
                            venue: venueDevelapps._id
                        };
                        bolosCheckin = {
                            user: clientId,
                            venue: venueBolos._id
                        };
                        develappsCheckinTwo = {
                            user: clientIdTwo,
                            venue: venueDevelapps._id
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
            checkins.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            checkins.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should succeed for good values', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(develappsCheckin)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('_id');
                    res.body.should.have.property('user');
                    res.body.should.have.property('venue');
                    done();
                });
        });

        it('should fail for bad UserId', (done) => {
            let checkIn = JSON.parse(JSON.stringify(develappsCheckin));
            checkIn.user = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(checkIn)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should fail for bad venue', (done) => {
            let checkIn = JSON.parse(JSON.stringify(develappsCheckin));
            checkIn.venue = "very-bad-venue-id";
            chai.request(server)
                .post(endpoint)
                .send(checkIn)
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
            checkins.remove({}, (err) => {
                develappsCheckin = {
                    user: clientId,
                    venue: venueDevelapps._id
                };
                bolosCheckin = {
                    user: clientId,
                    venue: venueBolos._id
                };
                develappsCheckinTwo = {
                    user: clientIdTwo,
                    venue: venueDevelapps._id
                };
                commonTestUtils.test_createCheckin(server, adminToken, develappsCheckin, function (realCheckin) {
                    develappsCheckin = realCheckin;
                    commonTestUtils.test_createCheckin(server, adminToken, bolosCheckin, function (realCheckin) {
                        bolosCheckin = realCheckin;
                        commonTestUtils.test_createCheckin(server, adminToken, develappsCheckinTwo, function (realCheckin) {
                            develappsCheckinTwo = realCheckin;
                            done();
                        });
                    });
                });
            });
        });
        describe('checkins/', () => {
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
                            res.body.docs.should.have.lengthOf(3);
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
                            res.body.docs.should.have.lengthOf(3);
                            done();
                        });
                    });
            });

            it('should succeed with all checkins data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': "all"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(3);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id and maxAge', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id, 'maxAge': 21})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id and minAge', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id, 'minAge': 30})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id and minAge and maxAge', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id, 'minAge': 30, 'maxAge': 34})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(0);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id and minAge and maxAge including max', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id, 'minAge': 30, 'maxAge': 40})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with checkin venue id and minAge and maxAge including min', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'venue': venueDevelapps._id, 'minAge': 20, 'maxAge': 30})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with userid', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'user': clientIdTwo})
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
        describe('checkins/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsCheckin._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'venue', 'user', 'apiVersion');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsCheckin._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'venue', 'user', 'apiVersion');
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
            it('should fail for non existing checkin id with 404', function (done) {
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
            checkins.remove({}, (err) => {
                develappsCheckin = {
                    user: clientId,
                    venue: venueDevelapps._id
                };
                commonTestUtils.test_createCheckin(server, adminToken, develappsCheckin, function (realCheckin) {
                    develappsCheckin= realCheckin;
                    bolosCheckin = {
                        user: clientIdTwo,
                        venue: venueBolos._id
                    };
                    commonTestUtils.test_createCheckin(server, adminToken, bolosCheckin, function (realCheckin) {
                        bolosCheckin= realCheckin;
                        done();
                    });
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsCheckin._id)
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
                .delete(endpoint + '/' + develappsCheckin._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for client on other`s checkin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + bolosCheckin._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for bad id with 400', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + 'bad-product-id')
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