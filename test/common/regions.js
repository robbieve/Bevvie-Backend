const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');


let config = require("config");
let moment = require("moment");
let endpoint = "/api/v1/regions";
let adminToken = "";
// tests
describe('Regions Group', () => {
    before(function (done) {
        commonTestInit.before(done);
    });
    after(function (done) {
        commonTestInit.after();
        done();
    });
    describe('Get Regions Data', () => {
        it('should succeed for ES', (done) => {
            chai.request(server)
                .get(endpoint)
                .query({"country": "ES"})
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Array');
                    res.body.should.deep.equal(constants.spainRegions);
                    done();
                });
        });
        it('should succeed for PT', (done) => {
            chai.request(server)
                .get(endpoint)
                .query({"country": "PT"})
                .set("register-token", configAuth.baseToken)
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.be.json;
                    res.body.should.be.an('Array');
                    res.body.should.deep.equal(constants.portugalRegions);
                    done();
                });
        });
    });
});

