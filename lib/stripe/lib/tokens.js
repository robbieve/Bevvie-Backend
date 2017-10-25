const config = require('config');
const stripe = require("stripe")(config.stripe.secret);
module.exports.stripeInstance = stripe;
const winston = require("lib/loggers/logger").winston;

// Create token to create paymentos on other account
/* https://stripe.com/docs/connect/shared-customers
{
  customer: "cus_FmHEcqSJ3gMfCl",
}, {
  stripe_account: "{CONNECTED_STRIPE_ACCOUNT_ID}",
}
*/
module.exports.createToken = function (customerId, forAccount, callback) {
    stripe.tokens.create({
        customer: customerId,
    }, {
        stripe_account: forAccount,
    })
        .then(function (customer) {
            winston.debug("STRIPE: created token for customer OK: ",JSON.stringify(customer));
            callback(null, customer);
        })
        .catch(function (err) {
            winston.error("STRIPE: creating token for customer Error: ",JSON.stringify(err,0,2));
            callback(err, null);
        });
};
