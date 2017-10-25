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
                'email': ['admin@admin.es']
            },
        "bad": {
            "email": ["notAMail", "nota@goodmail", undefined],
            "password": [null, undefined],
            "name": [null, undefined],
            "image": ["notanid"],
            "roles": ["ThisIsNotARole", undefined],
        },
    },
    // cannot register client users
    "potentialClient": {
        "good": commonTestUtils.userConstants.potentialClient,
        "goodVariants":
            {
                "phones": [
                    966777555,
                    ["966777555", 966777555],
                    ["+34966777555", 966777555],
                ],
                "statuses": [
                    {status: constants.statusNames.pending},
                    {status: constants.statusNames.active},
                    {status: constants.statusNames.goToVetcenter},
                    {status: constants.statusNames.inactive},
                    {status: constants.statusNames.interested},
                    {status: constants.statusNames.notInterested},
                    {status: constants.statusNames.preactive},
                ],
                "origin": [
                    {originType: constants.originNames.originWeb},
                    {originType: constants.originNames.originCV},
                    {originType: constants.originNames.originTelemarketing},
                ]
            },
        "bad": {
            "email": ["notAMail", "nota@goodmail", undefined],
            "password": [null, undefined],
            "name": [null, undefined],
            "image": ["notanid"],
            "roles": ["ThisIsNotARole", undefined],
            "phones": ["badphone", 96144544],
            "address": [{
                'address': {
                    'city': 'Val',
                    'region': 'Valencia',
                    'country': 'Spain'
                },
                'address': {
                    'address': 'Calle',
                    'region': 'Valencia',
                    'country': 'Spain'
                },
                'address': {
                    'address': 'Calle',
                    'city': 'Val',
                    'country': 'Spain'
                },
                'address': {
                    'address': 'Calle',
                    'city': 'Val',
                    'region': 'Valencia',
                },
            }],
            "statuses": [{status: "NotValidStatus"}],
            "origin": [{
                user: "notAValidID",
                originType: constants.originNames.originWeb
            }, {originType: "notAValidOrigin"}],
            "contracts": [{contract: "notAValidId"}],
        },
    },
    "telemarketing": {
        "good": commonTestUtils.userConstants.telemarketing,
        "goodVariants": {
            'email': ['telemarketing@telemarketing.es']
        },
        "bad": {
            "email": ["notAMail", "nota@goodmail", undefined],
            "password": [null, undefined],
            "name": [null, undefined],
            "image": ["notanid"],
            "roles": ["ThisIsNotARole", undefined],
        },
    },
    "vetcenter": {
        "good": commonTestUtils.userConstants.vetcenter,
        "goodVariants":
            {
                "size": [
                    constants.vetSizesNames.large,
                    constants.vetSizesNames.mid,
                    constants.vetSizesNames.small,
                ],
                "species": [
                    constants.speciesNames.Cats,
                    constants.speciesNames.Dogs,
                    constants.species,
                ]
            },
        "bad": {
            "email": ["notAMail", "nota@goodmail", undefined],
            "password": [null, undefined],
            "name": [null, undefined],
            "image": ["notanid"],
            "roles": ["ThisIsNotARole", undefined],
            "royalCaninCode": [undefined],
            "origin": [{"user":"AVeryBadUSerId"}],
            "size": ["badSize"],
            "legalName": [undefined],
            "NIF": [undefined],
            "contracts": [{contract: "notAValidId"}],
            'contact': [
                {
                    surname: "surname",
                    phone: 966777555,
                    email: "contact@contact.es",
                },
                {
                    name: "name",
                    phone: 966777555,
                    email: "contact@contact.es",
                },
                {
                    name: "name",
                    surname: "surname",
                    email: "contact@contact.es",
                },
                {
                    name: "name",
                    surname: "surname",
                    phone: 966777555,
                    email: "bademail.es",
                },
            ],
            "address": [{
                'address': {
                    'city': 'Val',
                    'region': 'Valencia',
                    'country': 'ES'
                },
                'address': {
                    'address': 'Calle',
                    'region': 'Valencia',
                    'country': 'ES'
                },
                'address': {
                    'address': 'ES',
                    'city': 'Val',
                    'country': 'Spain'
                },
                'address': {
                    'address': 'Calle',
                    'city': 'Val',
                    'region': 'Valencia',
                },
            }],
            "phone": ["notPhone", "96677755", 96677755],
            "species":["NotValid","cats","dogs"],
            "economicResults":[{pdfResults:{s3:{url:"notAURL"}}}, {incomeStatement:{income: "notAnumber"}},
                {incomeStatement:{purchases: "notAnumber"}},{incomeStatement:{staff: "notAnumber"}},
                {incomeStatement:{operativeSpending: "notAnumber"}},{incomeStatement:{financialSpending: "notAnumber"}},]

        },
    },
};


describe.skip('Register Group', () => {
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
            adminValues.email = "good@emailadmin.com";
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
                            if (userRole === constants.roleNames.vetcenter && temp.origin.user === undefined) { temp.origin.user = adminId; }
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
                            if (userRole === constants.roleNames.vetcenter && temp.origin.user === undefined) { temp.origin.user = adminId; }
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
        describe('register/ with existing user', () => {
            it('should fail with existing code', (done) => {
                chai.request(server)
                    .post(endpoint)
                    .send(testDictionary["admin"]["good"])
                    .set("Content-Type", "application/json")
                    .set("register-token", configAuth.baseToken)
                    .end(function (err, res) {
                        chai.request(server)
                            .post(endpoint)
                            .send(testDictionary["admin"]["good"])
                            .set("Content-Type", "application/json")
                            .set("register-token", configAuth.baseToken)
                            .end(function (err, res) {
                                commonTestUtils.test_error(409, err, res, function () {
                                    done();
                                });
                            });
                    });
            });
        });
    });
});
