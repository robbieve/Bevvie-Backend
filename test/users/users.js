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

let endpoint = '/api/v1/users';
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


let testDictionary = {
    User: {
        good: commonTestUtils.userConstants.userOne,
        goodVariants: {
            accessType: [constants.users.accessTypeNames.firebase,constants.users.accessTypeNames.facebook],
            country: ["US","GB"],
            languages: [["en","es"],[]],
            birthday: [moment("20101010","YYYYMMDD")],
        },
        bad: {
            accessType: ["badAccess"],
            country: ["falseCountry"],
            languages: [["notAlanguage"],["esp"]],
            birthday: ["35"],
        }
    }
};

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
                        const aFile = imageFile;
                        const anAdminFile = adminImageFile;
                        commonTestUtils.test_createImage(server, adminToken, aFile, function (objectId) {
                            imageId = objectId;
                            commonTestUtils.test_createImage(server, adminToken, anAdminFile, function (objectId) {
                                imageIdTwo = objectId;
                                isDone();
                            });
                        });
                    },
                    function (isDone) {
                        // Potential client
                        let temp = JSON.parse(JSON.stringify(commonTestUtils.userConstants.userOne));
                        temp.images = [imageId];
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
                        temp.images = [imageIdTwo];
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
            it('should succeed with users image data', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'active': "all"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            res.body.docs[0].should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'images');

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
            it('should succeed with name search', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'name': "user", "active": "all"})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with offset, limit', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({active: "all", admin: "all", 'offset': 2, 'limit': 2})
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
                    .query({active: "all", admin: "all", 'page': 2, 'limit': 2})
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
                it('should succeed with sort name and stringify', function (done) {
                    let qs = require("qs");
                    let jsonString = qs.stringify({
                        admin: "all",
                        sort: {
                            field: "name",
                            order: constants.sortOrderNames.desc
                        }
                    });
                    chai.request(server)
                        .get(endpoint)
                        .query(jsonString)
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
                            testDictionary.User.good=res.user;
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
        Object.keys(testDictionary).forEach(function (variants) {
            let goodArguments = testDictionary[variants]["good"];
            let goodArgumentsVariants = testDictionary[variants]["goodVariants"];
            let badArguments = testDictionary[variants]["bad"];
            describe('user/id with ' + variants + ' arguments', () => {
                Object.keys(goodArgumentsVariants).forEach(function (goodKey) {
                    let goodValues = goodArgumentsVariants[goodKey];
                    goodValues.forEach(function (goodValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[goodKey] = goodValue;
                        it('should succeed for good ' + goodKey + ' value ' + JSON.stringify(goodValue), (done) => {
                            chai.request(server)
                                .post(endpoint + '/' + testDictionary.User.good._id)
                                .send(temp)
                                .set("Content-Type", "application/json")
                                .set("Authorization", "Bearer " + adminToken)
                                .end(function (err, res) {
                                    res.should.have.status(200);
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
                            chai.request(server)
                                .post(endpoint + '/' + testDictionary.User.good._id)
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
    describe('validate', function () {
        beforeEach(function (done) {
            async.series(
                [
                    function (isDone) {
                        user.remove({}, isDone);
                    },
                    function (isDone) {
                        image.remove({}, isDone);
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
                    },
                    function (isDone) {
                        // Potential client
                        const aFile = imageFile;
                        const aFileTwo = adminImageFile;
                        commonTestUtils.test_createImage(server, token, aFile, function (objectId) {
                            imageId = objectId;
                            commonTestUtils.test_createImage(server, tokenTwo, aFileTwo, function (objectId) {
                                imageIdTwo = objectId;
                                aUser.images = [imageId,imageIdTwo];

                                chai.request(server)
                                    .post(endpoint + '/' + aUser._id)
                                    .send(aUser)
                                    .set("Authorization", "Bearer " + adminToken)
                                    .end(function (err, res) {
                                        res.should.have.status(200);
                                        res.should.be.json;
                                        res.body.should.be.an('Object');
                                        res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                                        done()
                                    });
                            });
                        });
                    },
                ], function (err) {
                    should.not.exist(err);
                    done();
                });
        });
        it('should succeed for admin about_validated', function (done) {
            let query = {
                validated_images: [],
                rejected_images: [],
                about_validated: false
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/validate')
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    res.body.about_validated.should.equal(false);
                    done()
                });
        });
        it('should succeed for admin about_validated and user clearing it', function (done) {
            let query = {
                validated_images: [],
                rejected_images: [],
                about_validated: false
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/validate')
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    res.body.about_validated.should.equal(false);
                    let userValues = res.body;
                    userValues.about_validated = null;
                    chai.request(server)
                        .post(endpoint + '/' + aUser._id )
                        .send(userValues)
                        .set("Authorization", "Bearer " + token)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                            should.not.exist(res.body.about_validated);
                            done()
                        });
                });
        });
        it('should fail for non admin user', function (done) {
            let query = {
                validated_images: [],
                rejected_images: [],
                about_validated: true
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/validate')
                .send(query)
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })
                });
        });

        it('should succeed for admin image validated', function (done) {
            let query = {
                validated_images: [imageId],
                rejected_images: [],
                about_validated: true
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/validate')
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    res.body.about_validated.should.equal(true);
                    chai.request(server)
                        .get('/api/v1/images/' + imageId)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('_id', 'validated');
                            res.body.validated.should.equal(true);
                            done()
                        });
                });
        });
        it('should succeed for admin image rejected', function (done) {
            let query = {
                validated_images: [],
                rejected_images: [imageId],
                about_validated: true
            };
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/validate')
                .send(query)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin');
                    res.body.about_validated.should.equal(true);
                    chai.request(server)
                        .get('/api/v1/images/' + imageId)
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_error(404, err, res, function () {
                                done();
                            })
                        });
                });
        });
    });
    describe('ban', function () {
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
                .post(endpoint + '/' + aUser._id + '/ban')
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'banned');
                    res.body.banned.should.equal(true)
                    done()
                });
        });
        it('should fail for non admin', function (done) {
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/ban')
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    commonTestUtils.test_error(403, err, res, function () {
                        done();
                    })

                });
        });
        it('should succeed for admin deleting token', function (done) {
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/ban')
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'banned');
                    res.body.banned.should.equal(true)
                    chai.request(server)
                        .get("/api/v1/users")
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + token)
                        .end(function (err, res) {
                            should.exist(err);
                            res.should.have.status(401);
                            done();
                        });
                });
        });
        it('should succeed for admin preventing login', function (done) {
            let copiedUser = JSON.parse(JSON.stringify(aUser));
            copiedUser.banned = true;
            chai.request(server)
                .post(endpoint + '/' + aUser._id)
                .send(copiedUser)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'banned');
                    res.body.banned.should.equal(true)
                    chai.request(server)
                        .post("/api/v1/login")
                        .send({
                            'id': copiedUser._id,
                            'accessKey': 'passw0rd',
                            'accessType': constants.users.accessTypeNames.password
                        })
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            commonTestUtils.test_errorCode(403, errorConstants.errorCodes(errorConstants.errorNames.user_banned), err, res, function () {
                                done();
                            })
                        });
                });
        });

    });
    describe('deactivate', function () {
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
                        DeviceModel.remove({}, isDone);
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
                .post(endpoint + '/' + aUser._id + '/deactivate')
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'active');
                    res.body.active.should.equal(false)
                    done()
                });
        });
        it('should succeed for non admin', function (done) {
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/deactivate')
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'active');
                    res.body.active.should.equal(false)
                    done()
                });
        });
        it('should succeed for non admin deleting token', function (done) {
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/deactivate')
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'active');
                    res.body.active.should.equal(false)
                    chai.request(server)
                        .get("/api/v1/users")
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + token)
                        .end(function (err, res) {
                            should.exist(err);
                            res.should.have.status(401);
                            done();
                        });
                });
        });

        it('should succeed for user allowing to reactivate through login', function (done) {
            chai.request(server)
                .post(endpoint + '/' + aUser._id + '/deactivate')
                .set("Authorization", "Bearer " + token)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'name', 'apiVersion', 'admin', 'active');
                    res.body.active.should.equal(false)
                    chai.request(server)
                        .post("/api/v1/login")
                        .send({
                            'id': aUser._id,
                            'accessKey': 'passw0rd',
                            'accessType': constants.users.accessTypeNames.password
                        })
                        .set("Content-Type", "application/json")
                        .set("register-token", configAuth.baseToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('Object');
                            res.body.should.contain.all.keys('user');
                            res.body.user.active.should.equal(true);
                            done();
                        });
                });
        });

    });
})
;
