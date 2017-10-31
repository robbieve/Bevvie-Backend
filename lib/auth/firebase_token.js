// load all the things we need
// load up the user model
let User = require('api/models/users/user');

// load the auth variables
let configAuth = require('config').auth;

let passport = require('passport-strategy'),
    util = require('util');

let firebaseAdmin = require("firebase-admin");
let serviceAccount = require("config/firebaseServiceKey.json");
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: configAuth.firebaseAuth.databaseURL
});

let errorConstants = require("api/common/errorConstants");

// Firebase strategy
function Strategy(options, verify) {
    if (typeof options === 'function') {
        verify = options;
        options = {};
    }
    if (!verify) {
        throw new TypeError('FirebaseStrategy requires a verify callback');
    }

    passport.Strategy.call(this);
    this.name = 'firebase-token';
    this._verify = verify;
    this._passReqToCallback = options.passReqToCallback;
}

/**
 * Inherit from `passport.Strategy`.
 */
util.inherits(Strategy, passport.Strategy);

/*
* Call firebase
* */
Strategy.prototype._loadUserProfile = function (token, callback) {
    // idToken comes from the client app
    firebaseAdmin.auth().verifyIdToken(token)
        .then(function (result) {
            callback(null, result);
        })
        .catch(function (err) {
            callback(err, null,errorConstants.responseWithError(err,errorConstants.errorNames.user_firebaseLoginAuthFailure));
        });
};

Strategy.prototype.authenticate = function (req, options) {
    options = options || {};
    let token = req.body.access_token;

    if (!token) {
        return this.fail({message: options.badRequestMessage || 'Missing credentials'}, 400);
    }

    let self = this;

    self._loadUserProfile(token, function (error, profile,userError) {
        if (userError) return self.fail(userError);
        if (error) return self.error(error);
        function verified(err, user, info) {
            if (err) {
                return self.error(err);
            }
            if (!user) {
                return self.fail(info);
            }
            self.success(user, info);
        }

        try {
            profile.token = token;
            if (self._passReqToCallback) {
                self._verify(req, profile, verified);
            } else {
                self._verify(profile, verified);
            }
        } catch (ex) {
            return self.error(ex);
        }
    });
};


// END FIREBASE STRATEGY

module.exports = function (passport) {

    // https://scotch.io/tutorials/easy-node-authentication-setup-and-local
    // https://github.com/scotch-io/easy-node-authentication
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use(new Strategy({
            passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },
        function (req, profile, done) {
            process.nextTick(function () {
                // check if the user is already logged in
                User.findOne({'accessId': profile.user_id}, function (err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.accessKey) {
                            user.accessKey = profile.token;
                            user.save(function (err) {
                                if (err)
                                    return done(err, null, {
                                        'localizedError': 'There was an error saving the user.',
                                        'rawError': 'There was an error saving the user' + JSON.stringify(err)
                                    });

                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        let newUser = new User();
                        newUser.accessId = profile.user_id;
                        newUser.accessKey = profile.token;
                        newUser.accessType = "firebase";
                        newUser.name = "fakeName";
                        newUser.save(function (err) {
                            if (err)
                                return done(err, null, {
                                    'localizedError': 'There was an error saving the user.',
                                    'rawError': 'There was an error saving the user' + JSON.stringify(err)
                                });

                            return done(null, newUser);
                        });
                    }
                });
            });
        }));
};
