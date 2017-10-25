const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let async = require("async");
// Stripe
let stripe = require('lib/stripe/stripe');
let timestamp = Math.floor(Date.now() / 10);
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
    description: 'Customer for development+' + timestamp + '@develapps.es',
//    source: "tok_visa" // obtained with Stripe.js
};


let userName = "testbusiness_" + timestamp;
let accountData = {
    type: 'standard',
    country: 'ES',
    email: 'development+' + timestamp + '@develapps.es',
    business_name: userName
};

let telemarketingAccountData = {
    type: 'standard',
    country: 'ES',
    email: 'telemarketing+' + timestamp + '@develapps.es',
    business_name: 'tele' + userName
};

let accountID = "";
let telemarketingID = "";

describe('Subscriptions Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        commonTestInit.before(function () {
            let chargeVisa = JSON.parse(JSON.stringify(visa));
            chargeVisa.number = "4000000000000077";
            stripe.sources.stripeInstance.charges.create({
                amount: 1000,
                currency: "eur",
                description: "Charging money to pay telemarketing",
                source: chargeVisa,
            }, function (err, charge) {
                let timestamp = Math.floor(Date.now());
                accountData.email = 'development+' + timestamp + '@develapps.es';
                stripe.accounts.createBusinessAccount(accountData, function (err, receivedUserData) {
                    accountID = receivedUserData.id;
                        stripe.accounts.createBusinessAccount(telemarketingAccountData, function (err, receivedUserData) {
                            telemarketingID = receivedUserData.id;
                            done(err);
                        });
                });
            });
        });
    });

// Needed to not fail on close
    after(function (done) {
        commonTestInit.after();
        done();
    });


    describe('Subscriptions', () => {
        it('should create a charge on customer with planvet and telemarketing procedings', (done) => {
            async.waterfall([
                function (done) {
                    userData.source = visa;
                    stripe.customers.createCustomer(userData, function (err, customer) {
                        let connectedCustomerId = customer.id;
                        done(err, connectedCustomerId)
                    });
                },
                function (connectedCustomerId, done) {
                    stripe.tokens.createToken(connectedCustomerId, accountID, function (err, aToken) {
                        let token = aToken.id
                        done(err, connectedCustomerId, token);
                    });
                },
                function (connectedCustomerId, token, done) {
                    let paymentData =
                        {
                            amount: 1000,
                            currency: "eur",
                            application_fee: 100,
                            source: token,
                            transfer_group: "{id_of_the_client}",
                        };
                    stripe.charges.createPaymentForConnectedAccount(paymentData, accountID, function (err, charge) {
                        done(err);
                    });
                },
                function (done) {
                    let transferData = {
                        amount: 50,
                        currency: "eur",
                        destination: telemarketingID,
                        transfer_group: "{id_of_the_client}",
                    };
                    stripe.transfers.createTransfer(transferData, function (err, received) {
                        should.not.exist(err);
                        received.should.be.an('object');
                        received.should.contain.all.keys('id');
                        done(err);
                    })
                }
            ], function (err, result) {
                should.not.exist(err);
                done();
            });


        });
    });
})
;
