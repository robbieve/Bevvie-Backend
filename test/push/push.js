const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
let moment = require('moment');
let async = require('async');
let fs = require('fs');

// User
let user = require('api/models/users/user');
let chats = require('api/models/chats/chat');
let messages = require('api/models/chats/message');

const endpoint = '/api/v1/chats';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let adminId = "";
let adminToken = "";

let allChats = {
    chatCreated: {},
    chatAccepted: {},
    chatRejected: {},
    chatExpired: {},
    chatExhausted: {},
};

describe('Push Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        async.series([
                function (doneFunc) {
                    commonTestInit.before(function () {
                        doneFunc();
                    });
                },
                function (doneFunc) {
                    commonTestUtils.testBuild_createUsersVenuesAndChats(server, null, function (res) {
                        adminId = res.admin.user._id;
                        adminToken = res.admin.token;
                        clientId = res.userOne.user._id;
                        clientIdTwo = res.userTwo.user._id;

                        clientToken = res.userOne.token;

                        Object.keys(allChats).forEach(function (element) {
                            allChats[element] = res[element];
                        });
                        doneFunc();
                    });
                }],

            function (err) {
                should.not.exist(err);
                done();
            });
    });
    // Needed to not fail on close
    after(function (done) {
        user.remove({}, (err) => {
            chats.remove({}, (err) => {
                messages.remove({}, (err) => {
                    should.not.exist(err);
                    done();
                });
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            chats.remove({}, (err) => {
                messages.remove({}, (err) => {
                    should.not.exist(err);
                    done();
                });
            });
        });
        it('should succeed for good values', (done) => {
            let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
            delete chat._id;
            let device = {
                user: clientIdTwo,
                pushToken: commonTestUtils.pushToken
            }
            chai.request(server)
                .post("/api/v1/devices")
                .send(device)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(201);
                    res.should.be.json;
                    res.body.should.be.an('object');
                    res.body.should.contain.all.keys('_id', 'pushToken', 'user');
                    chai.request(server)
                        .post(endpoint)
                        .send(allChats.chatCreated)
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + clientToken)
                        .end(function (err, res) {
                            res.should.have.status(201);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('_id', 'members', 'status');
                            setTimeout(function () {
                                done();
                            },3000);
                        });
                });
        });

    });
});