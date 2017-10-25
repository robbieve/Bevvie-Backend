// https://github.com/passport/express-4.x-http-bearer-example/blob/master/server.js
let Strategy = require('passport-http-bearer').Strategy;

// load up the user model
let Token       = require('api/models/users/token');

// load the auth variables
let configAuth = require('config').auth;

module.exports = function(passport){
  // Configure the Bearer strategy for use by Passport.
  //
  // The Bearer strategy requires a `verify` function which receives the
  // credentials (`token`) contained in the request.  The function must invoke
  // `cb` with a user object, which will be set at `req.user` in route handlers
  // after authentication.
  passport.use(new Strategy(
    function(token, cb) {
      Token.findByToken(token, function(err, user) {
        if (err) { return cb(err); }
        if (!user) { return cb(null, false); }
        return cb(null, user);
      });
    }));
};
