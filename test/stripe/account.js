const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// Stripe
let stripe = require('lib/stripe/stripe');
let timestamp = Math.floor(Date.now() / 1000)
let userName = "testbusiness_"+timestamp;
let userData = {
    type: 'standard',
    country: 'ES',
    email: 'development+'+timestamp+'@develapps.es',
    business_name: userName
};

describe('Account Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        commonTestInit.before(function () {
            done();
        });
    });


// Needed to not fail on close
    after(function (done) {
        commonTestInit.after();
        done();
    });

    describe('CREATE', () => {
        it('should create account with good parameters', (done) => {
            stripe.accounts.createBusinessAccount(userData, function (err,receivedUserData) {
                should.not.exist(err);
                receivedUserData.should.be.an('object');
                receivedUserData.should.contain.all.keys('id', 'business_name', 'country');
                done();
            });
        });

    });
});
