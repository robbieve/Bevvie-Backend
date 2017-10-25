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
let plans = require('api/models/plans/plan');
let treatment = require('api/models/plans/treatment');
let breeds = require('api/models/pets/breeds');
let pets = require('api/models/pets/pets');
let contracts = require('api/models/contracts/contracts');

const endpoint = '/api/v1/plans';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientToken = "";
let adminId = "";
let adminToken = "";
let vetCenterToken = "";
let vetCenterId = "";
let teleToken = "";
let teleId = "";
let catsBreeds, dogsBreeds;
let secondClientId, secondClientToken;
let aDog, aCat;

let plan = JSON.parse(JSON.stringify(commonTestUtils.planConstants.plan));
let secondPlan = JSON.parse(JSON.stringify(commonTestUtils.planConstants.plan));

let testDictionary = {
    Plan: {
        good: commonTestUtils.planConstants.plan,
        goodVariants: {
            isSimulation: [true, false, undefined, "true", 1],
            statuses: [
                {date: Date(), status: constants.planStatusNames.presubscription},
                {date: Date(), status: constants.planStatusNames.cancelled},
                {date: Date(), status: constants.planStatusNames.cancelPending},
                {date: Date(), status: constants.planStatusNames.doNotRenew},
                {date: Date(), status: constants.planStatusNames.renewal},
                {date: Date(), status: constants.planStatusNames.suscribed},
                {status: constants.planStatusNames.suscribed},
            ],
            cancellationReason: [
                constants.planCancellationNames.deceased,
                constants.planCancellationNames.moveToOtherCity,
                constants.planCancellationNames.notRenewed,
                constants.planCancellationNames.other,
            ],
            origin: [
                {originType: constants.originNames.originWeb},
                {originType: constants.originNames.originTelemarketing},
                {originType: constants.originNames.originCV},
            ],
            telemarketingProcedings: [
                0,
                5,
                2.4
            ],
            active: [true, false]
        },
        bad: {
            isSimulation: ["notBoolean", null],
            pet: ["notAnId"],
            vetCenter: ["notAnId"],
            owner: ["notAnId"],
            statuses: [
                {date: "notADate", status: constants.planStatusNames.presubscription},
                {date: Date(), status: "aBadConstant"},
            ],
            cancellationReason: [
                "badCancellationReason",
            ],
            contracts: [["notAnId"]],
            treatments: [{mandatory: ["badId"]}, {suggested: ["badId"]}, {other: ["badId"]}],
            treatmentsSelected: [{mandatory: ["badId"]}, {suggested: ["badId"]}, {other: ["badId"]}],
            origin: [
                {originType: "badOrigin"},
                {user: "badOriginId"},
            ],
            telemarketingProcedings: [
                "notAnunmber"
            ]
        }
    }
};

