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
let pets = require('api/models/pets/pets');
let breeds = require('api/models/pets/breeds');
let image = require('api/models/blobs/images');

const endpoint = '/api/v1/pets';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientToken = "";
let adminId = "";
let adminToken = "";
let vetCenterToken = "";
let vetCenterId = "";
let teleToken = "";
let teleId = "";
let noVetCenterToken = "";
let noVetCenterId = "";
let noTeleToken = "";
let noTeleId = "";
let noclientId = "";
let noclientToken = "";

let dogsBreeds = {};
let catsBreeds = {};
let aDog = {};
let aCat = {};


// tests
let testDictionary = {
    Dogs: {
        good: commonTestUtils.petConstants.Dogs,
        goodVariants: {
            gender: [constants.genderNames.Female],
            birthday: [moment(1318786876406)],
            chronic: [true, false],
            patologies: [constants.healthPatologyNames.kidney],
            feedingType: [constants.feedingTypeNames.human, constants.feedingTypeNames.premium, constants.feedingTypeNames.supermarket],
            activity: [constants.activityNames.high, constants.activityNames.mid, constants.activityNames.low],
            environment: [constants.environmentNames.warm, constants.environmentNames.wet],
            weight: [constants.weightTypeNames.onFit, constants.weightTypeNames.overweight, constants.weightTypeNames.thin],
            'statuses': [
                {
                    status: constants.petStatusNames.suscribed
                },
                {
                    status: constants.petStatusNames.deceased,
                    date: moment(1318786876406)
                }
            ],
        },
        bad: {
            name: [undefined],
            gender: ["male", "female", "other", undefined],
            birthday: ["aBadBirthDay"],
            patologies: ["invented"],
            feedingType: ["aBadFeedingType"],
            activity: ["badActivity", undefined],
            environment: ["badEnvironment"],
            weight: ["badWeight", undefined],
            'statuses': [
                {
                    status: "notValid"
                },
                {
                    status: constants.statusNames.preactive
                },
                {
                    date: "notADate"
                }
            ],
        }
    }
};

testDictionary["Cats"] = {
    good: commonTestUtils.petConstants.Cats,
    goodVariants: testDictionary.Dogs.goodVariants,
    bad: testDictionary.Dogs.bad,
};

