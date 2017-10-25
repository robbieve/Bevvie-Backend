let commonTestInit = require('../commonTestInit');
let commonTestUtils = require('../commonTestUtils');
const async = require("async");
const fs = require("fs");

let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let errorConstants = require("api/common/errorConstants");

// User
let user = require('api/models/users/user');
let breeds = require('api/models/pets/breeds');
let bootstrap = require('bootstrap/load_data');
let plan = require('api/models/plans/plan');

let image = require('api/models/blobs/images');
let TokenModel = require('api/models/users/token');

let endpoint = '/api/v1/users';
let token = "";
let vetToken = "";
let userid = "";
let vetUserId = "";
let adminToken = "";
let adminUserId = "";
let relatedUserId = "";
let relatedUserToken = "";
let teleUserId = "";
let teleUserToken = "";
let teleRelatedUserId = "";
let teleRelatedUserToken = "";

let catBreeds;
let dogBreeds;

let moment = require("moment");
let unixtime = "" + Math.floor(moment().utc() / 10);
let imageId = "";
let fakeObjectId = "590c5df8f7145e88b3c498a9";
let constants = require("api/common/constants");

let registeredMail = commonTestUtils.registeredMail;
let registeredPass = commonTestUtils.registeredPass;
let redis = require("lib/redis/redis");
let config = require("config");
let winston = require('lib/loggers/logger').winston;

