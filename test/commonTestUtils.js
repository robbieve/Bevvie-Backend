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
let breeds = require("api/models/pets/breeds");

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
exports.test_createPet = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/pets')
        .send(parameters)
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer "+token)
        .end(function (err, res) {
            res.should.have.status(201);
            res.should.be.json;
            res.body.should.be.an('object');
            res.body.should.have.property('_id');
            callback(res.body);
        });
};
exports.test_createBreed = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/breeds')
        .send(parameters)
        .set("Content-Type", "application/json")
        .set("Authorization", "Bearer "+token)
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


exports.userConstants = {
    "admin": {
        'name': 'admin',
        "age":20,
        'country': "ES",
        "languages": ["es","en"],
        "accessType": constants.users.accessTypeNames.password,
        "accessKey": "passw0rd",
        'admin': true,
    },
    "userOne": {
        'name': 'userOne',
        "age":20,
        'country': "GB",
        "languages": ["en"],
        "accessType": constants.users.accessTypeNames.password,
        "accessKey": "passw0rd",
    },
};
