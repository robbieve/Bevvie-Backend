let commonTestInit = require('test/commonTestInit');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
const fs = require("fs");
let moment = require("moment");
let async = require("async");
let bootstrap = require('bootstrap/load_data');

exports.test_createUser = function (server, parameters, callback) {
    chai.request(server)
        .post('/api/v1/register')
        .send(parameters)
        .set("Content-Type", "application/json")
        .set("register-token", configAuth.baseToken)
        .end(function (err, res) {
            res.should.have.status(201);
            res.should.be.json;
            res.body.should.be.an('object');
            res.body.should.have.property('token');
            res.body.should.have.nested.property('user._id');
            callback(res.body);
        });
};

exports.test_createVenue = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/venues')
        .send(parameters)
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer " + token)
        .end(function (err, res) {
            res.should.have.status(201);
            res.should.be.json;
            res.body.should.be.an('object');
            res.body.should.have.property('_id');
            callback(res.body);
        });
};


exports.test_createImage = function (server, aToken, imageFile, callback) {
    chai.request(server)
        .post('/api/v1/images')
        .set("Authorization", "Bearer " + aToken)
        .set("Content-Type", "multipart/form")
        .attach("file", imageFile, "file.png")
        .end(function (err, res) {
            should.not.exist(err);
            let keys = [
                "__v",
                "_id",
                "apiVersion",
                "owner",
                "contentType",
                "md5",
                "s3",
            ];
            res.body.should.contain.all.keys(keys);
            res.body.s3.should.contain.all.keys('identifier', 'url');
            callback(res.body._id);
        });
};
exports.test_createFile = function (server, aToken, imageFile, fileName, callback) {
    chai.request(server)
        .post('/api/v1/files')
        .set("Authorization", "Bearer " + aToken)
        .set("Content-Type", "multipart/form")
        .attach("file", imageFile, fileName)
        .end(function (err, res) {
            should.not.exist(err);
            let keys = [
                "__v",
                "_id",
                "apiVersion",
                "owner",
                "contentType",
                "md5",
                "s3",
            ];
            res.body.should.contain.all.keys(keys);
            res.body.s3.should.contain.all.keys('identifier', 'url');
            callback(res.body._id);
        });
};
exports.test_pagination = function (err, res, callback) {
    should.not.exist(err);
    res.should.have.status(200);
    res.should.be.json;
    res.body.should.be.an('object');
    res.body.should.contain.all.keys('total', 'docs');
    res.body.total.should.be.a('Number');
    res.body.docs.should.be.an('Array');
    callback();
};
exports.test_error = function (expectedCode, err, res, callback) {
    should.exist(err);
    res.should.have.status(expectedCode);
    res.should.be.json;
    res.body.should.be.an('object');
    res.body.should.have.property('localizedError');
    res.body.should.have.property('rawError');
    callback();
};

exports.test_errorCode = function (expectedCode, expectedErrorCode, err, res, callback) {
    should.exist(err);
    res.should.have.status(expectedCode);

    res.should.be.json;
    res.body.should.be.an('object');
    res.body.should.have.property('localizedError');
    res.body.should.have.property('rawError');
    res.body.should.have.property('errorCode');
    res.body.errorCode.should.be.equal(expectedErrorCode);
    callback();
};

// Helpers

exports.testBuild_createAdminUserAndClient = function (server, values ,callback) {
    let result = {};
    values = values ? values : {
        admin: exports.userConstants.admin,
        userOne: exports.userConstants.userOne,
    };
    async.series([
            function (isDone) {
                exports.test_createUser(server, values.admin, function (res) {
                    result.admin = res;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createUser(server, values.userOne, function (res) {
                    result.userOne = res;
                    isDone();
                });
            },
        ],
        function (err) {
            should.not.exist(err);
            callback(result);
        });
};


exports.userConstants = {
    "admin": {
        'name': 'admin',
        "age": 20,
        'country': "ES",
        "languages": ["es", "en"],
        "accessType": constants.users.accessTypeNames.password,
        "password": "passw0rd",
        'admin': true,
    },
    "userOne": {
        'name': 'userOne',
        "age": 20,
        'country': "GB",
        "languages": ["en"],
        "accessType": constants.users.accessTypeNames.password,
        "password": "passw0rd",
    },
};

exports.facebookConstants = {
    facebookId: "287602358398692",
    facebookToken: "EAACCBJwQKEMBABT5jrSHl0c1UzLmHiMoQNzUch6zBEW9GlVlBAdXPAxWwZAqtw6H9ybOtbKuCtWUUf2HQ5m1P9rCZCShZAS4oRoZA4lIb4QJux9BVoLZBAcxDw1zPoMGotJgZBVmmzURL0J3UvyDfai6vMYywXIJtpTIVbwP8drlyvlY3fTy5VTiwBMpSt6kZAlpEZAYZBGGqYILRTEgsK14yra6FxZAf8ogruMpRwTtUwwP4DuBdtefu5MaZAu4p1UPvYZD",
};

exports.firebaseConstants = {
    firebaseToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6ImY4MjIyYjYzYmIwNTc0NDIzNDIyMWVhNDBkZjY1YjM0N2FlMDA0OTIifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vYmV2dmllLWIyM2I2IiwiYXVkIjoiYmV2dmllLWIyM2I2IiwiYXV0aF90aW1lIjoxNTA5NDQyMzc2LCJ1c2VyX2lkIjoic0M4WEM0RnpsOVZTRzZQNW9ZaGFPY1c4V0JYMiIsInN1YiI6InNDOFhDNEZ6bDlWU0c2UDVvWWhhT2NXOFdCWDIiLCJpYXQiOjE1MDk0NDIzNzYsImV4cCI6MTUwOTQ0NTk3NiwicGhvbmVfbnVtYmVyIjoiKzM0Njk2NjcxNDgxIiwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJwaG9uZSI6WyIrMzQ2OTY2NzE0ODEiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwaG9uZSJ9fQ.AJtYcJDugAgVAtwlyHddmrCKwhod9w25oD7XC4E7Pzmoh_9pvSsqQdlE48Mgd0CWD8ClSLt3_QCWhxCwEyfe2cIXAH_dwZ_EBdBlpWLlPnPQni9dGZQr9Qv1akSiAsRq9_6AHyg24YWDEwqQFxD90NIZ3VoQjamntSTB8GNni1FbsH6zsv7TQrrdc4wOPapZ5NTFrYcc0_LKilGvvn2NNnTsJRI8D0arG4lRC2rdxYOwqngzjUhMyY_h2IypLxy2hNtXRxZYtZgnR4e4LEA1xiNzHu2M7nWTE1-kR-QWhKcqPNN3lL5ti6WJi2FHS6Frf2gTgq8eR3JLRcSPVydj3g",
};

exports.venueConstants={
    "venueDevelapps":{
        "name": "The Peasant Pub",
        "location": {
            "coordinates": [39.466089,-0.350823]
        },
        "schedule":[
            {
                "weekday": 5,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            }
        ]
    },
    "venueBolos":{
        "name": "The Bolos Pub",
        "location": {
            "coordinates": [39.4638609,-0.3515847]
        },
        "schedule":[
            {
                "weekday": 5,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            }
        ]
    },
    "venueFarAway":{
        "name": "The Faraway Pub",
        "location": {
            "coordinates": [0,20.3515847]
        },
        "schedule":[
            {
                "weekday": 5,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00',"HH:mm"),
                "closeTime": moment('03:00',"HH:mm"),
            }
        ]
    },
};