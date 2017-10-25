const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// User
let user = require('api/models/users/user');
let token = "";
let adminToken = "";
let adminUserId = "";
let vetToken = "";
let vetUserId = "";
let relatedUserToken = "";
let relatedUserId = "";
let catBreeds, dogBreeds;
const endpoint = '/api/v1/login';
const constants = require('api/common/constants');
const async = require("async");
const bootstrap = require("bootstrap/load_data");
const breeds = require("api/models/pets/breeds");

let plusMail = "develapps+test@develapps.es";

describe('Login Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        commonTestInit.before(function () {
            user.remove({}, (err) => {
                should.not.exist(err);
                commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (aToken, aUserid) {
                    adminToken = aToken;
                    commonTestUtils.test_createUser(server, commonTestUtils.userConstants.potentialClient, function (aToken, aUserid) {
                        token = aToken;
                        let plusUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        plusUser.email = plusMail;
                        commonTestUtils.test_createUser(server, plusUser, function (aToken, aUserid) {
                            done();
                        });
                    });
                });
            });
        });

    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            should.not.exist(err);
            commonTestInit.after();
            done();
        });
    });
    describe('POST', () => {
        describe('login/ with faulting arguments', () => {
            const tests = [{}, {email: 'potentialClient@potentialClient.es'}, {password: 'test'}];
            tests.forEach(function (parameters) {
                it('should fail with parameters ' + JSON.stringify(parameters), (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(parameters)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            });
                        });
                });
            });
        });
        describe('login/ with good arguments', () => {
            it('should success with token argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'email': 'potentialClient@potentialClient.es', 'password': 'test'})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.should.not.have.deep.property('user.password');
                        done();
                    });
            });
            it('should success with plus mail argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'email': plusMail, 'password': 'test'})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.should.not.have.deep.property('user.password');
                        done();
                    });
            });
        });
        describe("login/ with final user", function () {
            before(function (done) {
                async.series([
                    function (isDone) {
                        user.remove({}, function () {
                            isDone();
                        })
                    },
                    function (isDone) {
                        bootstrap.initDatabase(function () {
                            isDone();
                        });
                    },
                    function (isDone) {
                        // admin user
                        commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (aToken, aUserid) {
                            adminToken = aToken;
                            adminUserId = aUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // vetCenter
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                        temp2.origin.user = adminUserId;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            vetToken = aToken;
                            vetUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = commonTestUtils.registeredMail;
                        temp3.origin = {
                            user: vetUserId,
                            originType: constants.originNames.originCV
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            relatedUserToken = aToken;
                            relatedUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        breeds.find({species: constants.speciesNames.Cats}, function (err, cats) {
                            catBreeds = cats;
                            breeds.find({species: constants.speciesNames.Dogs}, function (err, dogs) {
                                dogBreeds = dogs;
                                isDone();
                            })
                        })

                    },
                    function (isDone) {
                        let aDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                        aDog.owner = relatedUserId;
                        aDog.mainBreed = dogBreeds[0]._id;
                        commonTestUtils.test_createPet(server, adminToken, aDog, function (result) {
                            isDone();
                        })

                    },
                    function (isDone) {
                        let aCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                        aCat.owner = relatedUserId;
                        aCat.mainBreed = catBreeds[0]._id;
                        commonTestUtils.test_createPet(server, adminToken, aCat, function (result) {
                            isDone();
                        })

                    },
                    function (isDone) {
                        let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                        params.royalCaninPassword = commonTestUtils.registeredPass;
                        chai.request(server)
                            .post('/api/v1/users/' + relatedUserId + "/upgrade")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                                isDone();
                            });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            it('should succeed for existing royalCanin user and good password', function (done) {
                chai.request(server)
                    .post(endpoint)
                    .send({'email': commonTestUtils.registeredMail, 'password': commonTestUtils.registeredPass})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.should.not.have.deep.property('user.password');
                        done();
                    });
            });
            it('should fail for existing royalCanin user and bad password', function (done) {
                chai.request(server)
                    .post(endpoint)
                    .send({'email': commonTestUtils.registeredMail, 'password': "badPassword"})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        });
                    });
            })
            it('should fail for non existing royalCanin user', function (done) {
                chai.request(server)
                    .post(endpoint)
                    .send({'email': "nonExisting@user.es", 'password': "badPassword"})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        });
                    });
            })
        })
    });
});
