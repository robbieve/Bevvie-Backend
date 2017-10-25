const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;

// Create client account
/* https://stripe.com/docs/api#create_customer
{
    description: 'Customer for mason.thomas@example.com',
        source: "tok_visa" // obtained with Stripe.js
}
*/
module.exports.createCustomer = function (data, callback) {
    stripe.customers.create(data)
        .then(function (customer) {
            winston.debug("STRIPE: created customer account OK: ",JSON.stringify(customer));
            callback(null, customer);
        })
        .catch(function (err) {
            winston.error("STRIPE: creating customer account Error: ",JSON.stringify(err,0,2));
            callback(err, null);
        });
};
