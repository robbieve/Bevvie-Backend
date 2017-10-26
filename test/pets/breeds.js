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
let breeds = require('api/models/pets/breeds');

const endpoint = '/api/v1/breeds';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientToken = "";
let adminId = "";
let adminToken = "";
let vetCenterToken = "";
let vetCenterId = "";
let teleToken = "";
let teleId = "";

let breed = {};
let testDictionary = {};
/*
let testDictionary = {
    Breed: {
        good: commonTestUtils.breedConstants.Breed,
        goodVariants: {
            royalCaninIdentifier: [5, "otro"],
            species: [constants.speciesNames.Cats],
            name: [[
                {
                    localizedName: "otraRazaGuena",
                    language: "es",
                },
                {
                    localizedName: "otraRazaGuena_PT",
                    language: "pt",
                },
            ]],
        },
        bad: {
            royalCaninIdentifier: [undefined],
            species: ["otra"],
            name: [undefined, {language: "es"}],
        }
    }
};

*/
describe.skip('Breeds Group', () => {
    // Needed to not recreate schemas
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
                commonTestUtils.test_createUser(server, values, function (res) {
                    adminId = res.token;
                    adminToken = res.token;
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
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
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
            breeds.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            breeds.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should fail for non admin', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(commonTestUtils.breedConstants.Breed)
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
            describe('breeds/ with ' + variants + ' arguments', () => {
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
           // breeds.collection.createIndex({"$**": "text"});
            breeds.remove({}, (err) => {
                commonTestUtils.test_createBreed(server, adminToken, commonTestUtils.breedConstants.Breed, function (realBreed) {
                    breed = realBreed
                    let inactive = JSON.parse(JSON.stringify(breed));
                    delete inactive._id;
                    inactive.active = false;
                    commonTestUtils.test_createBreed(server, adminToken, inactive, function (realBreed) {
                        done();
                    });

                });
            });
        });
        describe('breeds/', () => {
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
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with inactive breeds data', function (done) {
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
            it('should succeed with all breeds data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': "all"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
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
                            res.body.docs.should.have.lengthOf(1);
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
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with breed name', function (done) {
                breeds.collection.createIndex({"$**": "text"},{name: "textIndex","default_language":"es"}, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'razaGuena'})
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

            it('should succeed with breed text search and language', function (done) {
                breeds.collection.createIndex({"$**": "text"},{name: "textIndex","default_language":"es"}, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'razaGuena'})
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
        describe('breeds/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + breed._id)
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
                    .get(endpoint + '/' + breed._id)
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
                    .get(endpoint + '/' + breed._id)
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
                    .get(endpoint + '/' + breed._id)
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
            it('should fail for non existing breed id with 404', function (done) {
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
            breeds.remove({}, (err) => {
                commonTestUtils.test_createBreed(server, adminToken, commonTestUtils.breedConstants.Breed, function (realBreed) {
                    breed = realBreed
                    done();
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + breed._id)
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
                .delete(endpoint + '/' + breed._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should succeed for vetCenter on its breed', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + breed._id)
                .set("Authorization", "Bearer " + vetCenterToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should succeed for telemarketing on its breed', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + breed._id)
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