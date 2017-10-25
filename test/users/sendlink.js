const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
let errorConstants = require('api/common/errorConstants');

// User
let user = require('api/models/users/user');
const endpoint = '/api/v1/sendlink';
let bootstrap = require("bootstrap/load_data");
let breeds = require("api/models/pets/breeds");
let async = require("async");
let queue = require("lib/queue/queue");
let temporaryToken = require("api/models/users/temporaryTokens");
let cache = require("lib/redis/redis");

let badArguments = [
    {email: "bademail", type: constants.verificationTypeNames.activation},
    {email: "development@develapps.es", type: "badType"},
];

let goodArguments = {
    telemarketing:
        {
            email: "development+teleactivation@develapps.es",
            type: constants.verificationTypeNames.activation,
        },
    potentialClient:
        {
            email: "development+useractivation@develapps.es",
            type: constants.verificationTypeNames.activation,
        },
    vetcenter:
        {
            email: "development+cvactivation@develapps.es",
            type: constants.verificationTypeNames.activation,
        },
};

let goodResetArguments = {
    telemarketing:
        {
            email: "development+telereset@develapps.es",
            type: constants.verificationTypeNames.resetPassword,
        },
    potentialClient:
        {
            email: "development+userreset@develapps.es",
            type: constants.verificationTypeNames.resetPassword,
        },
    vetcenter:
        {
            email: "development+cvreset@develapps.es",
            type: constants.verificationTypeNames.resetPassword,
        },
};

let goodSimulationArguments = {
    simulation:
        {
            email: "development+simulation@develapps.es",
            type: constants.verificationTypeNames.simulatePlan,
            postalCode: "12005",
            region: "Valencia",
            country: "ES"
        },
};

