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
let venues = require('api/models/venues/venue');

const endpoint = '/api/v1/venues';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo;
let clientToken = "";
let adminId = "";
let adminToken = "";

let venue = {};
let testDictionary = {
    Venue: {
        good: commonTestUtils.venueConstants.venueDevelapps,
        goodVariants: {
            name: [5, "otro"],
            location: [{type: "Point", coordinates: [0, 0]}, undefined],
            radius: [undefined, 300, 30.4],
            schedule: [
                [{
                    weekday: 1,
                    openTime: moment("12:00", "HH:mm"),
                    closeTime: moment("13:00", "HH:mm")
                }]
                , undefined],
        },
        bad: {
            location: [{type: "Pepe", coordinates: [0, 0]}, {coordinates: "badCoordinates"}],
            radius: ["notAValidRadius"],
            schedule: [
                [{openTime: moment("12:00", "HH:mm"), closeTime: moment("13:00", "HH:mm")}],
                [{weekday: 1, closeTime: moment("13:00", "HH:mm")}],
                [{weekday: 1, openTime: moment("12:00", "HH:mm")}],
            ],
        }
    }
};


describe('Venues Group', () => {
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
                    doneFunc();
                });
            },
        ], function (err) {
            should.not.exist(err);
            done();
        });
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            venues.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            venues.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should fail for non admin', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(commonTestUtils.venueConstants.Venue)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    });
                });
        });
        Object.keys(testDictionary).forEach(function (variants) {
            let goodArguments = testDictionary[variants]["good"];
            let goodArgumentsVariants = testDictionary[variants]["goodVariants"];
            let badArguments = testDictionary[variants]["bad"];
            describe('venues/ with ' + variants + ' arguments', () => {
                Object.keys(goodArgumentsVariants).forEach(function (goodKey) {
                    let goodValues = goodArgumentsVariants[goodKey];
                    goodValues.forEach(function (goodValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[goodKey] = goodValue;
                        it('should success for good ' + goodKey + ' value ' + JSON.stringify(goodValue), (done) => {
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
                                .set("Content-Type", "application/json")
                                .set("Authorization", "Bearer " + adminToken)
                                .end(function (err, res) {
                                    res.should.have.status(201);
                                    res.should.be.json;
                                    res.body.should.be.an('object');
                                    res.body.should.have.property('_id');
                                    res.body.should.have.property('name');
                                    done();
                                });
                        });
                    });
                });
                Object.keys(badArguments).forEach(function (badKey) {
                    let badValues = badArguments[badKey];
                    badValues.forEach(function (badValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[badKey] = badValue;
                        it('should fail for bad ' + badKey + ' value ' + JSON.stringify(badValue), (done) => {
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
                                .set("Content-Type", "application/json")
                                .set("Authorization", "Bearer " + adminToken)
                                .end(function (err, res) {
                                    commonTestUtils.test_error(400, err, res, function () {
                                        done();
                                    });
                                });
                        });
                    });
                });
            });
        });
    });
    describe('GET', () => {
        let venueDevelapps;
        let imageFile = fs.readFileSync("test/blobs/images/develapps.png");
        let adminImageFile = fs.readFileSync("test/blobs/images/develapps2.png");
        let imageId, imageIdTwo;


        const checkins = require("api/models/checkins/checkin");
        before((done) => { //Before each test create the object
            checkins.remove({}, (err) => {
                venues.remove({}, (err) => {
                    const aFile = imageFile;
                    const anAdminFile = adminImageFile;
                    commonTestUtils.test_createImage(server, adminToken, aFile, function (objectId) {
                        imageId = objectId;
                        commonTestUtils.test_createImage(server, adminToken, anAdminFile, function (objectId) {
                            imageIdTwo = objectId;
                            let avenue = JSON.parse(JSON.stringify(commonTestUtils.venueConstants.venueDevelapps));
                            avenue.image = imageId;
                            commonTestUtils.test_createVenue(server, adminToken, avenue, function (realVenue) {
                                venue = realVenue;
                                venueDevelapps = realVenue;
                                let inactive = JSON.parse(JSON.stringify(venue));
                                delete inactive._id;
                                inactive.active = false;
                                commonTestUtils.test_createVenue(server, adminToken, inactive, function (realVenue) {
                                    let avenue = JSON.parse(JSON.stringify(commonTestUtils.venueConstants.venueBolos));
                                    avenue.image = imageIdTwo;
                                    commonTestUtils.test_createVenue(server, adminToken, avenue, function (realVenue) {
                                        done();
                                    });
                                });

                            });
                        });
                    });
                });
            });
        });
        describe('venues/', () => {
            it('should fail with no auth header', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should succeed with auth token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with images', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            res.body.docs[0].should.contain.all.keys('_id', 'name', 'apiVersion', 'image');
                            done();
                        });
                    });
            });
            it('should succeed with inactive venues data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': false})
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with all venues data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': "all"})
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(3);
                            done();
                        });
                    });
            });
            it('should succeed with venue name', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'name': 'easant'})
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with geoloc', function (done) {
                venues.collection.createIndex({'location': '2dsphere'}, {name: 'locationIndex'},
                    function (err) {
                        should.not.exist(err);
                        chai.request(server)
                            .get(endpoint)
                            .query({'geo': {long: 0, lat: 40, dist: 300000}})
                            .set("register-token", configAuth.baseToken)
                            .end(function (err, res) {
                                should.not.exist(err);
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                done();
                            });
                    });
            });
            it('should succeed with geoloc and images', (done) => {
                venues.collection.createIndex({'location': '2dsphere'}, {name: 'locationIndex'},
                    function (err) {
                        should.not.exist(err);
                        chai.request(server)
                            .get(endpoint)
                            .set("Content-Type", "application/json")
                            .set("register-token", configAuth.baseToken)
                            .query({'geo': {long: 0, lat: 40, dist: 300000}})
                            .end(function (err, res) {
                                should.not.exist(err);
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                res.body.docs[0].should.contain.all.keys('_id', 'name', 'apiVersion', 'image');
                                res.body.docs[0].image.should.contain.all.keys('_id', 's3');
                                done();
                            });
                    });
            });
            it('should succeed with geoloc and checkins', function (done) {
                venues.collection.createIndex({'location': '2dsphere'}, {name: 'locationIndex'},
                    function (err) {
                        should.not.exist(err);
                        commonTestUtils.test_createCheckin(server, adminToken, {
                            user: clientId,
                            venue: venueDevelapps._id
                        }, function (venue) {
                            should.exist(venue);
                            chai.request(server)
                                .get(endpoint)
                                .query({'geo': {long: 0, lat: 40, dist: 300000}})
                                .set("register-token", configAuth.baseToken)
                                .end(function (err, res) {
                                    should.not.exist(err);
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    should.exist(res.body.docs[0].checkins);
                                    res.body.docs[0].checkins.should.equal(1);
                                    done();
                                });
                        });
                    });
            });
            it('should succeed with closer distance', function (done) {
                venues.collection.createIndex({'location': '2dsphere'}, {name: 'locationIndex'},
                    function (err) {
                        should.not.exist(err);
                        chai.request(server)
                            .get(endpoint)
                            .query({'geo': {long: 0, lat: 40, dist: 66800}})
                            .set("register-token", configAuth.baseToken)
                            .end(function (err, res) {
                                should.not.exist(err);
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(1);
                                done();
                            });
                    });
            });
        });
        describe('venues/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + venue._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should succeed for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + venue._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
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
            it('should fail for non existing venue id with 404', function (done) {
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
            venues.remove({}, (err) => {
                commonTestUtils.test_createVenue(server, adminToken, commonTestUtils.venueConstants.venueDevelapps, function (realVenue) {
                    venue = realVenue;
                    done();
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + venue._id)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for client', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + venue._id)
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