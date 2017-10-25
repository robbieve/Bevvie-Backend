const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;
// This will create an account
module.exports.createBusinessAccount = function (data, callback) {
    stripe.accounts.create(data)
        .then(function (acct) {
            winston.debug("STRIPE: created business account OK: ",JSON.stringify(acct));
            callback(null, acct);
        })
        .catch(function (err) {
            winston.error("STRIPE: creating business account Error: ",JSON.stringify(err,0,2));
            callback(err, null);
        });
};
