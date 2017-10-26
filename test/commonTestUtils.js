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
            let token = res.body.token;
            let userid = res.body.user._id;
            callback(token, userid);
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
exports.test_createPlan = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/plans')
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
exports.test_createTreatment = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/treatments')
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
exports.test_createRegionPonderation = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/regionPonderations')
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

exports.test_prepareBreeds = function(callback){
    bootstrap.initDatabase(function () {
        breeds.find({species: constants.speciesNames.Cats}, function (err, cats) {
            should.not.exist(err);
            let catBreeds = cats;
            breeds.find({species: constants.speciesNames.Dogs}, function (err, dogs) {
                should.not.exist(err);
                let dogBreeds = dogs;
                callback(catBreeds,dogBreeds);
            })
        })
    });
};
exports.test_prepareRelatedCVUser = function (server,admin ,callback) {
    let user = JSON.parse(JSON.stringify(exports.userConstants.userOne));
    user.email =exports.registeredMail;
    user.password = exports.registeredPass;
    let adminToken, token, vetCenter;
    async.series([
        function (isDone) {
            if (admin && admin._id){
                return isDone();
            }
            admin = JSON.parse(JSON.stringify(exports.userConstants.admin));
            admin.email = "automatedTest@email.es";
            chai.request(server)
                .post('/api/v1/register')
                .send(admin)
                .set("Content-Type", "application/json")
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('token');
                    res.body.should.have.nested.property('user._id');
                    adminToken = res.body.token;
                    admin = res.body.user;
                    isDone()
                });
        },
        function (isDone) {
            // vetCenter
            let temp2 = JSON.parse(JSON.stringify(exports.userConstants.vetcenter));
            temp2.origin.user = admin._id;
            temp2.email = "automatedTestVC@vc.es";
            chai.request(server)
                .post('/api/v1/register')
                .send(temp2)
                .set("Content-Type", "application/json")
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('token');
                    res.body.should.have.nested.property('user._id');
                    vetCenter = res.body.user;
                    vetCenter.token = res.body.token;
                    isDone()
                });
        },
        function (isDone) {
            // Potential client
            user.origin = {
                originType: constants.originNames.originCV,
                user: vetCenter._id
            };
            chai.request(server)
                .post('/api/v1/register')
                .send(user)
                .set("Content-Type", "application/json")
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.have.property('token');
                    res.body.should.have.nested.property('user._id');
                    token = res.body.token;
                    user = res.body.user;
                    isDone()
                });
        },
    ], function (err) {
        should.not.exist(err);
        admin.token = adminToken;
        user.token = token;
        let result = {
            admin: admin,
            user: user,
            vetCenter: vetCenter,
        };
        callback(result);
    });
};
exports.test_prepareFinalUserWithDog = function (server,admin, dogBreeds,callback) {
    let user = JSON.parse(JSON.stringify(exports.userConstants.userOne));
    user.email =exports.registeredMail;
    user.password = exports.registeredPass;
    let adminToken, token, vetCenter,aDog;
    async.series([
        function (isDone) {
            exports.test_prepareRelatedCVUser(server,admin,function (result) {
                admin = result.admin;
                adminToken = result.admin.token;
                user = result.user;
                token = result.admin.token;
                vetCenter = result.vetCenter;
                isDone();
            })
        },
        function (isDone) {
            aDog = JSON.parse(JSON.stringify(exports.petConstants.Dogs));
            aDog.owner = user._id;
            aDog.mainBreed = dogBreeds[0]._id;
            exports.test_createPet(server, adminToken, aDog, function (result) {
                aDog = result;
                isDone();
            })

        },
        function (isDone) {
            let params = JSON.parse(JSON.stringify(exports.upgradeConstants));
            params.royalCaninPassword = exports.registeredPass;
            chai.request(server)
                .post('/api/v1/users/' + user._id + "/upgrade")
                .set("Authorization", "Bearer " + adminToken)
                .send(params)
                .set("Content-Type", "application/json")
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles');
                    isDone();
                });
        },
    ], function (err) {
        should.not.exist(err);
        admin.token = adminToken;
        user.token = token;
        let result = {
            admin: admin,
            user: user,
            vetCenter: vetCenter,
            pet: aDog
        };
        callback(result);
    });
};
exports.test_prepareFinalUserWithDogAndCreditCard = function (server,admin, dogBreeds,callback) {
    let user = JSON.parse(JSON.stringify(exports.userConstants.userOne));
    user.email =exports.registeredMail;
    user.password = exports.registeredPass;
    let adminToken, token, vetCenter,aDog;
    async.series([
        function (isDone) {
            exports.test_prepareFinalUserWithDog(server,admin,dogBreeds,function (result) {
                admin = result.admin;
                adminToken = result.admin.token;
                user = result.user
                token = result.user.token;
                vetCenter = result.vetCenter;
                aDog = result.pet;
                isDone();
            })
        },
        function (isDone) {
            let params = JSON.parse(JSON.stringify(exports.creditCardConstants));
            chai.request(server)
                .post('/api/v1/users/' + user._id + "/creditcard")
                .set("Authorization", "Bearer " + adminToken)
                .send(params)
                .set("Content-Type", "application/json")
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'updatedAt', 'createdAt', 'email', 'apiVersion', 'roles', 'stripeCardToken', 'stripeId');
                    isDone();
                });
        },
    ], function (err) {
        should.not.exist(err);
        admin.token = adminToken;
        user.token = token;
        let result = {
            admin: admin,
            user: user,
            vetCenter: vetCenter,
            pet: aDog
        };
        callback(result);
    });
};
exports.test_createFinalUserWithPlan = function (server, admin, dogBreeds,callback) {
    let user = JSON.parse(JSON.stringify(exports.userConstants.userOne));
    user.email =exports.registeredMail;
    user.password = exports.registeredPass;
    let adminToken, token, vetCenter, aDog;
    let aPlan = exports.planConstants.plan;
    async.series([
        function (isDone) {
            exports.test_prepareFinalUserWithDogAndCreditCard(server,admin,dogBreeds,function (result) {
                admin = result.admin;
                adminToken = result.admin.token;
                user = result.user;
                token = result.user.token;
                aPlan.owner = result.user._id;
                aPlan.vetCenter = result.vetCenter._id;
                aPlan.pet = result.pet._id;
                vetCenter = result.vetCenter;
                aDog=result.pet;
                isDone();
            })
        },
        function (isDone) {
            chai.request(server)
                .post("/api/v1/plans/")
                .send(aPlan)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'statuses');
                    aPlan = res.body;
                    isDone();
                });
        }
    ], function (err) {
        should.not.exist(err);
        admin.token = adminToken;
        user.token = token;
        let result = {
            admin: admin,
            user: user,
            plan: aPlan,
            vetCenter: vetCenter,
            pet: aDog
        };
        callback(result);
    });
};
exports.test_createFinalUserWithActivePlan = function (server, admin, dogBreeds,callback) {
    let user = JSON.parse(JSON.stringify(exports.userConstants.userOne));
    user.email =exports.registeredMail;
    user.password = exports.registeredPass;
    let adminToken, token, vetCenter, aDog;
    let aPlan = exports.planConstants.plan;
    async.series([
        function (isDone) {
            exports.test_createFinalUserWithPlan(server,admin,dogBreeds,function (result) {
                admin = result.admin;
                adminToken = result.admin.token;
                user = result.user;
                token = result.user.token;
                aPlan = result.plan;
                aDog = result.pet;
                vetCenter = result.vetCenter;
                isDone();
            })
        },
        function (isDone) {
            chai.request(server)
                .post("/api/v1/plans/" + aPlan._id + "/activate")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    res.body.should.contain.all.keys('_id', 'statuses');
                    res.body.statuses.should.have.lengthOf(2);
                    isDone();
                });
        }
    ], function (err) {
        should.not.exist(err);
        admin.token = adminToken;
        user.token = token;
        let result = {
            admin: admin,
            user: user,
            plan: aPlan,
            vetCenter: vetCenter,
            pet: aDog
        };
        callback(result);
    });
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
        "age":20,
        'country': "UK",
        "languages": ["en"],
        "accessType": constants.users.accessTypeNames.password,
        "accessKey": "passw0rd",
    },
};
