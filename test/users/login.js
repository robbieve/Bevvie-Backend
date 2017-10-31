const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let errorConstants = require("api/common/errorConstants");
// User
let user = require('api/models/users/user');
let token = "";
let userId = "";
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
                commonTestUtils.testBuild_createAdminUserAndClient(server,null,function (res) {
                    adminToken = res.admin.token;
                    adminUserId = res.admin.user._id;
                    token = res.userOne.token;
                    userId = res.userOne.user._id;
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
        });
    });
    describe('POST', () => {
        describe('login/ with faulting arguments', () => {
            const tests = [{}, {accessKey: 'userOne@userOne.es'}, {accessType: 'bad'},{id: 'badId'}];
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
            it('should succeed with token argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,'password': 'passw0rd', 'accessType': constants.users.accessTypeNames.password})
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
            it('should succeed with other user argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':userId,'password': 'passw0rd', 'accessType': constants.users.accessTypeNames.password})
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
        describe('login/ with facebook arguments', () => {
            it('should succeed with token argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': commonTestUtils.facebookConstants.facebookToken,
                        'accessType': constants.users.accessTypeNames.facebook})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.user.should.have.property('accessKey');
                        res.body.user.should.have.property('_id');
                        done();
                    });
            });
            it('should succeed with second login and no new user', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': commonTestUtils.facebookConstants.facebookToken,
                        'accessType': constants.users.accessTypeNames.facebook})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.user.should.have.property('accessKey');
                        res.body.user.should.have.property('_id');
                        let anId = res.body.user._id;
                        chai.request(server)
                            .post(endpoint)
                            .send({'id':adminUserId,
                                'accessKey': commonTestUtils.facebookConstants.facebookToken,
                                'accessType': constants.users.accessTypeNames.facebook})
                            .set("Content-Type", "application/json")
                            .set("register-token", configAuth.baseToken)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.have.property('token');
                                res.body.should.have.property('user');
                                res.body.user.should.have.property('accessKey');
                                res.body.user.should.have.property('_id').to.be.equal(anId);
                                done();
                            });
                    });
            });
            it('should fail for bad token', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': "badToken",
                        'accessType': constants.users.accessTypeNames.facebook})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_errorCode(403,errorConstants.errorCodes(errorConstants.errorNames.user_facebookLoginAuthFailure),err,res, function () {
                            done();
                        });
                    });
            });
        });
        describe.skip('login/ with firebase arguments', () => {
            it('should succeed with token argument', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': commonTestUtils.firebaseConstants.firebaseToken,
                        'accessType': constants.users.accessTypeNames.firebase})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.user.should.have.property('accessKey');
                        res.body.user.should.have.property('_id');
                        done();
                    });
            });
            it('should succeed with second login and no new user', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': commonTestUtils.firebaseConstants.firebaseToken,
                        'accessType': constants.users.accessTypeNames.firebase})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('token');
                        res.body.should.have.property('user');
                        res.body.user.should.have.property('accessKey');
                        res.body.user.should.have.property('_id');
                        let anId = res.body.user._id;
                        chai.request(server)
                            .post(endpoint)
                            .send({'id':adminUserId,
                                'accessKey': commonTestUtils.firebaseConstants.firebaseToken,
                                'accessType': constants.users.accessTypeNames.firebase})
                            .set("Content-Type", "application/json")
                            .set("register-token", configAuth.baseToken)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.have.property('token');
                                res.body.should.have.property('user');
                                res.body.user.should.have.property('accessKey');
                                res.body.user.should.have.property('_id').to.be.equal(anId);
                                done();
                            });
                    });
            });
            it('should fail for bad token', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send({'id':adminUserId,
                        'accessKey': "badToken",
                        'accessType': constants.users.accessTypeNames.firebase})
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        commonTestUtils.test_errorCode(403,errorConstants.errorCodes(errorConstants.errorNames.user_firebaseLoginAuthFailure),err,res, function () {
                            done();
                        });
                    });
            });
        });
    });
});
