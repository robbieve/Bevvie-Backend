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
let redis = require("lib/redis/redis");
let config = require("config");
let winston = require('lib/loggers/logger').winston;

describe.skip('Users Group', () => {
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
                        commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin,  function (res) {
                            adminToken = res.token;
                            adminUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        commonTestUtils.test_createUser(server, temp,  function (res) {
                            token = res.token;
                            userid = res.user;
                            isDone()
                        });
                    },

                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing1";
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            teleUserToken = res.token;
                            teleUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing2";
                        temp2.email = "telemarketing2@email.com";
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            teleUserToken = res.token;
                            teleUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // vetCenter
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                        temp2.origin.user = adminUserId;
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            vetToken = res.token;
                            vetUserId = res.user;
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
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp3.email = registeredMail;
                        temp3.origin = {
                            user: vetUserId,
                            originType: constants.originNames.originCV
                        };
                        commonTestUtils.test_createUser(server, temp3,  function (res) {
                            relatedUserToken = res.token;
                            relatedUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3,  function (res) {
                            teleRelatedUserToken = res.token;
                            teleRelatedUserId = res.user;
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
                            'userType': constants.roleNames.userOne, 'sort': {
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
                                        'userType': constants.roleNames.userOne, 'sort': {
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
                        commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin,  function (res) {
                            adminToken = res.token;
                            adminUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        commonTestUtils.test_createUser(server, temp,  function (res) {
                            token = res.token;
                            userid = res.user;
                            isDone()
                        });
                    },

                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing1";
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            teleUserToken = res.token;
                            teleUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // telemarketing
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                        temp2.name = "telemarketing2";
                        temp2.email = "telemarketing2@email.com";
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            teleUserToken = res.token;
                            teleUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // vetCenter
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                        temp2.origin.user = adminUserId;
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            vetToken = res.token;
                            vetUserId = res.user;
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
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // inactive USer
                        let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp2.email = "inactive@inactive.es";
                        temp2.active = false;
                        commonTestUtils.test_createUser(server, temp2,  function (res) {
                            isDone()
                        });
                    },
                    function (isDone) {
                        // related to CV user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp3.email = registeredMail;
                        temp3.origin = {
                            user: vetUserId,
                            originType: constants.originNames.originCV
                        };
                        commonTestUtils.test_createUser(server, temp3,  function (res) {
                            relatedUserToken = res.token;
                            relatedUserId = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Related to telemarketing user
                        let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp3.email = "development+tm" + unixtime + "@develapps.es";
                        temp3.origin = {
                            user: teleUserId,
                            originType: constants.originNames.originTelemarketing
                        };
                        commonTestUtils.test_createUser(server, temp3,  function (res) {
                            teleRelatedUserToken = res.token;
                            teleRelatedUserId = res.user;
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
                    commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin,  function (res) {
                        adminToken = res.token;
                        adminUserId = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // Potential client
                    let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                    commonTestUtils.test_createUser(server, temp,  function (res) {
                        token = res.token;
                        userid = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // vetCenter
                    let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.vetcenter));
                    temp2.origin.user = adminUserId;
                    commonTestUtils.test_createUser(server, temp2,  function (res) {
                        vetToken = res.token;
                        vetUserId = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // telemarketing
                    let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.telemarketing));
                    temp2.origin.user = adminUserId;
                    commonTestUtils.test_createUser(server, temp2,  function (res) {
                        teleUserToken = res.token;
                        teleUserId = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // inactive USer
                    let temp2 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                    temp2.email = "inactive@inactive.es";
                    temp2.active = false;
                    commonTestUtils.test_createUser(server, temp2,  function (res) {
                        isDone()
                    });
                },
                function (isDone) {
                    // related to CV user
                    let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                    temp3.email = "relatedUser@related.com";
                    temp3.origin = {
                        user: vetUserId,
                        originType: constants.originNames.originCV
                    };
                    commonTestUtils.test_createUser(server, temp3,  function (res) {
                        relatedUserToken = res.token;
                        relatedUserId = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // Related to telemarketing user
                    let temp3 = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                    temp3.email = "relatedTMUser@related.com";
                    temp3.origin = {
                        user: teleUserId,
                        originType: constants.originNames.originTelemarketing
                    };
                    commonTestUtils.test_createUser(server, temp3,  function (res) {
                        teleRelatedUserToken = res.token;
                        teleRelatedUserId = res.user;
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
