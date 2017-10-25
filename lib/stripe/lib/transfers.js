const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;
// This will create a transfer

/*

stripe.transfers.create({
    amount: 400,
    currency: "eur",
    destination: "acct_1B1ByFAUJQY1QNds",
    transfer_group: "ORDER_95"
}, function(err, transfer) {
    // asynchronously called
});
*/
module.exports.createTransfer = function (data, callback) {
    stripe.transfers.create(data)
        .then(function (acct) {
            winston.debug("STRIPE: created transfer OK: ", JSON.stringify(acct));
            callback(null, acct);
        })
        .catch(function (err) {
            winston.error("STRIPE: creating transfer Error: ", JSON.stringify(err, 0, 2));
            callback(err, null);
        });
};


stripe.balance.retrieve(function (err, balance) {
    // asynchronously called
});