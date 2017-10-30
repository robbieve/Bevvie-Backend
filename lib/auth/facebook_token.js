// load all the things we need
let FacebookStrategy = require('passport-facebook-token');

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
    // FACEBOOK ================================================================
    // =========================================================================
    let fbStrategy = configAuth.facebookAuth;
    fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    passport.use(new FacebookStrategy(fbStrategy,
        function(req, token, refreshToken, profile, done) {
            // asynchronous
            process.nextTick(function() {
                // check if the user is already logged in
                if (!req.user) {
                    User.findOne({ 'accessId' : profile.id }, function(err, user) {
                        if (err)
                            return done(err);

                        if (user) {
                            // if there is a user id already but no token (user was linked at one point and then removed)
                            if (!user.accessKey) {
                                user.accessKey = token;
                                user.save(function(err) {
                                    if (err)
                                        return done(err);

                                    return done(null, user);
                                });
                            }

                            return done(null, user); // user found, return that user
                        } else {
                            // if there is no user, create them
                            let newUser            = new User();

                            newUser.accessId    = profile.id;
                            newUser.accessKey = token;
                            newUser.accessType = "facebook";
                            newUser.name  = profile.name.givenName + ' ' + profile.name.familyName;
                            newUser.email = (profile.emails[0].value || '').toLowerCase();
                            newUser.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, newUser);
                            });
                        }
                    });

                } else {
                    // user already exists and is logged in, we have to link accounts
                    let newUser            = req.user; // pull the user out of the session
                    newUser.accessId    = profile.id;
                    newUser.accessKey = token;
                    newUser.accessType = "facebook";
                    newUser.save(function(err) {
                        if (err)
                            return done(err);

                        return done(null, user);
                    });

                }
            });

        }));

};
