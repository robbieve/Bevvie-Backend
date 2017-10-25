const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;

// Stripe
let stripe = require('lib/stripe/stripe');
let timestamp = Math.floor(Date.now() / 1000)
let userData = {
    description: 'Customer for development+' + timestamp+'@develapps.es',
    source: "tok_visa" // obtained with Stripe.js
};

describe('Customer Group', () => {
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

        describe('Create customer', () => {
            it('should create customer', (done) => {
                stripe.customers.createCustomer(userData, function (err, customer) {
                    should.not.exist(err);
                    customer.should.be.an('object');
                    customer.should.contain.all.keys('id');
                    done();
                });
            });

        });
    }
)
;
