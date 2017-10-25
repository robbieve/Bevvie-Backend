const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// Stripe
let stripe = require('lib/stripe/stripe');
let timestamp = Math.floor(Date.now() / 10)
let userName = "testbusiness_" + timestamp;
let userData = {
    type: 'standard',
    country: 'ES',
    email: 'development+' + timestamp + '@develapps.es',
    business_name: userName
};

//  https://stripe.com/docs/testing#cards
let paymentData =
    {
        amount: 1000,
        currency: "eur",
        source: "tok_visa",
    };

describe('Charges Group', function (done) {
        this.timeout(20000);
        // Needed to not recreate schemas
        before(function (done) {
            commonTestInit.before(function () {
                stripe.accounts.createBusinessAccount(userData, function (err, receivedUserData) {
                    should.not.exist(err);
                    receivedUserData.should.contain.all.keys('id', 'business_name', 'country');
                    paymentData.destination = {account: receivedUserData.id};
                    done();
                });
            });
        });


        // Needed to not fail on close
        after(function (done) {
            commonTestInit.after();
            done();
        });

        describe('Create Charges', () => {
            it('should create payment for business account', (done) => {
                stripe.charges.createPayment(paymentData, function (err, charge) {
                    should.not.exist(err);
                    charge.should.be.an('object');
                    charge.should.contain.all.keys('id', 'amount', 'currency');
                    done();
                });
            });

        })
    }
);
