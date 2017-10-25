const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
// User
let user = require('api/models/users/user');

let config = require("config");
let moment = require("moment");
let endpoint = "/api/v1/rcVetCenters";
let adminToken = "";
// tests
describe('RoyalCanin Group', () => {
    before(function (done) {
        commonTestInit.before(function () {
            commonTestUtils.test_createUser(server, commonTestUtils.userConstants.admin, function (aToken, aUserid) {
                adminToken = aToken;
                done();
            });
        });

    });
    after(function (done) {
        commonTestInit.after();
        done();
    });
    describe('Get Clinics Data', () => {
        it('should succeed for valid data', (done) => {
            chai.request(server)
                .get(endpoint)
                .query({"postalCode": "12005"})
                .set("Authorization", "Bearer " + adminToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.prescriber.should.be.an('Array');
                    res.body.prescriber.should.have.lengthOf(4);
                done();

            });
        });
    });
});