describe('Users Group', () => {
    before(function (done) {
        async.series([
            function (isDone) {
                commonTestInit.before(isDone);
            },
            function (isDone) {
                bootstrap.initDatabase(function () {
                    if (config.cache.enabled) {
                        redis.flushdb(function (err, succeeded) {
                            if (err) return winston.error(err);
                            winston.debug('Cleared REDIS cache ' + succeeded);
                            isDone();
                        });
                    }
                });
            }], function (err) {
            should.not.exist(err);
            done();
        });
    });
    after(function (done) {
        commonTestInit.after();
        done();
    });

    describe('GET', () => {
        before(function (done) {
            async.series(
                [
                    function (isDone) {
                        user.remove({},isDone);
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
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                            token = aToken;
                            userid = adUserid;
                            isDone()
                        });
                    },

                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing1";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing2";
                        temp2.email = "telemarketing2@email.com";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
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
                        // vetCenter2
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                        temp2.origin.user = teleUserId;
                        temp2.name = "vetcenter2";
                        temp2.email = "ventcenter2@vetcenter.es";
                        temp2.address.city = "Madrid";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = registeredMail;
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
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            teleRelatedUserToken = aToken;
                            teleRelatedUserId = adUserid;
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
                        aDog.owner = teleRelatedUserId;
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
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
        });
        describe('users/ list', function () {
            it('should fail with 401 unauthenticated', (done) => {
                chai.request(server)
                    .get(endpoint + '/' + userid)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should fail with no doc', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'email': "no@admin.email"})
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(0);
                            done();
                        });
                    });
            });
            it('should succeed with users data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'email': commonTestUtils.userConstants.admin.email})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with inactive users data', function (done) {
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
            it('should succeed with all users data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': "all"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(9);
                            done();
                        });
                    });
            });
            it('should succeed with text search', function (done) {
                user.collection.createIndex({"$**": "text"}, {
                    name: "textIndex",
                    "default_language": "es"
                }, function (err) {
                    should.not.exist(err)
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': "telemarketing"})
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                done();
                            });
                        });
                });
            });
            it('should succeed with email search', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'email': "development+registered@develapps.es"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with userType search', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'userType': constants.roleNames.admin})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with related telemarketing users data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .set("Authorization", "Bearer " + teleUserToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(4);
                            done();
                        });
                    });
            });
            it('should succeed with related vetcenter users data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .set("Authorization", "Bearer " + vetToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(3);
                            done();
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
                            res.body.docs.should.have.lengthOf(2);
                            res.body.total.should.be.equal(8);
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
                            res.body.docs.should.have.lengthOf(2);
                            res.body.total.should.be.equal(8);
                            res.body.pages.should.be.equal(4);
                            res.body.limit.should.be.equal(2);
                            done();
                        });
                    });
            });
            describe("sort", function () {
                describe("telemarketing list", function () {
                    it('should succeed with sort telemarketing by name', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.telemarketing, 'sort': {
                                    "field": "name",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("telemarketing2");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.telemarketing, 'sort': {
                                                "field": "name",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("telemarketing1");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                    it('should succeed with sort telemarketing by creation date', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.telemarketing, 'sort': {
                                    "field": "createdAt",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("telemarketing2");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.telemarketing, 'sort': {
                                                "field": "createdAt",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("telemarketing1");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                    it('should succeed with sort telemarketing by email', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.telemarketing, 'sort': {
                                    "field": "email",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("telemarketing1");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.telemarketing, 'sort': {
                                                "field": "email",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("telemarketing2");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                });
                describe("vetcenter list", function () {
                    it('should succeed with sort vetcenter by origin name', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.vetcenter, 'sort': {
                                    "field": "origin",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("vetcenter2");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.vetcenter, 'sort': {
                                                "field": "origin",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("vetcenter");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                    it('should succeed with sort vetcenter by creation date', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.vetcenter, 'sort': {
                                    "field": "createdAt",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("vetcenter2");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.vetcenter, 'sort': {
                                                "field": "createdAt",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("vetcenter");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                    it('should succeed with sort vetcenter by city', function (done) {
                        chai.request(server)
                            .get(endpoint)
                            .query({
                                'userType': constants.roleNames.vetcenter, 'sort': {
                                    "field": "city",
                                    "order": constants.sortOrderNames.desc
                                }
                            })
                            .set("Authorization", "Bearer " + adminToken)
                            .end(function (err, res) {
                                commonTestUtils.test_pagination(err, res, function () {
                                    res.body.docs.should.be.an('Array');
                                    res.body.docs.should.have.lengthOf(2);
                                    res.body.docs[0].name.should.be.equal("vetcenter");
                                    chai.request(server)
                                        .get(endpoint)
                                        .query({
                                            'userType': constants.roleNames.vetcenter, 'sort': {
                                                "field": "city",
                                                "order": constants.sortOrderNames.asc
                                            }
                                        })
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            commonTestUtils.test_pagination(err, res, function () {
                                                res.body.docs.should.be.an('Array');
                                                res.body.docs.should.have.lengthOf(2);
                                                res.body.docs[0].name.should.be.equal("vetcenter2");
                                                done();
                                            });
                                        });
                                });
                            });
                    });
                });

                it('should succeed with sort origin', function (done) {
                    chai.request(server)
                        .get(endpoint)
                        .query({
                            'userType': constants.roleNames.potentialClient, 'sort': {
                                "field": "origin",
                                "order": constants.sortOrderNames.desc
                            }
                        })
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(3);
                                res.body.docs[0].origin.originType.should.be.equal(constants.originNames.originCV);
                                chai.request(server)
                                    .get(endpoint)
                                    .query({
                                        'userType': constants.roleNames.potentialClient, 'sort': {
                                            "field": "origin",
                                            "order": constants.sortOrderNames.asc
                                        }
                                    })
                                    .set("Authorization", "Bearer " + adminToken)
                                    .end(function (err, res) {
                                        commonTestUtils.test_pagination(err, res, function () {
                                            res.body.docs.should.be.an('Array');
                                            res.body.docs.should.have.lengthOf(3);
                                            res.body.docs[0].origin.originType.should.be.equal(constants.originNames.originWeb);
                                            done();
                                        });
                                    });
                            });
                        });
                });
            });

        });
        describe('users/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + adminUserId)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                        done();
                    });
            });
            it('should success for non admin on its user', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + userid)
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion');
                        done();
                    });
            });
            it('should fail for bad id with 400', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + 'bad-user-id')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for bad user id with 404', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + '1234')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for non admin user on other user', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + adminUserId)
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, done);
                    });
            });
        });
    });
    describe('POST', function () {
        before(function (done) {
            async.series(
                [
                    function (isDone) {
                        user.remove({},isDone);
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
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                            token = aToken;
                            userid = adUserid;
                            isDone()
                        });
                    },

                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing1";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing2";
                        temp2.email = "telemarketing2@email.com";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
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
                        // vetCenter2
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                        temp2.origin.user = teleUserId;
                        temp2.name = "vetcenter2";
                        temp2.email = "ventcenter2@vetcenter.es";
                        temp2.address.city = "Madrid";
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = registeredMail;
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
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            teleRelatedUserToken = aToken;
                            teleRelatedUserId = adUserid;
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
                        aDog.owner = teleRelatedUserId;
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
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
        });
        it('should succeed for admin', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + adminUserId)
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                    res.body.roles.should.be.an('array').that.includes('admin');
                    done()
                });
        });
        it('should succeed for admin on self user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + adminUserId)
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                    done()
                });
        });
        it('should succeed for user on self user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + userid)
                .send(query)
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                    done()
                });
        });
        it('should fail for non admin on other user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + adminUserId)
                .send(query)
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })
                });
        });
        describe('update user', function () {
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
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                            token = aToken;
                            userid = adUserid;
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
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = registeredMail;
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
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            teleRelatedUserToken = aToken;
                            teleRelatedUserId = adUserid;
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
                        aDog.owner = teleRelatedUserId;
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
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            it('should succeed with existing user', function (done) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                aUser.email = 'aUser@aUser.es';
                commonTestUtils.test_createUser(server, aUser, function (aToken, aUserid) {
                    chai.request(server)
                        .post(endpoint + '/' + aUserid)
                        .set("Authorization", "Bearer " + adminToken)
                        .send({'name': 'otherName'})
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('_id', 'name', 'apiVersion');
                            res.body.name.should.be.equal('otherName');
                            done();
                        });
                })
            });
            it('should fail with non existing user', function (done) {
                chai.request(server)
                    .post(endpoint + '/' + 'unexistingid')
                    .set("Authorization", "Bearer " + adminToken)
                    .send({'email': 'otherName@otherName.es'})
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })
                    });
            });
            it("should succeed updating password", function (done) {
                let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                params.royalCaninPassword = registeredPass;
                chai.request(server)
                    .post(endpoint + '/' + relatedUserId + "/upgrade")
                    .set("Authorization", "Bearer " + adminToken)
                    .send(params)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                        let user = res.body;
                        user.password = registeredPass;
                        chai.request(server)
                            .post(endpoint + '/' + relatedUserId)
                            .set("Authorization", "Bearer " + adminToken)
                            .send(user)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                                done();
                            });
                    });
            });
            it('should succeed with vetcenter on itself', function (done) {
                let aUser = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                aUser.email = 'aVetcenterUser@aVetUser.es';
                commonTestUtils.test_createUser(server, aUser, function (aToken, aUserid) {
                    chai.request(server)
                        .post(endpoint + '/' + aUserid)
                        .set("Authorization", "Bearer " + aToken)
                        .send({'name': 'otherName'})
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.body.should.be.an('object');
                            res.body.should.not.contain.all.keys('_id', 'name', 'apiVersion');
                            done();
                        });
                })
            });
        });
        describe('upgrade user', function () {
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
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                            token = aToken;
                            userid = adUserid;
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
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.origin.user = adminUserId;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = registeredMail;
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
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            teleRelatedUserToken = aToken;
                            teleRelatedUserId = adUserid;
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
                        aDog.owner = teleRelatedUserId;
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
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            describe('should fail for bad parameters', function () {
                ["contracts", "cardId", "creditCard"].forEach(function (mandatoryParam) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    delete params[mandatoryParam];
                    it('should fail for no ' + mandatoryParam, function (done) {
                        chai.request(server)
                            .post(endpoint + '/' + userid + "/upgrade")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                commonTestUtils.test_error(400, err, res, function () {
                                    done();
                                })
                            });
                    });
                });
                it('should fail for bad credit card', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    params["creditCard"]["number"] = "4242424242424244";
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for bad credit card expiration month', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    params["creditCard"]["exp_month"] = "notANumber";
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for bad credit card expiration year', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    params["creditCard"]["exp_year"] = "notAYear";
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should fail for bad permissions', function () {
                it('non related vet Center', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + vetToken)
                        .send(commonTestUtils.upgradeConstants)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(403, err, res, function () {
                                done();
                            })
                        });
                });
                it('non related telemarketing', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + teleUserToken)
                        .send(commonTestUtils.upgradeConstants)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                });
                it('non related user', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + token)
                        .send(commonTestUtils.upgradeConstants)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                })
            });
            describe('should fail for bad user', function () {
                it('should fail for non potential user', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    chai.request(server)
                        .post(endpoint + '/' + teleUserId + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail if no pets', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for existing user and bad password', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(403, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should succeed', function () {
                it('for existing royalCanin user and good password', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    params.royalCaninPassword = registeredPass;
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                            done();
                        });
                });
                it('for new user and password', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.upgradeConstants));
                    chai.request(server)
                        .post(endpoint + '/' + teleRelatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                            done();
                        });
                });
            })
        })
        describe('change user credit card', function () {
            let upgradedUser = {};
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
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                            token = aToken;
                            userid = adUserid;
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
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.origin.user = adminUserId;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            teleUserToken = aToken;
                            teleUserId = adUserid;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = registeredMail;
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
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                            teleRelatedUserToken = aToken;
                            teleRelatedUserId = adUserid;
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
                        aDog.owner = teleRelatedUserId;
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
                        params.royalCaninPassword = registeredPass;
                        chai.request(server)
                            .post(endpoint + '/' + relatedUserId + "/upgrade")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('Object');
                                res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                                upgradedUser = res.body;
                                done();
                            });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            describe('should fail for bad parameters', function () {
                ["creditCard"].forEach(function (mandatoryParam) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                    delete params[mandatoryParam];
                    it('should fail for no ' + mandatoryParam, function (done) {
                        chai.request(server)
                            .post(endpoint + '/' + relatedUserId + "/creditcard")
                            .set("Authorization", "Bearer " + adminToken)
                            .send(params)
                            .set("Content-Type", "application/json")
                            .end(function (err, res) {
                                commonTestUtils.test_error(400, err, res, function () {
                                    done();
                                })
                            });
                    });
                });
                it('should fail for bad credit card', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                    params["creditCard"]["number"] = "4242424242424244";
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/creditcard")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for bad credit card expiration month', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                    params["creditCard"]["exp_month"] = "notANumber";
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/creditcard")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for bad credit card expiration year', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                    params["creditCard"]["exp_year"] = "notAYear";
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/creditcard")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should fail for bad permissions', function () {
                it('non related telemarketing', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + teleUserToken)
                        .send(commonTestUtils.upgradeConstants)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                });
                it('non related user', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/upgrade")
                        .set("Authorization", "Bearer " + token)
                        .send(commonTestUtils.upgradeConstants)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                })
            });
            describe('should fail for bad user', function () {
                it('should fail for non client user', function (done) {
                    let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                    chai.request(server)
                        .post(endpoint + '/' + userid + "/upgrade")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should succeed', function () {
                let params = JSON.parse(JSON.stringify(commonTestUtils.creditCardConstants));
                it('should succeed for good params with existing stripeId', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/creditcard")
                        .set("Authorization", "Bearer " + adminToken)
                        .send(params)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                            done();
                        });
                });
                it('should succeed for good params without stripeId', function (done) {
                    upgradedUser.stripeId = null;
                    upgradedUser.stripeCardToken = null;
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId)
                        .set("Authorization", "Bearer " + adminToken)
                        .send(upgradedUser)
                        .set("Content-Type", "application/json")
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                            res.body.should.not.contain.all.keys('stripeId', 'stripeCardToken');
                            chai.request(server)
                                .post(endpoint + '/' + relatedUserId + "/creditcard")
                                .set("Authorization", "Bearer " + adminToken)
                                .send(params)
                                .set("Content-Type", "application/json")
                                .end(function (err, res) {
                                    res.should.have.status(200);
                                    res.should.be.json;
                                    res.body.should.be.an('Object');
                                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                                    done();
                                });
                        });
                });
            })
        })
        describe('deactivate user', function () {
            let aPlan = commonTestUtils.planConstants.plan;
            let pet, vetCenter;
            before(function (done) {
                commonTestUtils.test_prepareBreeds(function (cats, dogs) {
                    catBreeds = cats;
                    dogBreeds = dogs;
                    done();
                });
            });
            beforeEach(function (done) {
                async.series([
                    function (isDone) {
                        user.remove({}, function () {
                            plan.remove({}, function () {
                                isDone();
                            });
                        });
                    },
                    function (isDone) {
                        // create final user
                        commonTestUtils.test_createFinalUserWithActivePlan(server, null, dogBreeds, function (result) {
                            adminToken = result.admin.token;
                            adminUserId = result.admin._id;
                            relatedUserId = result.user._id;
                            relatedUserToken = result.user.token;
                            aPlan = result.plan;
                            pet = result.pet;
                            vetCenter = result.vetCenter;
                            isDone();
                        });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
            });
            describe('should fail for bad permissions', function () {
                it('non related vetCenter', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/deactivate")
                        .set("Authorization", "Bearer " + vetCenter.token)
                        .end(function (err, res) {
                            commonTestUtils.test_error(403, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should fail for bad user', function () {
                it('should fail for non client user', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + vetCenter._id + "/deactivate")
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_error(400, err, res, function () {
                                done();
                            })
                        });
                });
            });
            describe('should succeed', function () {
                it('should succeed with good values', function (done) {
                    chai.request(server)
                        .post("/api/v1/plans/" + aPlan._id + "/deactivate")
                        .set("Authorization", "Bearer " + adminToken)
                        .set("Content-Type", "application/json")
                        .send({cancellationReason: constants.planCancellationNames.other})
                        .end(function (err, res) {
                            res.should.have.status(200);
                            pet.active = false;
                            chai.request(server)
                                .post("/api/v1/pets/" + pet._id)
                                .set("Authorization", "Bearer " + adminToken)
                                .set("Content-Type", "application/json")
                                .send(pet)
                                .end(function (err, res) {
                                    res.should.have.status(200);
                                    chai.request(server)
                                        .post(endpoint + '/' + relatedUserId + "/deactivate")
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            res.should.have.status(200);
                                            done();
                                        });
                                });
                        });
                });
            });
            describe('should fail for status', function () {
                it('should fail for active plan', function (done) {
                    chai.request(server)
                        .post(endpoint + '/' + relatedUserId + "/deactivate")
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_errorCode(400, errorConstants.errorCodes(errorConstants.errorNames.users_activePlan), err, res, function () {
                                done();
                            })
                        });
                });
                it('should fail for active pet', function (done) {
                    chai.request(server)
                        .post("/api/v1/plans/" + aPlan._id + "/deactivate")
                        .set("Authorization", "Bearer " + adminToken)
                        .set("Content-Type", "application/json")
                        .send({cancellationReason: constants.planCancellationNames.other})
                        .end(function (err, res) {
                            res.should.have.status(200);
                            chai.request(server)
                                .post(endpoint + '/' + relatedUserId + "/deactivate")
                                .set("Authorization", "Bearer " + adminToken)
                                .end(function (err, res) {
                                    commonTestUtils.test_errorCode(400, errorConstants.errorCodes(errorConstants.errorNames.users_activePet), err, res, function () {
                                        done();
                                    });
                                });
                        });
                });
                it('should fail for inactive user', function (done) {
                    chai.request(server)
                        .post("/api/v1/plans/" + aPlan._id + "/deactivate")
                        .set("Authorization", "Bearer " + adminToken)
                        .set("Content-Type", "application/json")
                        .send({cancellationReason: constants.planCancellationNames.other})
                        .end(function (err, res) {
                            res.should.have.status(200);
                            pet.active = false;
                            chai.request(server)
                                .post("/api/v1/pets/" + pet._id)
                                .set("Authorization", "Bearer " + adminToken)
                                .set("Content-Type", "application/json")
                                .send(pet)
                                .end(function (err, res) {
                                    res.should.have.status(200);
                                    chai.request(server)
                                        .post(endpoint + '/' + relatedUserId + "/deactivate")
                                        .set("Authorization", "Bearer " + adminToken)
                                        .end(function (err, res) {
                                            res.should.have.status(200);
                                            chai.request(server)
                                                .post(endpoint + '/' + relatedUserId + "/deactivate")
                                                .set("Authorization", "Bearer " + adminToken)
                                                .end(function (err, res) {
                                                    commonTestUtils.test_errorCode(400, errorConstants.errorCodes(errorConstants.errorNames.users_inactiveUser), err, res, function () {
                                                        done();
                                                    });
                                                });
                                        });
                                });
                        });
                });
            });
        });
    });
    describe('DELETE', function () {
        beforeEach(function (done) {
            async.series([
                function (isDone) {
                    user.remove({}, (err) => {
                        isDone()
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
                    // Potential client
                    let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    commonTestUtils.test_createUser(server, temp, function (aToken, adUserid) {
                        token = aToken;
                        userid = adUserid;
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
                    // telemarketing
                    let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                    temp2.origin.user = adminUserId;
                    commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                        teleUserToken = aToken;
                        teleUserId = adUserid;
                        isDone()
                    });
                },
                function (isDone) {
                    // inactive USer
                    let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    temp2.email = "inactive@inactive.es";
                    temp2.active = false;
                    commonTestUtils.test_createUser(server, temp2, function (aToken, adUserid) {
                        isDone()
                    });
                },
                function (isDone) {
                    // related to CV user
                    let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    temp3.email = "relatedUser@related.com";
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
                    // Related to telemarketing user
                    let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.potentialClient));
                    temp3.email = "relatedTMUser@related.com";
                    temp3.origin = {
                        user: teleUserId,
                        originType: constants.originNames.originTelemarketing
                    };
                    commonTestUtils.test_createUser(server, temp3, function (aToken, adUserid) {
                        teleRelatedUserToken = aToken;
                        teleRelatedUserId = adUserid;
                        isDone()
                    });
                },

            ], function (err) {
                should.not.exist(err);
                done();
            });
        })
        describe('users/id', () => {
            it('should succees for admin', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + userid)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('n', 'ok');
                        TokenModel.find({user: userid}, function (err, elements) {
                            elements.should.be.an('Array');
                            elements.should.have.lengthOf(0);
                            done();
                        });
                    });
            });
            it('should fail for non admin on its user', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + userid)
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        commonTestUtils.test_error(403, err, res, function () {
                            done();
                        })
                    });
            });
            it('should fail for bad id with 400', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + 'bad-user-id')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for bad user id with 404', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + '1234')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
        });
    });
});
