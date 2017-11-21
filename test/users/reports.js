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
let reports = require('api/models/users/report');

const endpoint = '/api/v1/reports';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let adminId = "";
let adminToken = "";

let develappsReport = {};
let develappsReportTwo = {};

describe('Reports Group', () => {
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
                        develappsReport = {
                            userReports: clientId,
                            userReported: clientIdTwo,
                            reason: "A good reason to report"
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
            reports.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            reports.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should succeed for good values', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(develappsReport)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.contain.all.keys('_id', 'userReports', 'userReported');
                    done();
                });
        });

        it('should fail for bad UserId', (done) => {
            let report = JSON.parse(JSON.stringify(develappsReport));
            report.userReports = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(report)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should fail for bad UserId reported', (done) => {
            let report = JSON.parse(JSON.stringify(develappsReport));
            report.userReported = "bad-user-id";
            chai.request(server)
                .post(endpoint)
                .send(report)
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
            reports.remove({}, (err) => {
                develappsReport = {
                    userReports: clientId,
                    userReported: clientIdTwo,
                    reason: "a valid reason"
                };
                develappsReportTwo = {
                    userReports: clientIdTwo,
                    userReported: clientId,
                    reason: "a valid reason"
                };
                commonTestUtils.test_createReport(server, adminToken, develappsReport, function (realReport) {
                    develappsReport = realReport;
                    commonTestUtils.test_createReport(server, adminToken, develappsReportTwo, function (realReport) {
                        develappsReportTwo = realReport;
                        done();
                    });
                });
            });
        });
        describe('reports/', () => {
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

            it('should succeed with userReports', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userReports': develappsReport.userReports})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].userReports._id.should.equal(develappsReport.userReports);
                            done();
                        });
                    });
            });
            it('should succeed with userReported', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userReported': develappsReport.userReported})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].userReported._id.should.equal(develappsReport.userReported);
                            done();
                        });
                    });
            });
            it('should succeed with statistics', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'statistics': true})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.body.docs.should.be.an('Array');
                        res.body.docs.should.have.lengthOf(2);
                        done();
                    });
            });
            it('should succeed with statistics and userReported', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userReported': develappsReport.userReported, 'statistics': true})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        should.not.exist(err);
                        res.body.docs.should.be.an('Array');
                        res.body.docs.should.have.lengthOf(1);
                        done();
                    });
            });
            it('should succeed with statistics and offset', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'statistics': true, 'offset':1})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.body.docs.should.be.an('Array');
                        res.body.docs.should.have.lengthOf(1);
                        res.body.total.should.equal(2);
                        done();
                    });
            });
        });
        describe('reports/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsReport._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'userReports', 'userReported');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + develappsReport._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'userReports', 'userReported');
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
            it('should fail for non existing report id with 404', function (done) {
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
            reports.remove({}, (err) => {
                develappsReport = {
                    userReports: clientId,
                    userReported: clientIdTwo,
                    reason: "a valid reason"
                };
                develappsReportTwo = {
                    userReports: clientIdTwo,
                    userReported: clientId,
                    reason: "a valid reason"
                };
                commonTestUtils.test_createReport(server, adminToken, develappsReport, function (realReport) {
                    develappsReport = realReport;
                    commonTestUtils.test_createReport(server, adminToken, develappsReportTwo, function (realReport) {
                        develappsReportTwo = realReport;
                        done();
                    });
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsReport._id)
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
                .delete(endpoint + '/' + develappsReport._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for client on other`s report', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + develappsReportTwo._id)
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