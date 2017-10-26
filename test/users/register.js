const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
// User
let user = require('api/models/users/user');
const endpoint = '/api/v1/register';

let adminId = "";

// tests

let testDictionary = {
    "admin": {
        "good": commonTestUtils.userConstants.admin,
        "goodVariants":
            {
                'country': ["GB","PT"],
                'languages': ["es","pt","en"],
                "accessType": [constants.users.accessTypeNames.facebook,constants.users.accessTypeNames.firebase],
                "banned": [true],
                "admin": [false],
            },
        "bad": {
            'country': ["badCountry"],
            'languages': ["badLanguage"],
            "accessType": ["badAccessType"],
            "banned": ["badBanned"],
            "admin": ["badAdmin"],
        },
    },
    // cannot register client users
    "userOne": {
        "good": commonTestUtils.userConstants.userOne,
        "goodVariants":
            {
                'country': ["GB","PT"],
                'languages': ["es","pt","en"],
                "accessType": [constants.users.accessTypeNames.facebook,constants.users.accessTypeNames.firebase],
                "banned": [true],
                "admin": [false],
            },
        "bad": {
            'country': ["badCountry"],
            'languages': ["badLanguage"],
            "accessType": ["badAccessType"],
            "banned": ["badBanned"],
            "admin": ["badAdmin"],
        },
    },
}


describe('Register Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        commonTestInit.before(done);
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            should.not.exist(err);
            commonTestInit.after();
            done();
        });
    });
    beforeEach((done) => { //Before each test we empty the database
        user.remove({}, (err) => {
            should.not.exist(err);
            let adminValues = JSON.parse(JSON.stringify(testDictionary.admin.good));
            chai.request(server)
                .post(endpoint)
                .send(adminValues)
                .set("register-token", configAuth.baseToken)
                .set("Content-Type", "application/json")
                .end(function (err, res) {
                    adminId = res.body.user._id;
                    done();
                });
        });
    });
    describe('POST', () => {
        describe('register/ with no Authorization header', () => {
            it('should fail with 401 unauthorized', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send(testDictionary["admin"]["good"])
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        commonTestUtils.test_error(401, err, res, function () {
                            done();
                        })
                    });
            });
        });
        Object.keys(testDictionary).forEach(function (userRole) {
            let goodArguments = testDictionary[userRole]["good"];
            let goodArgumentsVariants = testDictionary[userRole]["goodVariants"];
            let badArguments = testDictionary[userRole]["bad"];
            describe('register/ with ' + userRole + ' arguments', () => {
                Object.keys(goodArgumentsVariants).forEach(function (goodKey) {
                    let goodValues = goodArgumentsVariants[goodKey];
                    goodValues.forEach(function (goodValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[goodKey] = goodValue;
                        it('should success for good ' + goodKey + ' value ' + JSON.stringify(goodValue), (done) => {
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
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
                });
                Object.keys(badArguments).forEach(function (badKey) {
                    let badValues = badArguments[badKey];
                    badValues.forEach(function (badValue) {
                        let temp = JSON.parse(JSON.stringify(goodArguments));
                        temp[badKey] = badValue;
                        it('should fail for bad ' + badKey + ' value ' + JSON.stringify(badValue), (done) => {
                            chai.request(server)
                                .post(endpoint)
                                .send(temp)
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
        });
    });
});