describe('Plans Group', () => {
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
                    commonTestUtils.test_createUser(server, values, function (token, userId) {
                        adminId = userId;
                        adminToken = token;
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                    commonTestUtils.test_createUser(server, values, function (token, userId) {
                        teleId = userId;
                        teleToken = token;
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                    values.origin.user = teleId;
                    commonTestUtils.test_createUser(server, values, function (token, userId) {
                        vetCenterId = userId;
                        vetCenterToken = token;
                        plan.vetCenter = userId;
                        plan["origin"] = {};
                        plan["origin"]["name"] = values.name;
                        secondPlan.vetcenter = userId;
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    values.origin.user = teleId;
                    commonTestUtils.test_createUser(server, values, function (token, userId) {
                        clientId = userId;
                        clientToken = token;
                        plan.owner = userId;
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    values.email = commonTestUtils.registeredMail;
                    values.password = commonTestUtils.registeredPass;
                    values.origin.user = teleId;
                    commonTestUtils.test_createUser(server, values, function (token, userId) {
                        secondClientId = userId;
                        secondClientToken = token;
                        secondPlan.owner = userId;
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
                function (doneFunc) {
                    aDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                    aDog.owner = clientId;
                    aDog.vetCenter = vetCenterId;
                    aDog.mainBreed = dogsBreeds[0];
                    aCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                    aCat.owner = secondClientId;
                    aCat.mainBreed = catsBreeds[0];
                    commonTestUtils.test_createPet(server, clientToken, aDog, function (realDog) {
                        aDog = realDog;
                        plan.pet = aDog._id;
                        commonTestUtils.test_createPet(server, secondClientToken, aCat, function (realCat) {
                            aCat = realCat;
                            secondPlan.pet = aCat._id;
                            doneFunc();
                        });
                    });
                }
            ]
            , function (err) {
                should.not.exist(err);
                testDictionary.Plan.good = JSON.parse(JSON.stringify(plan)); // Prefill good values
                done();
            });
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            pets.remove({}, (err) => {
                plans.remove({}, (err) => {
                    should.not.exist(err);
                    done();
                });
            })

        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            plans.remove({}, (err) => {
                should.not.exist(err);
                done();
            });
        });
        it('should fail for non admin', (done) => {
            chai.request(server)
                .post(endpoint)
                .send(plan)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    });
                });
        });
        Object.keys(testDictionary).forEach(function (variants) {
            let goodArgumentsVariants = testDictionary[variants]["goodVariants"];
            let badArguments = testDictionary[variants]["bad"];
            describe('plans/ with ' + variants + ' arguments', () => {
                Object.keys(goodArgumentsVariants).forEach(function (goodKey) {
                    let goodValues = goodArgumentsVariants[goodKey];
                    goodValues.forEach(function (goodValue) {
                        it('should success for good ' + goodKey + ' value ' + JSON.stringify(goodValue), (done) => {
                            let goodArguments = testDictionary[variants]["good"];
                            let temp = JSON.parse(JSON.stringify(goodArguments));
                            temp[goodKey] = goodValue;
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
                                    done();
                                });
                        });
                    });
                });
                Object.keys(badArguments).forEach(function (badKey) {
                    let badValues = badArguments[badKey];
                    badValues.forEach(function (badValue) {
                        it('should fail for bad ' + badKey + ' value ' + JSON.stringify(badValue), (done) => {
                            let goodArguments = testDictionary[variants]["good"];
                            let temp = JSON.parse(JSON.stringify(goodArguments));
                            temp[badKey] = badValue;
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
        describe("activate", () => {
            let aPlan = {};
            let secPlan = {};
            let simPlan;
            let aClientUser = {};
            let aClientToken;
            let aSecClientUser = {};
            let aSecClientToken;
            let otherCat, otherDog;
            beforeEach((done) => { //Before each test we empty the database
                async.series([
                    function (isDone) {
                        user.remove({email: commonTestUtils.registeredMail}, isDone)
                    },
                    function (isDone) {
                        let mail = "plan+potential@email.com";
                        user.remove({email: mail}, isDone)
                    },
                    function (doneFunc) {
                        let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        values.email = commonTestUtils.registeredMail;
                        values.password = commonTestUtils.registeredPass;
                        values.origin.user = teleId;
                        commonTestUtils.test_createUser(server, values, function (token, userId) {
                            aClientUser._id = userId;
                            aClientUser.token = token;
                            aPlan.owner = userId;
                            aPlan.vetCenter = vetCenterId;
                            doneFunc();
                        });
                    },
                    function (doneFunc) {
                        let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        let mail = "plan+potential@email.com";
                        values.email = mail;
                        values.origin.user = teleId;
                        commonTestUtils.test_createUser(server, values, function (token, userId) {
                            aSecClientUser._id = userId;
                            aSecClientToken = token;
                            secPlan.owner = userId;
                            secPlan.vetCenter = vetCenterId;
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
                    function (doneFunc) {
                        otherDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                        otherDog.owner = aClientUser._id;
                        otherDog.vetCenter = vetCenterId;
                        otherDog.mainBreed = dogsBreeds[0];
                        commonTestUtils.test_createPet(server, adminToken, otherDog, function (realDog) {
                            otherDog = realDog;
                            aPlan.pet = otherDog._id;
                            doneFunc();
                        });
                    },
                    function (doneFunc) {
                        otherCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                        otherCat.owner = aSecClientUser._id;
                        otherCat.vetCenter = vetCenterId;
                        otherCat.mainBreed = catsBreeds[0];
                        commonTestUtils.test_createPet(server, adminToken, otherCat, function (realCat) {
                            otherCat = realCat;
                            secPlan.pet = otherCat._id;
                            doneFunc();
                        });
                    },
                    function (isDone) {
                        let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                        delete params.creditCard;
                        params.email = commonTestUtils.registeredMail;
                        params.royalCaninPassword = commonTestUtils.registeredPass;
                        chai.request(server)
                            .post('/api/v1/users/' + aClientUser._id + "/upgrade")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                                aClientUser = res.body;
                                isDone();
                            });

                    },
                    function (isDone) {
                        plans.remove({}, isDone);
                    },
                    function (isDone) {
                        commonTestUtils.test_createPlan(server, adminToken, aPlan, function (realPlan) {
                            aPlan = realPlan;
                            let other = secPlan;
                            other.owner = aSecClientUser._id;
                            commonTestUtils.test_createPlan(server, adminToken, other, function (realPlan) {
                                secPlan = realPlan;
                                let simulation = JSON.parse(JSON.stringify(aPlan));
                                delete simulation._id;
                                delete simulation.createdAt;
                                delete simulation.updatedAt;
                                simulation.active = true;
                                simulation.owner = aClientUser._id;
                                commonTestUtils.test_createPlan(server, adminToken, simulation, function (realPlan) {
                                    simPlan = realPlan;
                                    done();
                                });
                            });
                        });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });

            });
            it("should fail for bad plan id", function (done) {
                chai.request(server)
                    .post(endpoint + "/badPlanId" + "/activate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for not existing plan id", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + adminId + "/activate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for unrelated user", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + aPlan._id + "/activate")
                    .set("Authorization", "Bearer " + teleToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(403, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for potential user", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + secPlan._id + "/activate")
                    .set("Authorization", "Bearer " + aSecClientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for final user with no credit card", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + secPlan._id + "/activate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
            it("should succeed for final user with credit card", function (done) {
                chai.request(server)
                    .post("/api/v1/users/" + aClientUser._id + "/creditCard")
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .send(commonTestUtils.creditCardConstants)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                        chai.request(server)
                            .post(endpoint + "/" + aPlan._id + "/activate")
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'statuses');
                                res.body.statuses.should.have.lengthOf(2);
                                done();
                            });

                    });
            });
            it("should fail for already activated plan", function (done) {
                chai.request(server)
                    .post("/api/v1/users/" + aClientUser._id + "/creditCard")
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .send(commonTestUtils.creditCardConstants)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                        chai.request(server)
                            .post(endpoint + "/" + aPlan._id + "/activate")
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'statuses');
                                res.body.statuses.should.have.lengthOf(2);
                                chai.request(server)
                                    .post(endpoint + "/" + aPlan._id + "/activate")
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
        describe("dectivate", () => {
            let aPlan = {};
            let secPlan = {};
            let simPlan;
            let aClientUser = {};
            let aClientToken;
            let aSecClientUser = {};
            let aSecClientToken;
            let otherCat, otherDog;
            beforeEach((done) => { //Before each test we empty the database
                async.series([
                    function (isDone) {
                        user.remove({email: commonTestUtils.registeredMail}, isDone)
                    },
                    function (isDone) {
                        let mail = "plan+potential@email.com";
                        user.remove({email: mail}, isDone)
                    },
                    function (doneFunc) {
                        let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        values.email = commonTestUtils.registeredMail;
                        values.password = commonTestUtils.registeredPass;
                        values.origin.user = teleId;
                        commonTestUtils.test_createUser(server, values, function (token, userId) {
                            aClientUser._id = userId;
                            aClientUser.token = token;
                            aPlan.owner = userId;
                            aPlan.vetCenter = vetCenterId;
                            doneFunc();
                        });
                    },
                    function (doneFunc) {
                        let values = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        let mail = "plan+potential@email.com";
                        values.email = mail;
                        values.origin.user = teleId;
                        commonTestUtils.test_createUser(server, values, function (token, userId) {
                            aSecClientUser._id = userId;
                            aSecClientToken = token;
                            secPlan.owner = userId;
                            secPlan.vetCenter = vetCenterId;
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
                    function (doneFunc) {
                        otherDog = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Dogs));
                        otherDog.owner = aClientUser._id;
                        otherDog.vetCenter = vetCenterId;
                        otherDog.mainBreed = dogsBreeds[0];
                        commonTestUtils.test_createPet(server, adminToken, otherDog, function (realDog) {
                            otherDog = realDog;
                            aPlan.pet = otherDog._id;
                            doneFunc();
                        });
                    },
                    function (doneFunc) {
                        otherCat = JSON.parse(JSON.stringify(commonTestUtils.petConstants.Cats));
                        otherCat.owner = aSecClientUser._id;
                        otherCat.vetCenter = vetCenterId;
                        otherCat.mainBreed = catsBreeds[0];
                        commonTestUtils.test_createPet(server, adminToken, otherCat, function (realCat) {
                            otherCat = realCat;
                            secPlan.pet = otherCat._id;
                            doneFunc();
                        });
                    },
                    function (isDone) {
                        let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                        delete params.creditCard;
                        params.email = commonTestUtils.registeredMail;
                        params.royalCaninPassword = commonTestUtils.registeredPass;
                        chai.request(server)
                            .post('/api/v1/users/' + aClientUser._id + "/upgrade")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                                aClientUser = res.body;
                                isDone();
                            });

                    },
                    function (isDone) {
                        plans.remove({}, isDone);
                    },
                    function (isDone) {
                        commonTestUtils.test_createPlan(server, adminToken, aPlan, function (realPlan) {
                            aPlan = realPlan;
                            let other = secPlan;
                            other.owner = aSecClientUser._id;
                            commonTestUtils.test_createPlan(server, adminToken, other, function (realPlan) {
                                secPlan = realPlan;
                                let simulation = JSON.parse(JSON.stringify(aPlan));
                                delete simulation._id;
                                delete simulation.createdAt;
                                delete simulation.updatedAt;
                                simulation.active = true;
                                simulation.owner = aClientUser._id;
                                commonTestUtils.test_createPlan(server, adminToken, simulation, function (realPlan) {
                                    simPlan = realPlan;
                                    done();
                                });
                            });
                        });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });

            });
            it("should fail for bad plan id", function (done) {
                chai.request(server)
                    .post(endpoint + "/badPlanId" + "/deactivate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for not existing plan id", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + adminId + "/deactivate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        });
                    });
            });
            it("should fail for non active plan", function (done) {
                chai.request(server)
                    .post(endpoint + "/" + aPlan._id + "/deactivate")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
            it("should succeed for active plan", function (done) {
                chai.request(server)
                    .post("/api/v1/users/" + aClientUser._id + "/creditCard")
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .send(commonTestUtils.creditCardConstants)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                        chai.request(server)
                            .post(endpoint + "/" + aPlan._id + "/activate")
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'statuses');
                                res.body.statuses.should.have.lengthOf(2);
                                chai.request(server)
                                    .post(endpoint + "/" + aPlan._id + "/deactivate")
                                    .set("Content-Type", "application/json")
                                    .set("Authorization", "Bearer " + adminToken)
                                    .send({cancellationReason: constants.planCancellationNames.other})
                                    .end(function (err, res) {
                                        res.should.have.status(200);
                                        res.should.be.json;
                                        res.body.should.be.an('Object');
                                        res.body.should.contain.all.keys('_id', 'statuses');
                                        res.body.statuses.should.have.lengthOf(3);
                                        done();
                                    });
                            });

                    });
            });
            it("should fail for already deactivated plan", function (done) {
                chai.request(server)
                    .post("/api/v1/users/" + aClientUser._id + "/creditCard")
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .send(commonTestUtils.creditCardConstants)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                        chai.request(server)
                            .post(endpoint + "/" + aPlan._id + "/activate")
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'statuses');
                                res.body.statuses.should.have.lengthOf(2);
                                chai.request(server)
                                    .post(endpoint + "/" + aPlan._id + "/deactivate")
                                    .set("Content-Type", "application/json")
                                    .set("Authorization", "Bearer " + adminToken)
                                    .send({cancellationReason: constants.planCancellationNames.other})
                                    .end(function (err, res) {
                                        res.should.have.status(200);
                                        res.should.be.json;
                                        res.body.should.be.an('Object');
                                        res.body.should.contain.all.keys('_id', 'statuses');
                                        res.body.statuses.should.have.lengthOf(3);
                                        chai.request(server)
                                            .post(endpoint + "/" + aPlan._id + "/deactivate")
                                            .set("Content-Type", "application/json")
                                            .set("Authorization", "Bearer " + adminToken)
                                            .send({cancellationReason: constants.planCancellationNames.deceased})
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
            plans.remove({}, (err) => {
                commonTestUtils.test_createPlan(server, adminToken, plan, function (realPlan) {
                    plan = realPlan;
                    let inactive = JSON.parse(JSON.stringify(plan));
                    delete inactive._id;
                    inactive.active = false;
                    commonTestUtils.test_createPlan(server, adminToken, inactive, function (realPlan) {
                        let simulation = JSON.parse(JSON.stringify(plan));
                        delete simulation._id;
                        delete simulation.createdAt;
                        delete simulation.updatedAt;
                        simulation.active = true;
                        commonTestUtils.test_createPlan(server, adminToken, simulation, function (realPlan) {
                            done();
                        });
                    });
                });
            });
        });
        describe('plans/', () => {
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
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with plan name', function (done) {
                plans.collection.createIndex({'$**': 'text'}, {
                    name: "textIndex",
                    "default_language": "es"
                }, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'vetcenter'})
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                done();
                            });
                        });
                })
                ;
            });

            it('should succeed with plan text search and language', function (done) {
                plans.collection.createIndex({'$**': 'text'}, {
                    name: "textIndex",
                    "default_language": "es"
                }, function (err) {
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': 'vetcenter'})
                        .set("Authorization", "Bearer " + adminToken)
                        .set("Accept-Language", "es")
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                done();
                            });
                        });
                });
            });
            describe('should succeed with good params', function () {
                let params = [
                    {
                        query: {pet: plan.pet},
                        result: 2,
                    },
                    {
                        query: {isSimulation: true},
                        result: 0,
                    },
                    {
                        query: {vetCenter: plan.vetCenter},
                        result: 2,
                    },
                    {
                        query: {owner: plan.owner},
                        result: 2,
                    },
                    {
                        query: {originUser: plan.originUser},
                        result: 2,
                    },
                    {
                        query: {statuses: [constants.planStatusNames.presubscription]},
                        result: 2,
                    },
                    {
                        query: {statuses: [constants.planStatusNames.presubscription], active: "all"},
                        result: 3,
                    },
                    {
                        query: {active: false},
                        result: 1,
                    },
                    {
                        query: {active: "all"},
                        result: 3,
                    },

                ];
                params.forEach(function (element) {
                    let query = element["query"];
                    let result = element["result"];
                    it('should succeed with query ' + JSON.stringify(query) + ' on plans data', function (done) {
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
                        query: {sort: {field: constants.sortNames.createdAt, order: constants.sortOrderNames.asc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.createdAt, order: constants.sortOrderNames.desc}},
                        result: 1,
                    },
                    {
                        query: {sort: {field: constants.sortNames.updatedAt, order: constants.sortOrderNames.asc}},
                        result: 0,
                    },
                    {
                        query: {sort: {field: constants.sortNames.updatedAt, order: constants.sortOrderNames.desc}},
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
                                    res.body.docs[result]._id.should.equal(plan._id);
                                    done();
                                });
                            });
                    });
                });
            })
        });
        describe('plans/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + plan._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'statuses', 'apiVersion');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + plan._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'statuses', 'apiVersion');
                        done();
                    });
            });
            it('should success for vet center', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + plan._id)
                    .set("Authorization", "Bearer " + vetCenterToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'statuses', 'apiVersion');
                        done();
                    });
            });
            it('should success for telemarketing', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + plan._id)
                    .set("Authorization", "Bearer " + teleToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'statuses', 'apiVersion');
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
            it('should fail for non existing plan id with 404', function (done) {
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
            plans.remove({}, (err) => {
                commonTestUtils.test_createPlan(server, adminToken, plan, function (realPlan) {
                    plan = realPlan
                    done();
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + plan._id)
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
                .delete(endpoint + '/' + plan._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for vetCenter', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + plan._id)
                .set("Authorization", "Bearer " + vetCenterToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });
        it('should fail for telemarketing', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + plan._id)
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
})
;