// tests
let teleId;
describe('Sendlink Group', () => {
    // Needed to not recreate schemas
    beforeEach(function (done) {
        async.series([
            function (isDone) {
                commonTestInit.before(isDone);
            },
            function (isDone) {
                cache.flushall(function (err, succeeded) {
                    should.not.exist(err);
                    isDone();
                });
            },
            function (isDone) {
                user.remove({}, function (err) {
                    should.not.exist(err);
                    isDone()
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                aUser.email = "development+teleactivation@develapps.es";
                aUser.active = false;
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    teleId = userId;
                    isDone();
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                aUser.email = "development+cvactivation@develapps.es";
                aUser.origin.user = teleId;
                aUser.active = false;
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    isDone();
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                aUser.email = "development+useractivation@develapps.es";
                aUser.origin.user = teleId;
                aUser.active = false;
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    isDone();
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                aUser.email = "development+telereset@develapps.es";
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    teleId = userId;
                    isDone();
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                aUser.email = "development+cvreset@develapps.es";
                aUser.origin.user = teleId;
                aUser.address.postalCode = "46021";
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    isDone();
                })
            },
            function (isDone) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                aUser.email = "development+userreset@develapps.es";
                aUser.origin.user = teleId;
                commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                    isDone();
                })
            },
        ], function (err) {
            should.not.exist(err);
            done();
        })

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
        describe('sendlink/ with no Authorization header', () => {
            it('should fail with 401 unauthorized', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send(goodArguments[0])
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        commonTestUtils.test_error(401, err, res, function () {
                            done();
                        })
                    });
            });
        });
        describe('sendlink/ with good arguments', () => {
            Object.keys(goodArguments).forEach(function (key) {
                let goodValues = goodArguments[key];
                it('should success for values ' + JSON.stringify(goodValues), (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(goodValues)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.have.property('user');
                            res.body.should.have.property('code');
                            res.body.should.have.property('expiration');
                            done();
                        });
                });
            });
        });
        describe('sendlink/ with bad arguments', () => {
            badArguments.forEach(function (badValues) {
                it('should fail for values ' + JSON.stringify(badValues), (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(badValues)
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
    });
    describe('ACTIVATE ', () => {
        Object.keys(goodArguments).forEach(function (key) {
            let goodValues = goodArguments[key];
            describe('after sendlink/ for ' + key, () => {
                it('should succeed for good values', (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(goodValues)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.have.property('user');
                            res.body.should.have.property('code');
                            res.body.should.have.property('expiration');
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants[key]));
                            aUser.email = goodValues.email;
                            chai.request(server)
                                .post("/api/v1/users/" + res.body.code + "/activate")
                                .send(aUser)
                                .set("Content-Type", "application/json")
                                .set("register-token", configAuth.baseToken)
                                .end(function (err, res) {
                                    res.should.have.status(200);
                                    res.should.be.json;
                                    res.body.should.be.an('object');
                                    res.body.should.contain.all.keys('email', 'active');
                                    res.body.active.should.be.equal(true);
                                    done();
                                });
                        });
                });
                it('should fail for bad activation code', (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(goodValues)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.have.property('user');
                            res.body.should.have.property('code');
                            res.body.should.have.property('expiration');
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants[key]));
                            aUser.email = goodValues.email;
                            chai.request(server)
                                .post("/api/v1/users/" + "badCode" + "/activate")
                                .send(aUser)
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

        });
        it('mail should succeed',function (done) {
            chai.request(server)
                .post(endpoint)
                .send(goodArguments.potentialClient)
                .set("Content-Type", "application/json")
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('user');
                    res.body.should.have.property('code');
                    res.body.should.have.property('expiration');
                    let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants["potentialClient"]));
                    aUser.email = goodArguments.potentialClient.email;
                    let id = res.body._id;
                    chai.request(server)
                        .post("/api/v1/users/" + res.body.code + "/activate")
                        .send(aUser)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('email', 'active');
                            res.body.active.should.be.equal(true);
                            setTimeout(function () {
                                // Mail sent?
                                temporaryToken.findOne({_id:id},function (err,object) {
                                    should.not.exist(err);
                                    should.exist(object);
                                    let index = object.status.length-1;
                                    should.equal(object.status[index].status,constants.temporaryTokenStatusNames.mailSent);
                                    done();
                                });

                            },3000);
                        });
                });
        })
    });
    describe('RESET ', () => {
        Object.keys(goodResetArguments).forEach(function (key) {
            let goodValues = goodResetArguments[key];
            describe('after sendlink/ for ' + key, () => {
                it('should succeed for good values', (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(goodValues)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.have.property('user');
                            res.body.should.have.property('code');
                            res.body.should.have.property('expiration');
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants[key]));
                            aUser.email = goodValues.email;
                            chai.request(server)
                                .post("/api/v1/users/" + res.body.code + "/resetpassword")
                                .send(aUser)
                                .set("Content-Type", "application/json")
                                .set("register-token", configAuth.baseToken)
                                .end(function (err, res) {
                                    res.should.have.status(200);
                                    res.should.be.json;
                                    res.body.should.be.an('object');
                                    res.body.should.contain.all.keys('email', 'active');
                                    res.body.active.should.be.equal(true);
                                    done();
                                });
                        });
                });
                it('should fail for bad activation code', (done) => {
                    chai.request(server)
                        .post(endpoint)
                        .send(goodValues)
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.have.property('user');
                            res.body.should.have.property('code');
                            res.body.should.have.property('expiration');
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants[key]));
                            aUser.email = goodValues.email;
                            chai.request(server)
                                .post("/api/v1/users/" + "badCode" + "/resetpassword")
                                .send(aUser)
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
        });
        describe("final client", () => {
            let relatedUserToken;
            let relatedUserId;
            let catBreeds;
            let adminToken;
            beforeEach(function (done) {
                async.series([

                        function (isDone) {
                            bootstrap.initDatabase(function () {
                                isDone();
                            });
                        },
                        function (isDone) {
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                            aUser.email = "development+telereset@develapps.es";
                            commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                                teleId = userId;
                                isDone();
                            })
                        },
                        function (isDone) {
                            // related to CV user
                            let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                            temp3.email = commonTestUtils.registeredMail;
                            temp3.origin = {
                                user: teleId,
                                originType: constants.originNames.originCV
                            };
                            commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                                relatedUserToken = aToken;
                                relatedUserId = adUserid;
                                isDone()
                            });
                        },

                        function (isDone) {
                            let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.admin));
                            commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                                adminToken = token;
                                isDone();
                            })
                        },
                        function (isDone) {
                            breeds.find({species: constants.speciesNames.Cats}, function (err, cats) {
                                catBreeds = cats;
                                isDone(err);
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
                            params.origin= { user: teleId, originType: constants.originNames.originTelemarketing};
                            chai.request(server)
                                .post("/api/v1/users/"+ relatedUserId + "/upgrade")
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
                    ],
                    function (err) {
                        should.not.exist(err);
                        done();
                    })
            });
            it('should succeed for good values', (done) => {
                let values = {
                    email: commonTestUtils.registeredMail,
                    type: constants.verificationTypeNames.resetPassword,
                };
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('user');
                        res.body.should.have.property('code');
                        res.body.should.have.property('expiration');
                        let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        aUser.email = commonTestUtils.registeredMail;
                        chai.request(server)
                            .post("/api/v1/users/" + res.body.code + "/resetpassword")
                            .send(aUser)
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
    });
    describe('SIMULATE ', () => {
        let dogBreeds;
        beforeEach(function (done) {
            async.series([
                function (doneFunc) {
                    breeds.remove({},function (err) {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    bootstrap.initDatabase(function () {
                        doneFunc();
                    });
                },
                function (isDone) {
                    let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.admin));
                    commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                        adminToken = token;
                        isDone();
                    })
                },
                function (doneFunc) {
                    let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                    aUser.email = "development+cvactivation@develapps.es";
                    aUser.active = true;
                    commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                        doneFunc();
                    })
                },
                function (doneFunc) {
                    let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                    aUser.email = "development+valvet@develapps.es";
                    aUser.active = true;
                    aUser.address.postalCode = "46021";
                    aUser.address.region = constants.regionNames.ES.Albacete;
                    commonTestUtils.test_createUser(server, aUser, function (token, userId) {
                        doneFunc();
                    })
                },
                function (doneFunc) {
                    let simulateUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    simulateUser.email = goodSimulationArguments.simulation.email;
                    simulateUser.active = false;
                    commonTestUtils.test_createUser(server,simulateUser,function (token,userId) {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    breeds.find({species: constants.speciesNames.Dogs}, function (err, dogs) {
                        dogBreeds = dogs;
                        doneFunc(err);
                    })
                },
                function (doneFunc) {
                    commonTestUtils.test_createRegionPonderation(server,
                        adminToken,
                        commonTestUtils.regionPonderationContants.spainRegionPonderation,
                        function (region) {
                            doneFunc();
                        })
                },
                function (doneFunc) {
                    commonTestUtils.test_createRegionPonderation(server,
                        adminToken,
                        commonTestUtils.regionPonderationContants.valenciaRegionPonderation,
                        function (region) {
                            doneFunc();
                        })
                },
                function (doneFunc) {
                    commonTestUtils.test_createRegionPonderation(server,
                        adminToken,
                        commonTestUtils.regionPonderationContants.regionPonderation,
                        function (region) {
                            doneFunc();
                        })
                }
            ], function (err) {
                should.not.exist(err);
                done();
            });


        });
        describe("send link for simulation client", () => {
            it('should succeed for good values', (done) => {
                let values = goodSimulationArguments.simulation;
                let dog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                dog.mainBreed = dogBreeds[0]._id;
                values.pet = dog;
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('user');
                        res.body.should.have.property('plan');
                        res.body.should.have.property('code');
                        res.body.should.have.property('expiration');
                        done();
                    });
            });
            it('should succeed for spain', (done) => {
                let values = goodSimulationArguments.simulation;
                let dog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                dog.mainBreed = dogBreeds[0]._id;
                values.pet = dog;
                values.country = commonTestUtils.regionPonderationContants.spainRegionPonderation.country;
                values.region  = constants.regionNames.ES.Albacete;
                values.postalCode = "45000";
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('user');
                        res.body.should.have.property('plan');
                        res.body.should.have.property('code');
                        res.body.should.have.property('expiration');
                        res.body.plan.should.have.property('treatments');
                        res.body.plan.treatments.should.have.property('mandatory');
                        should.equal(res.body.plan.treatments.mandatory[0].ponderation,
                            commonTestUtils.regionPonderationContants.spainRegionPonderation.ponderation);
                        done();
                    });
            });
            it('should succeed for valencia', (done) => {
                let values = goodSimulationArguments.simulation;
                let dog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                dog.mainBreed = dogBreeds[0]._id;
                values.pet = dog;
                values.country = commonTestUtils.regionPonderationContants.valenciaRegionPonderation.country;
                values.region = commonTestUtils.regionPonderationContants.valenciaRegionPonderation.region;
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('user');
                        res.body.should.have.property('plan');
                        res.body.should.have.property('code');
                        res.body.should.have.property('expiration');
                        res.body.plan.should.have.property('treatments');
                        res.body.plan.treatments.should.have.property('mandatory');
                        should.equal(res.body.plan.treatments.mandatory[0].ponderation,
                            commonTestUtils.regionPonderationContants.valenciaRegionPonderation.ponderation);
                        done();
                    });
            });
            it('should succeed for postalCode ponderation', (done) => {
                let values = goodSimulationArguments.simulation;
                let dog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                dog.mainBreed = dogBreeds[0]._id;
                values.pet = dog;
                values.country = commonTestUtils.regionPonderationContants.regionPonderation.country;
                values.postalCode = commonTestUtils.regionPonderationContants.regionPonderation.postalCode;
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('user');
                        res.body.should.have.property('plan');
                        res.body.should.have.property('code');
                        res.body.should.have.property('expiration');
                        res.body.plan.should.have.property('treatments');
                        res.body.plan.treatments.should.have.property('mandatory');
                        should.equal(res.body.plan.treatments.mandatory[0].ponderation,
                            commonTestUtils.regionPonderationContants.regionPonderation.ponderation);
                        done();
                    });
            });
            it('should fail for non available clinic', (done) => {
                let values = goodSimulationArguments.simulation;
                let dog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                dog.mainBreed = dogBreeds[0]._id;
                values.pet = dog;
                values.region = constants.regionNames.ES.Almería;
                chai.request(server)
                    .post(endpoint)
                    .send(values)
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            res.body.should.have.property('errorCode');
                            res.body.errorCode.should.equal(errorConstants.errorCodes(errorConstants.errorNames.plans_noClinicFound));
                            done();
                        });
                    });
            });
        });
    });
});