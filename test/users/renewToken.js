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
let DeviceModel = require('api/models/push/device');

let endpoint = '/api/v1/renewToken';
let token = "";
let aUser = "";
let adminToken = "";
let adminUser = "";
let tokenTwo, aUserTwo;

let imageFile = fs.readFileSync("test/blobs/images/develapps.png");
let adminImageFile = fs.readFileSync("test/blobs/images/develapps2.png");

let moment = require("moment");
let imageId, imageIdTwo;
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
                else{
                    isDone();
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
    describe('renewToken', function () {
        beforeEach(function (done) {
            async.series(
                [
                    function (isDone) {
                        user.remove({}, isDone);
                    },
                    function (isDone) {
                        TokenModel.remove({}, isDone);
                    },
                    function (isDone) {
                        // admin user
                        commonTestUtils.testBuild_createAdminUserAndClients(server, null, function (res) {
                            adminToken = res.admin.token;
                            adminUser = res.admin.user;
                            token = res.userOne.token;
                            aUser = res.userOne.user;
                            tokenTwo = res.userTwo.token;
                            aUserTwo = res.userTwo.user;
                            isDone()
                        });
                    }
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .post(endpoint)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'expiration', 'apiVersion', 'user', 'token');
                    done()
                });
        });
        it('should succeed for non admin', function (done) {
            chai.request(server)
                .post(endpoint)
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'expiration', 'apiVersion', 'user', 'token');
                    done()

                });
        });
        it('should succeed with expiration', function (done) {
            chai.request(server)
                .post(endpoint)
                .set("Authorization", "Bearer " + token)
                .send({expiration: 1})
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'expiration', 'apiVersion', 'user', 'token');
                    done()

                });
        });
    });
})
;
