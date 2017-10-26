// load all the things we need
let LocalStrategy    = require('passport-local').Strategy;

// load up the user model
let User       = require('api/models/users/user');

// load the auth variables
let configAuth = require('config').auth;

module.exports = function(passport) {

  // https://scotch.io/tutorials/easy-node-authentication-setup-and-local
  // https://github.com/scotch-io/easy-node-authentication
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we may override with email
        usernameField : 'id',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {
        if (username)
            username = username.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching
        else{
          return done(null, null, {'localizedError': 'Invalid user or password.','rawError':'no user found or invalid password'});
        }
        // asynchronous
        process.nextTick(function() {
            User.findOne({ '_id' :  username }, function(err, user) {
                // if there are any errors, return the error

                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, null, {'localizedError': 'Invalid user or password.','rawError':'no user found or invalid password'});

                if (!user.validPassword(password))
                    return done(null, user, {'localizedError': 'Invalid user or password.','rawError':'no user found or invalid password'});

                // all is well, return user
                else
                    return done(null, user);
            });
        });

    }));
};
