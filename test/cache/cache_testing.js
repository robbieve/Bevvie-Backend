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
                async.series(
                    [
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

                    ], function (err, results) {
                        done()
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
                    .query({'email': commonTestUtils.userConstants.potentialClient.email})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);

                            let aQuery = prefix + ':User-list:' + JSON.stringify({
                                'email': commonTestUtils.userConstants.potentialClient.email,
                                active: true,
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
            it('should return _cached field', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .get(endpoint)
                    .query({'email': commonTestUtils.userConstants.potentialClient.email})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            chai.request(server)
                                .get(endpoint)
                                .query({'email': commonTestUtils.userConstants.potentialClient.email})
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
            it('should update existing cache', function (done) {
                if (!config.cache.enabled) {
                    return done()
                }
                chai.request(server)
                    .post(endpoint + "/" + userid)
                    .send({'name': 'otherName'})
                    .set("Authorization", "Bearer " + adminToken)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        setTimeout(function () {
                            let aQuery = prefix + ':User-list:' + JSON.stringify({
                                'email': commonTestUtils.userConstants.potentialClient.email,
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
                                    reply = JSON.parse(reply);
                                    should.not.exist(err);
                                    reply.should.be.an('Object');
                                    reply.name.should.be.equal("otherName");
                                    done();
                                });
                            });
                        },cacheDelay);
                    });
            });
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
                                'email': commonTestUtils.userConstants.potentialClient.email,
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
                        },cacheDelay);
                    });
            });
        })
    });
})
;
