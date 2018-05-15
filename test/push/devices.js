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
let devices = require('api/models/push/device');

const endpoint = '/api/v1/devices';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let adminId = "";
let adminToken = "";

let develappsDevice = commonTestUtils.devices.deviceOne;
let develappsDeviceTwo = commonTestUtils.devices.deviceTwo;

describe('Devices Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        async.series([
                function (doneFunc) {
                    commonTestInit.before(function () {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    commonTestUtils.testBuild_createAdminUserAndClients(server, null, function (res) {
                        adminId = res.admin.user._id;
                        adminToken = res.admin.token;
                        clientId = res.userOne.user._id;
                        clientIdTwo = res.userTwo.user._id;
                        clientToken = res.userOne.token;
                        commonTestUtils.devices.deviceOne.user = clientId;
                        commonTestUtils.devices.deviceTwo.user = clientIdTwo;
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
            devices.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', function() {
        beforeEach((done) => { //Before each test we empty the database
            devices.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should succeed for good values', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(develappsDevice)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.contain.all.keys('_id', 'pushToken', 'user');
                    done();
                });
        });

        it('should fail for bad UserId', (done) => {
            let device = JSON.parse(JSON.stringify(develappsDevice));
            device.user = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(device)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should fail for bad pushToken', (done) => {
            let device = JSON.parse(JSON.stringify(develappsDevice));
            delete device.pushToken;
            chai.request(server)
                .post(endpoint)
                .send(device)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should succedd for duplicate pushToken', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(develappsDevice)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.contain.all.keys('_id', 'pushToken', 'user');
                    chai.request(server)
                        .post(endpoint)
                        .send(develappsDevice)
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('_id', 'pushToken', 'user');

                            done();
                        });
                });
        });
    });
    describe('GET', () => {
        before((done) => { //Before each test create the object
            devices.remove({}, (err) => {
                should.not.exist(err);
                let device = JSON.parse(JSON.stringify(develappsDevice));
                delete device._id;
                commonTestUtils.test_createDevice(server, adminToken, device, function (realDevice) {
                    develappsDevice = realDevice;
                    device = JSON.parse(JSON.stringify(develappsDeviceTwo));
                    delete device._id;
                    commonTestUtils.test_createDevice(server, adminToken, device, function (realDevice) {
                        develappsDeviceTwo = realDevice;
                        done();
                    });
                });
            });
        });
        describe('devices/', () => {
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

            it('should succeed with userDevices', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'user': develappsDevice.user})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].user._id.should.equal(develappsDevice.user);
                            done();
                        });
                    });
            });

        });
        describe('devices/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsDevice._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'pushToken', 'user');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsDevice._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'pushToken', 'user');
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
            it('should fail for non existing device id with 404', function (done) {
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
            devices.remove({}, (err) => {
                should.not.exist(err);
                let device = JSON.parse(JSON.stringify(develappsDevice));
                delete device._id;
                commonTestUtils.test_createDevice(server, adminToken, device, function (realDevice) {
                    develappsDevice = realDevice;
                    device = JSON.parse(JSON.stringify(develappsDeviceTwo));
                    delete device._id;
                    commonTestUtils.test_createDevice(server, adminToken, device, function (realDevice) {
                        develappsDeviceTwo = realDevice;
                        done();
                    });
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsDevice._id)
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
                .delete(endpoint + '/' + develappsDevice._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for client on other`s device', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsDeviceTwo._id)
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