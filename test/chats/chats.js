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
let block = require('api/models/users/block');

let errorConstants = require("api/common/errorConstants");

const endpoint = '/api/v1/chats';
const bootstrap = require("bootstrap/load_data");

let clientId = "";
let clientIdTwo = "";
let clientToken = "";
let clientTokenTwo = "";
let clients = {

}
let adminId = "";
let adminToken = "";

let allChats = {
    chatCreated: {},
    chatAccepted: {},
    chatRejected: {},
    chatExpired: {},
    chatExhausted: {},
};

describe('Chats Group', () => {
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
                        clientTokenTwo = res.userTwo.token;
                        clients["clientThree"]={
                            user: res.userThree.user,
                            token: res.userThree.token
                        }
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
                block.remove({}, (err) => {

                    messages.remove({}, (err) => {
                        should.not.exist(err);
                        done();
                    });
                });
            });
        });
    });
    describe('POST', () => {
        beforeEach((done) => { //Before each test we empty the database
            chats.remove({}, (err) => {
                messages.remove({}, (err) => {
                    block.remove({}, (err) => {
                        should.not.exist(err);
                        done();
                    });
                });
            });
        });
        it('should succeed for good values', (done) => {
            let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
            delete chat._id;
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
                    res.body.status.should.equal(constants.chats.chatStatusNames.created)
                    done();
                });
        });

        it('should fail for bad UserId', (done) => {
            let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
            delete chat._id;
            chat.members = [{
                user: "badId"
            }];
            chai.request(server)
                .post(endpoint)
                .send(chat)
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    });
                });
        });
        it('should fail for blocked user UserId', (done) => {
            chai.request(server)
                .post("/api/v1/blocks")
                .send({
                    userBlocks: clients.clientThree.user._id,
                    userBlocked: clientId
                })
                .set("Content-Type", "application/json")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    chai.request(server)
                        .post(endpoint)
                        .send(allChats.chatCreated)
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + adminToken)
                        .end(function (err, res) {
                            commonTestUtils.test_errorCode(403, errorConstants.errorCodes(errorConstants.errorNames.chat_chatBlocked), err, res, function () {
                                done();
                            });
                        });

                });
        });
        it('should succeed for good values when both users try to create', (done) => {
            let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
            delete chat._id;
            let newChatId;
            async.series([
                function (isDone) {
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
                            newChatId = res.body._id;
                            res.body.status.should.equal(constants.chats.chatStatusNames.created);
                            isDone();
                        });
                },
                function (isDone) {
                    chai.request(server)
                        .post(endpoint)
                        .send(allChats.chatCreated)
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + clients.clientThree.token)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('_id', 'members', 'status');
                            res.body._id.should.equal(newChatId);
                            res.body.status.should.equal(constants.chats.chatStatusNames.accepted);
                            isDone();
                        });
                },
            ], function (err) {
                done();
            })

        });
    });
    describe('GET', () => {
        before((done) => { //Before each test create the object
            chats.remove({}, (err) => {
                block.remove({}, (err) => {
                    messages.remove({}, (err) => {
                        commonTestUtils.test_createChat(server, adminToken, allChats.chatCreated, function (realChat) {
                            allChats.chatCreated = realChat;
                            commonTestUtils.test_createChat(server, adminToken, allChats.chatAccepted, function (realChat) {
                                allChats.chatAccepted = realChat;
                                done();
                            });
                        });
                    });
                });
            });
        });
        describe('chats/', () => {
            it('should fail with no auth header', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should succeed with client token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });
            it('should succeed with admin token', (done) => {
                chai.request(server)
                    .get(endpoint)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            done();
                        });
                    });
            });

            it('should succeed with user', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'user': clientId})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            res.body.docs[0].members[0].user._id.should.equal(clientId);
                            done();
                        });
                    });
            });
            it('should succeed with status', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({'status': constants.chats.chatStatusNames.accepted})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0].members[0].user._id.should.equal(clientId);
                            done();
                        });
                    });
            });

            it('should succeed with statuses', function (done) {
                chai.request(server)
                    .get(endpoint)
                    .query({
                        'status': [
                            constants.chats.chatStatusNames.created,
                            constants.chats.chatStatusNames.accepted,
                            constants.chats.chatStatusNames.exhausted,
                        ]
                    })
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(2);
                            res.body.docs[0].members[0].user._id.should.equal(clientId);
                            done();
                        });
                    });
            });
        });
        describe('chats/id', () => {
            it('should success for admin', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + allChats.chatCreated._id)
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'members', 'status');
                        done();
                    });
            });
            it('should success for client', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + allChats.chatCreated._id)
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(200);
                        res.should.be.json;
                        res.body.should.be.an('Object');
                        res.body.should.contain.all.keys('_id', 'members', 'status');
                        done();
                    });
            });
            it('should fail for bad id with 400', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + 'bad--id')
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        })

                    });
            });
            it('should fail for non existing chat id with 404', function (done) {
                chai.request(server)
                    .get(endpoint + '/' + "59ce0578f418c80bde508890")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(404, err, res, function () {
                            done();
                        })

                    });
            });
        });

    });
    describe('DELETE', function () {
        beforeEach((done) => { //Before each test create the object
            chats.remove({}, (err) => {
                messages.remove({}, (err) => {
                    commonTestUtils.test_createChat(server, adminToken, allChats.chatCreated, function (realChat) {
                        allChats.chatCreated = realChat;
                        commonTestUtils.test_createChat(server, adminToken, allChats.chatAccepted, function (realChat) {
                            allChats.chatAccepted = realChat;
                            done();
                        });
                    });
                });
            });
        });
        it('should succeed for admin', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + allChats.chatCreated._id)
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should succeed for client', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + allChats.chatCreated._id)
                .set("Authorization", "Bearer " + clientToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Object');
                    done();
                });
        });
        it('should fail for bad id with 400', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + 'bad-id')
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(400, err, res, function () {
                        done();
                    })

                });
        });
        it('should fail for bad client id with 404', function (done) {
            chai.request(server)
                .delete(endpoint + '/' + "59ce0742e8ae010c38c73f9f")
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    commonTestUtils.test_error(404, err, res, function () {
                        done();
                    })

                });
        });

    });
    describe('Messages', function () {
        describe("POST", function () {
            beforeEach((done) => { //Before each test create the object
                chats.remove({}, (err) => {
                    block.remove({}, (err) => {
                        messages.remove({}, (err) => {
                            commonTestUtils.test_createChat(server, adminToken, allChats.chatCreated, function (realChat) {
                                allChats.chatCreated = realChat;
                                commonTestUtils.test_createChat(server, adminToken, allChats.chatAccepted, function (realChat) {
                                    allChats.chatAccepted = realChat;
                                    done();
                                });
                            });
                        });
                    });
                });
            });
            it('should succeed for good values', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                let message = {
                    message: "This is a test message"
                };
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/messages")
                    .send(message)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.contain.all.keys('_id', 'message', 'chat');
                        done();
                    });
            });
            it('should fail for blocked user UserId', (done) => {
                chai.request(server)
                    .post("/api/v1/blocks")
                    .send({
                        userBlocks: clientIdTwo,
                        userBlocked: clientId
                    })
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                        let message = {
                            message: "This is a test message"
                        };
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(message)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                commonTestUtils.test_errorCode(403, errorConstants.errorCodes(errorConstants.errorNames.chat_chatBlocked), err, res, function () {
                                    done();
                                });
                            });

                    });
            });
            it('should succeed with last seen', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                let message = {
                    message: "This is a test message"
                };
                let messageId, messageIdTwo;
                async.series([
                    function (doneMessage) {
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(message)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'message', 'chat');
                                messageId = res.body._id;
                                doneMessage();
                            });
                    },
                    function (doneMessage) {
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(message)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientTokenTwo)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'message', 'chat');
                                messageIdTwo = res.body._id;
                                doneMessage();
                            });
                    },
                ], function (err) {
                    chai.request(server)
                        .get("/api/v1/chats/" + chat._id)
                        .set("Content-Type", "application/json")
                        .set("Authorization", "Bearer " + clientToken)
                        .end(function (err, res) {
                            res.should.have.status(200);
                            res.should.be.json;
                            res.body.should.be.an('object');
                            res.body.should.contain.all.keys('_id', 'status');
                            res.body.status.should.equal(constants.chats.chatStatusNames.accepted);
                            res.body.members[0].lastMessageSeen.should.equal(messageId);
                            res.body.members[1].lastMessageSeen.should.equal(messageIdTwo);
                            done();
                        });
                })

            });
            it('should succeed for created and receiver posting message accepting chat', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
                let message = {
                    message: "This is a test message"
                };
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/messages")
                    .send(message)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clients.clientThree.token)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.contain.all.keys('_id', 'message', 'chat');
                        chai.request(server)
                            .get("/api/v1/chats/" + chat._id)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clients.clientThree.token)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'status');
                                res.body.status.should.equal(constants.chats.chatStatusNames.accepted);
                                done();
                            });

                    });
            });
            it('should fail for fourth message ', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                let message = {
                    message: "This is a test message"
                };
                async.eachSeries([message, message, message],
                    function (aMessage, doneMessage) {
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(aMessage)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'message', 'chat');
                                doneMessage()
                            });
                    },
                    function (err) {
                        should.not.exist(err);
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(message)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                commonTestUtils.test_errorCode(400, errorConstants.errorCodes(errorConstants.errorNames.chat_chatExhausted), err, res, function () {
                                    done();
                                });
                            });
                    });
            });
            it('should succeed for third message and chat exhausted', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                let message = {
                    message: "This is a test message"
                };
                async.eachSeries([message, message, message],
                    function (aMessage, doneMessage) {
                        chai.request(server)
                            .post("/api/v1/chats/" + chat._id + "/messages")
                            .send(aMessage)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                res.should.have.status(201);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'message', 'chat');
                                chai.request(server)
                                    .post("/api/v1/chats/" + chat._id + "/messages")
                                    .send(aMessage)
                                    .set("Content-Type", "application/json")
                                    .set("Authorization", "Bearer " + clientTokenTwo)
                                    .end(function (err, res) {
                                        res.should.have.status(201);
                                        res.should.be.json;
                                        res.body.should.be.an('object');
                                        res.body.should.contain.all.keys('_id', 'message', 'chat');
                                        doneMessage()
                                    });
                            });

                    },
                    function (err) {
                        should.not.exist(err);
                        chai.request(server)
                            .get("/api/v1/chats/" + chat._id)
                            .send(message)
                            .set("Content-Type", "application/json")
                            .set("Authorization", "Bearer " + clientToken)
                            .end(function (err, res) {
                                res.should.have.status(200);
                                res.should.be.json;
                                res.body.should.be.an('object');
                                res.body.should.contain.all.keys('_id', 'status');
                                res.body.status.should.equal(constants.chats.chatStatusNames.exhausted);
                                done();
                            });
                    });
            });
            it('should fail for created chat and not receiver values', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
                let message = {
                    message: "This is a test message"
                };
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/messages")
                    .send(message)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_errorCode(400, errorConstants.errorCodes(errorConstants.errorNames.chat_chatNotYetAccepted), err, res, function () {
                            done();
                        });
                    });
            });
            it('should fail for bad UserId', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatCreated));
                delete chat._id;
                chat.members = [{
                    user: "badId"
                }];
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/messages")
                    .send(chat)
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(400, err, res, function () {
                            done();
                        });
                    });
            });
        });
        describe("GET", function () {
            let message;
            beforeEach((done) => { //Before each test create the object
                chats.remove({}, (err) => {
                    messages.remove({}, (err) => {
                        commonTestUtils.test_createChat(server, adminToken, allChats.chatCreated, function (realChat) {
                            allChats.chatCreated = realChat;
                            let aMessage = {
                                message: "this is a test message",
                                chat: realChat._id,
                            };
                            commonTestUtils.test_createMessage(server, adminToken, aMessage, function (realMessage) {
                                message = realMessage;
                                done();
                            });
                        });
                    });
                });
            });
            it('should fail with no auth header', (done) => {
                chai.request(server)
                    .get("/api/v1/chats/" + message.chat + "/messages")
                    .set("Content-Type", "application/json")
                    .end(function (err, res) {
                        res.should.have.status(401);
                        done();
                    });
            });
            it('should succeed with client token', (done) => {
                chai.request(server)
                    .get("/api/v1/chats/" + message.chat + "/messages")
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with admin token', (done) => {
                chai.request(server)
                    .get("/api/v1/chats/" + message.chat + "/messages")
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });

            it('should succeed with date', function (done) {
                chai.request(server)
                    .get("/api/v1/chats/" + message.chat + "/messages")
                    .query({'fromDate': moment().add(-1, "minute").toISOString()})
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            done();
                        });
                    });
            });
            it('should succeed with sort & limit', function (done) {
                chai.request(server)
                    .get("/api/v1/chats/" + message.chat + "/messages")
                    .query({
                        "sort": {
                            "field": "createdAt",
                            "order": constants.sortOrderNames.desc
                        },
                        limit: 1
                    })
                    .set("Authorization", "Bearer " + adminToken)
                    .end(function (err, res) {
                        commonTestUtils.test_pagination(err, res, function () {
                            res.body.docs.should.be.an('Array');
                            res.body.docs.should.have.lengthOf(1);
                            res.body.docs[0]._id.should.equal(message._id);
                            done();
                        });
                    });
            });
        })
    })
    describe('Reject', function () {
        describe("POST", function () {
            beforeEach((done) => { //Before each test create the object
                chats.remove({}, (err) => {
                    messages.remove({}, (err) => {
                        commonTestUtils.test_createChat(server, adminToken, allChats.chatCreated, function (realChat) {
                            allChats.chatCreated = realChat;
                            commonTestUtils.test_createChat(server, adminToken, allChats.chatAccepted, function (realChat) {
                                allChats.chatAccepted = realChat;
                                done();
                            });
                        });
                    });
                });
            });
            it('should succeed for good values', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/reject")
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientTokenTwo)
                    .end(function (err, res) {
                        res.should.have.status(201);
                        res.should.be.json;
                        res.body.should.be.an('object');
                        res.body.should.contain.all.keys('_id', 'status');
                        res.body.status.should.equal(constants.chats.chatStatusNames.rejected);
                        done();
                    });
            });
            it('should fail for created chat and creator calling', (done) => {
                let chat = JSON.parse(JSON.stringify(allChats.chatAccepted));
                chai.request(server)
                    .post("/api/v1/chats/" + chat._id + "/reject")
                    .set("Content-Type", "application/json")
                    .set("Authorization", "Bearer " + clientToken)
                    .end(function (err, res) {
                        commonTestUtils.test_error(403, err, res, function () {
                            done();
                        });
                    });
            });
        });
    })
});