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
let treatments = require('api/models/plans/treatment');

const endpoint = '/api/v1/treatments';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientToken = "";
let adminId = "";
let adminToken = "";
let vetCenterToken = "";
let vetCenterId = "";
let teleToken = "";
let teleId = "";

let treatment = {};

let testDictionary = {
    treatmentTemplate: {
        good: commonTestUtils.treatmentConstants.treatmentTemplate,
        goodVariants: {
            name: ["a name", "otro"],
            description: ["a description", "a description 1"],
            reason: ["a reason 2"],
            language: ["es", "pt"],
            vaccineFamily: ["a family 1"],
            reasonAgainst: ["some reason 1"],
            deactivationDate: [Date()],
            origin: [
                {originType: constants.originNames.originCV},
                {originType: constants.originNames.originTelemarketing},
                {originType: constants.originNames.originWeb}
            ]
        },
        bad: {
            name: [undefined, null],
            description: [undefined, null],
            reason: [undefined, null],
            language: ["es_bad"],
            deactivationDate: ["textBad"],
            origin: [
                {originType: "bad"},
            ]
        }
    }
};

describe('Treatments Group', () => {
    before(function (done) {
        async.series([
            function (doneFunc) {
                commonTestInit.before(function () {
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.admin));
                values.email = "good@admin.com";
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    adminId = userId;
                    adminToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                values.email = "good@vc.com";
                values.origin.user = adminId;
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    vetCenterId = userId;
                    vetCenterToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                values.email = "good@tm.com";
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    teleId = userId;
                    teleToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                values.email = "good@client.com";
                values.origin.user = adminId;
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    clientId = userId;
                    clientToken = token;
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
            treatments.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            treatments.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should fail for non admin', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(commonTestUtils.treatmentConstants.treatment)
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
            describe('treatments/ with ' + variants + ' arguments', () => {
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
        before((done) => { //Before each test create the object
            treatments.remove({}, (err) => {
                commonTestUtils.test_createTreatment(server, adminToken, commonTestUtils.treatmentConstants.treatmentTemplate, function (realTreatment) {
                    let aTemplate = JSON.parse(JSON.stringify(commonTestUtils.treatmentConstants.treatmentTemplate));
                    aTemplate.name = "template copy";
                    commonTestUtils.test_createTreatment(server, adminToken, aTemplate, function (realTreatment) {
                        treatment = realTreatment
                        let inactive = JSON.parse(JSON.stringify(treatment));
                        delete inactive._id;
                        inactive.active = false;
                        commonTestUtils.test_createTreatment(server, adminToken, inactive, function (realTreatment) {
                            done();
                        });
                    });
                });
            });
        });
        describe('treatments/', () => {
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
                            res.body.docs.should.have.lengthOf(2);
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
            it('should succeed with inactive treatments data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': false})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with all treatments data', function (done) {
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
            it('should succeed with telemarketing token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + teleToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with vetCenter token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + vetCenterToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with treatment name', function (done) {
                treatments.collection.createIndex({"$**": "text"}, {
                    name: "textIndex",
                    "default_language": "es"
                }, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'tratamiento'})
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

            it('should succeed with treatment text search and language', function (done) {
                treatments.collection.createIndex({"$**": "text"}, {
                    name: "textIndex",
                    "default_language": "es"
                }, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'tratamiento'})
                        .set("Authorization", "Bearer " + adminToken)
                        .set("Accept-Language", "es")
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
        describe('treatments/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + treatment._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + treatment._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should success for vet center', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + treatment._id)
                    .set("Authorization", "Bearer " + vetCenterToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should success for telemarketing', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + treatment._id)
                    .set("Authorization", "Bearer " + teleToken)
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
            it('should fail for non existing treatment id with 404', function (done) {
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
            treatments.remove({}, (err) => {
                commonTestUtils.test_createTreatment(server, adminToken, commonTestUtils.treatmentConstants.treatmentTemplate, function (realTreatment) {
                    treatment = realTreatment
                    done();
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + treatment._id)
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
                .delete(endpoint + '/' + treatment._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should succeed for vetCenter on its treatment', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + treatment._id)
                .set("Authorization", "Bearer " + vetCenterToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should succeed for telemarketing on its treatment', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + treatment._id)
                .set("Authorization", "Bearer " + teleToken)
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