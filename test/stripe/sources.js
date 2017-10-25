const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// Stripe
let stripe = require('lib/stripe/stripe');
let timestamp = Math.floor(Date.now() / 1000);
let visa = {
    "object": "card", // REQUIRED
    "exp_month": 8, // REQUIRED
    "exp_year": 2018, // REQUIRED
    "number": "4242424242424242", // REQUIRED
    "cvc": "345",
    "name": "NAME OF THE CUSTOMER AT THE CARD",
    "metadata": {
        name: "O rey!",
    },
};
let userData = {
    description: 'Customer for development+' + timestamp+'@develapps.es',
    source: "tok_visa" // obtained with Stripe.js
};

let customerID = "";

describe('Sources Group', () => {
        // Needed to not recreate schemas
        before(function (done) {
            commonTestInit.before(function () {
                stripe.customers.createCustomer(userData, function (err, customer) {
                    should.not.exist(err);
                    customer.should.be.an('object');
                    customer.should.contain.all.keys('id');
                    customerID = customer.id;
                    done();
                });
            });
        });

        // Needed to not fail on close
        after(function (done) {
            commonTestInit.after();
            done();
        });

        describe('Create credit card', () => {
            it('should create credit card', (done) => {
                stripe.sources.createPaymentMethod(customerID,visa, function (err, source) {
                    should.not.exist(err);
                    source.should.be.an('object');
                    source.should.contain.all.keys('id');
                    done();
                });
            });

        });
    }
)
;
