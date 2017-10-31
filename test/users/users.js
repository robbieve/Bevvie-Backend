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
let bootstrap = require('bootstrap/load_data');

let image = require('api/models/blobs/images');
let TokenModel = require('api/models/users/token');

let endpoint = '/api/v1/users';
let token = "";
let aUser = "";
let adminToken = "";
let adminUser = "";


let moment = require("moment");
let imageId = "";
let fakeObjectId = "590c5df8f7145e88b3c498a9";
let constants = require("api/common/constants");
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
                if (config.cache.enabled) {
                    redis.flushdb(function (err, succeeded) {
                        if (err) return winston.error(err);
                        winston.debug('Cleared REDIS cache ' + succeeded);
                        isDone();
                    });
                }
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
                        user.remove({}, isDone);
                    },
                    function (isDone) {
                        // admin user
                        commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (res) {
                            adminToken = res.token;
                            adminUser = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        commonTestUtils.test_createUser(server, temp, function (res) {
                            token = res.token;
                            aUser = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp.active = false;
                        commonTestUtils.test_createUser(server, temp, function (res) {
                            isDone()
                        });
                    },
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
        });
        describe('users/ list', function () {
            it('should fail with 401 unauthenticated', (done) => {
                chai.request(server)
                    .get(endpoint + '/' + aUser._id)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should succeed with active users data', function (done) {
                chai.request(server)
                    .get(endpoint)
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
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with admin users data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'admin': "true"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with text search', function (done) {
                user.collection.createIndex({"$**": "text"}, {
                    name: "textIndex",
                    "default_language": "en"
                }, function (err) {
                    should.not.exist(err)
                    chai.request(server)
                        .get(endpoint)
                        .query({'text': commonTestUtils.userConstants.userOne.name})
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
            it('should succeed with offset, limit', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({active: "all", admin: "all",'offset': 2, 'limit': 2})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.total.should.be.equal(3);
                            res.body.offset.should.be.equal(2);
                            res.body.limit.should.be.equal(2);
                            done();
                        });
                    });
            });
            it('should succeed with page', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({active: "all", admin: "all",'page': 2, 'limit': 2})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.total.should.be.equal(3);
                            res.body.pages.should.be.equal(2);
                            res.body.limit.should.be.equal(2);
                            done();
                        });
                    });
            });
            describe("sort", function () {
                it('should succeed with sort name', function (done) {
                    chai.request(server)
                        .get(endpoint)
                        .query({
                            admin: "all",
                            sort: {
                                "field": "name",
                                "order": constants.sortOrderNames.desc
                            }
                        })
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_pagination(err, res, function () {
                                res.body.docs.should.be.an('Array');
                                res.body.docs.should.have.lengthOf(2);
                                res.body.docs[0].name.should.be.equal(commonTestUtils.userConstants.userOne.name);
                                chai.request(server)
                                    .get(endpoint)
                                    .query({
                                        admin: "all",
                                        sort: {
                                            "field": "name",
                                            "order": constants.sortOrderNames.asc
                                        }
                                    })
                                    .set("Authorization", "Bearer " + adminToken)
                                    .end(function (err, res) {
                                        commonTestUtils.test_pagination(err, res, function () {
                                            res.body.docs.should.be.an('Array');
                                            res.body.docs.should.have.lengthOf(2);
                                            res.body.docs[1].name.should.be.equal(commonTestUtils.userConstants.userOne.name);
                                            done();
                                        });
                                    });
                            });
                        });
                });
            });

        });
        describe('users/id', () => {
            it('should succeed for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + adminUser._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                        done();
                    });
            });
            it('should succeed for non admin on its user', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + aUser._id)
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
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
                    .get(endpoint + '/' + adminUser._id)
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
                        user.remove({}, isDone);
                    },
                    function (isDone) {
                        // admin user
                        commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (res) {
                            adminToken = res.token;
                            adminUser = res.user;
                            isDone()
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        commonTestUtils.test_createUser(server, temp, function (res) {
                            token = res.token;
                            aUser = res.user;
                            isDone()
                        });
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
                .post(endpoint + '/' + adminUser._id)
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    res.body.admin.should.equal(true);
                    done()
                });
        });
        it('should succeed for admin on self user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + adminUser._id)
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    done()
                });
        });
        it('should succeed for user on self user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id)
                .send(query)
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    done()
                });
        });
        it('should fail for non admin on other user', function (done) {
            let query = {
                'password': 'newpassword',
            };
            chai.request(server)
                .post(endpoint + '/' + adminUser._id)
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
                    commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (res) {
                        adminToken = res.token;
                        adminUser = res.user;
                        isDone()
                    });
                },
                function (isDone) {
                    // Potential client
                    let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                    commonTestUtils.test_createUser(server, temp, function (res) {
                        token = res.token;
                        aUser = res.user;
                        isDone()
                    });
                },
            ], function (err) {
                should.not.exist(err);
                done();
            });
        })
        describe('users/id', () => {
            it('should succeed for admin', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + aUser._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('n', 'ok');
                        TokenModel.find({user: aUser._id}, function (err, elements) {
                            elements.should.be.an('Array');
                            elements.should.have.lengthOf(0);
                            done();
                        });
                    });
            });
            it('should fail for non admin on its user', function (done) {
                chai.request(server)
                    .delete(endpoint + '/' + aUser._id)
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
