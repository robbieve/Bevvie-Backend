const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;

// This will create a charge
module.exports.createPayment = function (data, callback) {
    stripe.charges.create(data).then(function (charge) {
        winston.debug("STRIPE: created charge: ", JSON.stringify(charge));
        callback(null, charge);
    }).catch(function (err) {
        winston.error("STRIPE: error creating charges: ", JSON.stringify(err, 0, 2));
        callback(err, null);
    });
};

// This will create a charge for third party
module.exports.createPaymentForConnectedAccount = function (data, account, callback) {
    stripe.charges.create(data, {stripe_account: account})
        .then(function (charge) {
            winston.debug("STRIPE: created charge: ", JSON.stringify(charge));
            callback(null, charge);
        })
        .catch(function (err) {
            winston.error("STRIPE: error creating charges: ", JSON.stringify(err, 0, 2));
            callback(err, null);
        });
};