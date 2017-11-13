const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
const async = require('async');
const fs = require("fs");
const cache = require("lib/redis/redis");
const config = require("config");

let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let winston = require('lib/loggers/logger').winston;
// DB
let user = require('api/models/users/user');

const endpoint = '/api/v1/users';

const pjson = require('package.json');

let prefix = pjson.name + ':' + process.env.NODE_ENV;
let cacheDelay = 500;

let token = "";
let userid = "";
let adminToken = "";
let adminUserId = "";

let allChats = {
    chatCreated: {},
    chatAccepted: {},
    chatRejected: {},
    chatExpired: {},
    chatExhausted: {},
};

describe('Cache Group', () => {
    // create users and clients
    before(function (done) {
        commonTestInit.before(function () {
            if (config.cache.enabled) {
                cache.flushdb(function (err, succeeded) {
                    if (err) return winston.error(err);
                    should.not.exist(err);
                    winston.debug('Cleared REDIS cache ' + succeeded);
                });
            }

            user.remove({}, (err) => {
                should.not.exist(err);
                commonTestUtils.testBuild_createUsersVenuesAndChats(server, null, function (res) {
                    adminUserId = res.admin.user._id;
                    adminToken = res.admin.token;
                    userid = res.userOne.user._id;
                    token = res.userOne.token;
                    Object.keys(allChats).forEach(function (element) {
                        allChats[element] = res[element];
                    });
                    done();
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
        })
    });

    describe('GET', () => {
        beforeEach((done) => {
            if (config.cache.enabled) {
                cache.flushdb(function (err, succeeded) {
                    if (err) return winston.error(err);
                    should.not.exist(err);
                    winston.debug('Cleared REDIS cache ' + succeeded);
                    done();
                });
            }
            else {
                done();
            }
        });
        describe('users/ with admin user', () => {
            it('should succeed with cached data', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .get(endpoint)
                    .query({'email': commonTestUtils.userConstants.userOne.email})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);

                            let aQuery = prefix + ':User-list:' + JSON.stringify({
                                'email': commonTestUtils.userConstants.userOne.email,
                                active: true,
                                admin: false,
                                sort: []
                            });
                            cache.get(aQuery, function (err, reply) {
                                should.not.exist(err);
                                res.body.docs.should.be.deep.equal(JSON.parse(reply).docs);
                                done();
                            });
                        });
                    });
            });
            it('should not cache possibly expiring data', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .get("/api/v1/chats/" + allChats.chatAccepted._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        should.not.exist(err);
                        // Bevvie-Backend:test:Chat:{"$and":[{"_id":"5a099f30a7d1e82163deda45"},{}]}
                        let aQuery = prefix + ':Chat:' + JSON.stringify({"$and": [{"_id": allChats.chatAccepted._id}, {}]});
                        cache.get(aQuery, function (err, reply) {
                            should.not.exist(err);
                            should.not.exist(reply);
                            done();
                        });
                    });
            });
            it('should return _cached field', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .get(endpoint)
                    .query({'email': commonTestUtils.userConstants.userOne.email})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            chai.request(server)
                                .get(endpoint)
                                .query({'email': commonTestUtils.userConstants.userOne.email})
                                .set("Authorization", "Bearer " + adminToken)
                                .end(function (err, res) {
                                    commonTestUtils.test_pagination(err, res, function () {
                                        res.body.docs.should.be.an('Array');
                                        res.body.docs.should.have.lengthOf(1);
                                        should.exist(res.body._cached);
                                        done();
                                    });
                                });
                        });
                    });
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //After each test we empty the database
            user.remove({}, (err) => {
                should.not.exist(err);
                if (config.cache.enabled) {
                    async.series([
                        function (isDone) {
                            cache.flushdb(function (err, succeeded) {
                                if (err) return winston.error(err);
                                should.not.exist(err);
                                winston.debug('Cleared REDIS cache ' + succeeded);
                                isDone();
                            });
                        },
                        function (isDone) {
                            // admin user
                            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (res) {
                                adminToken = res.token;
                                adminUserId = res.user;
                                isDone()
                            });
                        },
                        function (isDone) {
                            // Potential client
                            let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                            commonTestUtils.test_createUser(server, temp, function (res) {
                                token = res.token;
                                userid = res.user;
                                isDone()
                            });
                        },
                    ], function (err) {
                        should.not.exist(err);
                        done();
                    });
                }
                else {
                    done();
                }
            });
        });

        describe('update object', function () {
            it('should delete listing cache', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .delete(endpoint + "/" + userid)
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        setTimeout(function () {
                            let aQuery = prefix + ':User-list:' + JSON.stringify({
                                'email': commonTestUtils.userConstants.userOne.email,
                                active: true,
                                sort: {createdAt: 1}
                            });
                            cache.get(aQuery, function (err, reply) {
                                should.not.exist(err);
                                should.not.exist(reply);
                                aQuery = prefix + ':User:' + JSON.stringify({
                                    '_id': userid
                                });
                                cache.get(aQuery, function (err, reply) {
                                    should.not.exist(err);
                                    should.not.exist(reply);
                                    done();
                                });
                            });
                        }, cacheDelay);
                    });
            });
        })
    });
})
;