describe('Pets Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        async.series([
            function (doneFunc) {
                commonTestInit.before(function () {
                    doneFunc();
                });
            },
            function (doneFunc) {
                bootstrap.initDatabase(function () {
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
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                values.email = "goodno@vc.com";
                values.name = "zVetCenter";
                values.origin.user = adminId;
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    noVetCenterId = userId;
                    noVetCenterToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                values.email = "goodno@tm.com";
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    noTeleId = userId;
                    noTeleToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                values.email = "good@client.com";
                values.origin.user = teleId;
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    clientId = userId;
                    clientToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                values.email = "goodno@client.com";
                values.origin.user = teleId;
                commonTestUtils.test_createUser(server, values, function (token, userId) {
                    noclientId = userId;
                    noclientToken = token;
                    doneFunc();
                });
            },
            function (doneFunc) {
                breeds.find({species: constants.speciesNames.Cats}, function (err, cats) {
                    catsBreeds = cats;
                    breeds.find({species: constants.speciesNames.Dogs}, function (err, dogs) {
                        dogsBreeds = dogs;
                        doneFunc();
                    })
                })

            },
        ], function (err) {
            should.not.exist(err);
            done();
        });
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            pets.remove({}, (err) => {
                should.not.exist(err);
                commonTestInit.after();
                done();
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            pets.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        Object.keys(testDictionary).forEach(function (species) {
            let goodArguments = testDictionary[species]["good"];
            let goodArgumentsVariants = testDictionary[species]["goodVariants"];
            let badArguments = testDictionary[species]["bad"];
            describe('pets/ with ' + species + ' arguments', () => {
                Object.keys(goodArgumentsVariants).forEach(function (goodKey) {
                    let goodValues = goodArgumentsVariants[goodKey];
                    goodValues.forEach(function (goodValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[goodKey] = goodValue;
                        it('should success for good ' + goodKey + ' value ' + JSON.stringify(goodValue), (done) => {
                            temp.owner = clientId;
                            temp.mainBreed = temp.species === constants.speciesNames.Dogs ? dogsBreeds[0] : catsBreeds[1];
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
                                .set("Content-Type", "application/json")
                                .set("Authorization", "Bearer " + clientToken)
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
                            temp.owner = clientId;
                            temp.mainBreed = temp.species === constants.speciesNames.Dogs ? dogsBreeds[0] : catsBreeds[1];
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
                                .set("Content-Type", "application/json")
                                .set("Authorization", "Bearer " + clientToken)
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
            pets.remove({}, (err) => {
                should.not.exist(err);
                aDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                aDog.owner = clientId;
                aDog.vetCenter = vetCenterId;
                aDog.mainBreed = dogsBreeds[0];
                aCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                aCat.owner = clientId;
                aCat.mainBreed = catsBreeds[0];
                aCat.vetCenter = noVetCenterId;
                commonTestUtils.test_createPet(server, clientToken, aDog, function (realDog) {
                    aDog = realDog;
                    commonTestUtils.test_createPet(server, clientToken, aCat, function (realCat) {
                        aCat = realCat;
                        let inactive = JSON.parse(JSON.stringify(aCat));
                        delete inactive._id;
                        inactive.name = "inactive";
                        inactive.active = false;
                        commonTestUtils.test_createPet(server, clientToken, inactive, function (realCat) {
                            done();
                        });
                    });
                });
            });
        });
        describe('pets/', () => {
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
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with 0 results for not telemarketing related', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + noTeleToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(0);
                            done();
                        });
                    });
            });
            it('should succeed with 0 results for not vetCenter related', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + noVetCenterToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with pet text search and language', function (done) {
                pets.collection.createIndex({'$**': 'text'}, {
                    name: 'textIndex',
                    default_language: 'es'
                }, function (err) {
                    should.not.exist(err);
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'perreteMajete'})
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
            it('should succeed with offset, limit', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'offset': 2, 'limit': 2})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(0);
                            res.body.total.should.be.equal(2);
                            res.body.offset.should.be.equal(2);
                            res.body.limit.should.be.equal(2);
                            done();
                        });
                    });
            });
            it('should succeed with page', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'page': 2, 'limit': 2})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(0);
                            res.body.total.should.be.equal(2);
                            res.body.pages.should.be.equal(1);
                            res.body.limit.should.be.equal(2);
                            done();
                        });
                    });
            });
            it('should succeed with owner id', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'owner': clientId})
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Accept-Language", "es")
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            res.body.docs.forEach(function (pet) {
                                pet.owner.should.be.equal(clientId);
                            });
                            done();
                        });
                    });
            });
            describe('should succeed with good params', function () {
                let params = [
                    {
                        query: {text: "perreteMajete"},
                        result: 1,
                    },
                    {
                        query: {active: "all"},
                        result: 3,
                    },
                    {
                        query: {active: "false"},
                        result: 1,
                    },
                    {
                        query: {status: constants.petStatusNames.unsuscribed},
                        result: 2,
                    },
                    {
                        query: {vetCenter: null},
                        result: 2,
                    }
                ];
                params.forEach(function (element) {
                    let query = element["query"];
                    let result = element["result"];
                    it('should succeed with query ' + JSON.stringify(query) + ' on data', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query(query)
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(result);
                                    done();
                                });
                            });
                    });
                });
            })
            describe('should succeed with sorted params', function () {

                let params = [
                    {
                        query: {sort: {field: constants.sortNames.status, order: constants.sortOrderNames.asc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.status, order: constants.sortOrderNames.desc}},
                        result: 0,
                    },
                    // TODO: Change this --> Not testing for plan creation date
                    /*
                    {
                        query: {sort: {field: constants.sortNames.planCreationDate, order: constants.sortOrderNames.asc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.planCreationDate, order: constants.sortOrderNames.desc}},
                        result: 0,
                    },
                    */
                    {
                        query: {sort: {field: constants.sortNames.name, order: constants.sortOrderNames.asc}},
                        result: 1,
                    },
                    {
                        query: {sort: {field: constants.sortNames.name, order: constants.sortOrderNames.desc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.vetCenterName, order: constants.sortOrderNames.asc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.vetCenterName, order: constants.sortOrderNames.desc}},
                        result: 1,
                    },
                ];
                params.forEach(function (element) {
                    let query = element["query"];
                    let result = element["result"];
                    it('should succeed with sort ' + JSON.stringify(query) + ' on plans data', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query(query)
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs[result]._id.should.equal(aDog._id);
                                    done();
                                });
                            });
                    });
                });
            })
        });
        describe('pets/id', () => {
            it('should succeed for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aCat._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should succeed for client its pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aCat._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should succeed for vet center on its pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aDog._id)
                    .set("Authorization", "Bearer " + vetCenterToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                        done();
                    });
            });
            it('should succeed for telemarketing on its pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aCat._id)
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
            it('should fail for non existing pet id with 404', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + "59ce0578f418c80bde508890")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for client user on other pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aCat._id)
                    .set("Authorization", "Bearer " + noclientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })
                    });
            });
            it('should fail for vetcenter user on other pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aDog._id)
                    .set("Authorization", "Bearer " + noVetCenterToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })
                    });
            });
            it('should fail for telemarketing user on other pet', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aCat._id)
                    .set("Authorization", "Bearer " + noTeleToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })
                    });
            });
            describe('pet/id with image', () => {
                let anotherCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                let imageFile = "test/blobs/images/develapps.png";
                beforeEach((done) => {
                    pets.remove({}, function (err) {
                        should.not.exist(err);
                        image.remove({}, (err) => {
                            should.not.exist(err);
                            const aFile = fs.readFileSync(imageFile);
                            // CREATE A NEW DOG
                            commonTestUtils.test_createImage(server, adminToken, aFile, function (objectId) {
                                anotherCat.image = objectId;
                                anotherCat.owner = clientId;
                                anotherCat.mainBreed = catsBreeds[0];
                                commonTestUtils.test_createPet(server, adminToken, anotherCat, function (realCat) {
                                    anotherCat = realCat;
                                    done();
                                })
                            });
                        });

                    })
                });
                it('should success to self user with 201 created', (done) => {
                    chai.request(server)
                        .get(endpoint + '/' + anotherCat._id)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'name', 'image', 'apiVersion');
                            done();
                        });
                });
            });
        });
    });
    describe('DELETE', function () {
        beforeEach((done) => {
            pets.remove({}, (err) => {
                should.not.exist(err);
                aDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                aDog.owner = clientId;
                aDog.vetCenter = vetCenterId;
                aDog.mainBreed = dogsBreeds[0];
                aCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                aCat.owner = clientId;
                aCat.mainBreed = catsBreeds[0];
                commonTestUtils.test_createPet(server, clientToken, aDog, function (realDog) {
                    aDog = realDog;
                    commonTestUtils.test_createPet(server, clientToken, aCat, function (realCat) {
                        aCat = realCat;
                        done();
                    });
                });
            });
        });

        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should succeed for client on its pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should succeed for vetCenter on its pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aDog._id)
                .set("Authorization", "Bearer " + vetCenterToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should succeed for telemarketing on its pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + teleToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
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
        it('should fail for client user on other pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + noclientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for vet user on other pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + noVetCenterToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for telemarketing user on other pet', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + aCat._id)
                .set("Authorization", "Bearer " + noTeleToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })
                });
        });
    });
});