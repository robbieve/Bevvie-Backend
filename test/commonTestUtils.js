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

exports.test_createCheckin = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/checkins')
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

exports.test_createBlock = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/blocks')
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

exports.test_createReport = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/reports')
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

exports.test_createChat = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/chats')
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

exports.test_createMessage = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/chats/' + parameters.chat + '/messages')
        .send({message: parameters.message})
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

exports.test_createDevice = function (server, token, parameters, callback) {
    chai.request(server)
        .post('/api/v1/devices')
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
        "birthday": moment("19951031", "YYYYMMDD"),
        'country': "ES",
        "languages": ["es", "en"],
        "accessType": constants.users.accessTypeNames.password,
        "password": "passw0rd",
        'admin': true,
    },
    "userOne": {
        'name': 'userOne',
        "birthday": moment("19971031", "YYYYMMDD"),
        'country': "GB",
        "languages": ["en"],
        "accessType": constants.users.accessTypeNames.password,
        "password": "passw0rd",
    },
    "userTwo": {
        'name': 'userTwo',
        "birthday": moment("19771031", "YYYYMMDD"),
        'country': "ES",
        "languages": ["es"],
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

exports.venueConstants = {
    "venueDevelapps": {
        "name": "The Peasant Pub",
        "location": {
            "coordinates": [-0.350823, 39.466089]
        },
        "schedule": [
            {
                "weekday": 5,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            }
        ]
    },
    "venueBolos": {
        "name": "The Bolos Pub",
        "location": {
            "coordinates": [-0.3515847, 39.4638609]
        },
        "schedule": [
            {
                "weekday": 5,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            }
        ]
    },
    "venueFarAway": {
        "name": "The Faraway Pub",
        "location": {
            "coordinates": [20.3515847, 0]
        },
        "schedule": [
            {
                "weekday": 5,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 6,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            },
            {
                "weekday": 7,
                "openTime": moment('19:00', "HH:mm"),
                "closeTime": moment('03:00', "HH:mm"),
            }
        ]
    },
};

exports.pushToken = "aa8274e5adb21089c4cfbc04e69f869b8df74e6d5e3899d4955762439611c6e1";
exports.devices = {
    deviceOne: {
        user: {},
        pushToken: exports.pushToken
    },
    deviceTwo: {
        user: {},
        pushToken: "otherPushToken"
    }
}
// Helpers

exports.testBuild_createAdminUserAndClients = function (server, values, callback) {
    let result = {};
    values = values ? values : {
        admin: exports.userConstants.admin,
        userOne: exports.userConstants.userOne,
        userTwo: exports.userConstants.userTwo
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
            function (isDone) {
                exports.test_createUser(server, values.userTwo, function (res) {
                    result.userTwo = res;
                    isDone();
                });
            },
        ],
        function (err) {
            should.not.exist(err);
            callback(result);
        });
};
exports.testBuild_createUsersAndVenues = function (server, values, callback) {
    let result = {};
    values = values ? values : {
        venueDevelapps: exports.venueConstants.venueDevelapps,
        venueBolos: exports.venueConstants.venueBolos,
        venueFarAway: exports.venueConstants.venueFarAway
    };
    let token;
    async.series([
            function (isDone) {
                exports.testBuild_createAdminUserAndClients(server, null, function (res) {
                    Object.assign(result, res);
                    token = res.admin.token;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createVenue(server, token, values.venueDevelapps, function (res) {
                    result.venueDevelapps = res;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createVenue(server, token, values.venueBolos, function (res) {
                    result.venueBolos = res;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createVenue(server, token, values.venueFarAway, function (res) {
                    result.venueFarAway = res;
                    isDone();
                });
            },

        ],
        function (err) {
            should.not.exist(err);
            callback(result);
        });
};

exports.testBuild_createUsersVenuesAndImages = function (server, values, callback) {
    let result = {};
    values = values ? values : {
        image1: fs.readFileSync("test/blobs/images/develapps.png"),
        image2: fs.readFileSync("test/blobs/images/develapps2.png"),
        image3: fs.readFileSync("test/blobs/images/develapps3.png")
    };
    let token;
    async.series([
            function (isDone) {
                exports.testBuild_createUsersAndVenues(server, null, function (res) {
                    Object.assign(result, res);
                    token = res.admin.token;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createImage(server, token, values.image1, function (res) {
                    result.image1 = res;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createImage(server, token, values.image2, function (res) {
                    result.image2 = res;
                    isDone();
                });
            },
            function (isDone) {
                exports.test_createImage(server, token, values.image3, function (res) {
                    result.image3 = res;
                    isDone();
                });
            },
            function (isDone) {
                let userOne = result.userOne.user;
                userOne.images = [
                    result.image1,
                    result.image2,
                    result.image3
                ]
                chai.request(server)
                    .post("/api/v1/users/" + userOne._id)
                    .send(userOne)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('_id');
                        result.userOne.user = res.body;
                        isDone();
                    });
            },
            function (isDone) {
                let userTwo = result.userTwo.user;
                userTwo.images = [
                    result.image1,
                    result.image2,
                    result.image3
                ]
                chai.request(server)
                    .post("/api/v1/users/" + userTwo._id)
                    .send(userTwo)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('_id');
                        result.userTwo.user = res.body;
                        isDone();
                    });
            },
            function (isDone) {
                let validation = {
                    about_validated: true,
                    validated_images: [
                        result.image1,
                        result.image2,
                        result.image3
                    ],
                    rejected_images: [],
                }
                chai.request(server)
                    .post("/api/v1/users/" + result.userOne.user._id + "/validate")
                    .send(validation)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('_id');
                        isDone();
                    });
            },
            function (isDone) {
                let validation = {
                    about_validated: true,
                    validated_images: [
                        result.image1,
                        result.image2,
                        result.image3
                    ],
                    rejected_images: [],
                }
                chai.request(server)
                    .post("/api/v1/users/" + result.userTwo.user._id + "/validate")
                    .send(validation)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + token)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.have.property('_id');
                        isDone();
                    });
            }
        ],
        function (err) {
            should.not.exist(err);
            callback(result);
        });
};

exports.testBuild_createUsersVenuesAndChats = function (server, values, callback) {
    let result = {};
    values = values ? values : {
        chatCreated: {},
        chatAccepted: {},
        chatRejected: {},
        chatExpired: {},
        chatExhausted: {},
    };
    let messages = {
        chatMessageOne: {
            message: "This is one message",
        },
        chatMessageTwo: {
            message: "This is two message",
        },
        chatMessageThree: {
            message: "This is three message",
        },
    };
    let token;
    async.series([
            function (isDone) {
                exports.testBuild_createUsersVenuesAndImages(server, null, function (res) {
                    Object.assign(result, res);
                    token = res.admin.token;
                    let members = [
                        {
                            user: res.userOne.user._id,
                            creator: true,
                        },
                        {
                            user: res.userTwo.user._id,
                        }
                    ];
                    messages.chatMessageOne.token = res.userOne.token;
                    messages.chatMessageTwo.token = res.userTwo.token;
                    messages.chatMessageThree.token = res.userOne.token;

                    values.chatCreated = {
                        status: constants.chats.chatStatusNames.created,
                        members: members,
                        message: "Initial message",
                    };
                    values.chatAccepted = {
                        status: constants.chats.chatStatusNames.accepted,
                        members: members,
                        message: "Initial message",
                    };
                    values.chatRejected = {
                        status: constants.chats.chatStatusNames.rejected,
                        members: members,
                        message: "Initial message",
                    };
                    values.chatExpired = {
                        status: constants.chats.chatStatusNames.expired,
                        members: members,
                        message: "Initial message",
                    };
                    values.chatExhausted = {
                        status: constants.chats.chatStatusNames.exhausted,
                        members: members,
                        message: "Initial message",
                    };
                    isDone();
                });
            },
            function (isDone) {
                async.each(["chatCreated", "chatAccepted", "chatRejected", "chatExpired", "chatExhausted"],
                    function (element, isDoneEach) {
                        exports.test_createChat(server, token, values[element], function (res) {
                            result[element] = res;
                            isDoneEach();
                        });
                    },
                    function (err) {
                        isDone(err);
                    }
                );
            },
            function (isDone) {
                async.each(["chatAccepted"],
                    function (element, isDoneEach) {
                        async.each(["chatMessageOne"], function (messageElement, isDoneMessage) {
                            let params = {
                                message: messages[messageElement].message,
                                chat: result[element]._id,
                            };
                            exports.test_createMessage(server, messages[messageElement].token, params, function (res) {
                                isDoneMessage();
                            });
                        }, function (err) {
                            isDoneEach(err)
                        });
                    },
                    function (err) {
                        isDone(err);
                    }
                );
            },
        ],
        function (err) {
            should.not.exist(err);
            callback(result);
        });
};