const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;

// Create a payment method for a client

/*
stripe.customers.createSource(
    "cus_BP4bOvpmSkstC8",
    { source: "tok_mastercard" },
    function(err, card) {
        // asynchronously called
    }
);
*/

/*
{
    "object": "card", // REQUIRED
    "exp_month": 8, // REQUIRED
    "exp_year": 2018, // REQUIRED
    "number": "4242424242424242", // REQUIRED
    "cvc": "345",
    "name": "NAME OF THE CUSTOMER AT THE CARD",
    "metadata": {
},
}*/

module.exports.createPaymentMethod = function (customer, data, callback) {
    stripe.customers.createSource(customer, {source: data})
        .then(function (source) {
            winston.debug("STRIPE: created payment method OK: ",JSON.stringify(source));
            callback(null, source);
        })
        .catch(function (err) {
            winston.error("STRIPE: creating payment method Error: ",JSON.stringify(err,0,2));
            callback(err, null);
        });
};