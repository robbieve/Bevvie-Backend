// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let bcrypt = require('bcrypt-nodejs');
let Schema = mongoose.Schema;
const config = require('config');
let token = require('api/models/users/token');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');

/**
 * @apiDefine UserParameters
 * @apiParam {String} _id id of the object.
 * @apiParam {String} email
 * @apiParam {String} password
 * @apiParam {String} name
 * @apiParam {String} surname
 * @apiParam {String} [secondSurname]
 * @apiParam {String} [image] id of the image or an image object
 * @apiParam {String} [activationCode] code for activation
 * @apiParam {String[]="admin","client","potentialClient","telemarketing","vetcenter"} roles type of user
 * @apiParam {String} [preferedLanguage] language=es prefered by the user.
 * @apiParam {Object} [activationStatus] statuses of activation. May be empty
 * @apiParam {Boolean} active=1 whether the user is active or not.
 */

let userSchema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
        unique: true,
        required: 'Email address is required',
        validate: [mongooseValidators.mailValidator, 'Please fill a valid email address for `{PATH}`: (`{VALUE}`) is not valid'],
    },
    password: {type: String, required: true},
    name: {type: String, required: true, trim: true},
    surname: {type: String, trim: true},
    secondSurname: {type: String, trim: true},
    image: {type: Schema.Types.ObjectId, ref: 'Image'},
    roles: [{
        type: String,
        enum: {
            values: constants.roles,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.roles
        },
        required: true
    }],
    preferedLanguage: {
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        },
        default: "es"
    },

    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true, discriminatorKey: 'userType'});
userSchema.plugin(mongoosePaginate);
userSchema.index({'email': 1}, {name: 'emailIndex', unique: true});
userSchema.index({'userType': 1}, {name: 'userTypeIndex'});
userSchema.index({'active': 1}, {name: 'activeIndex'});
userSchema.index({'$**': 'text'}, {name: 'textIndex', default_language: 'es'});

let autoPopulate = function (next) {
    //this.populate('client');
    this.populate('origin.user');
    this.populate('image');
    this.where({apiVersion: config.apiVersion});
    next();
};
userSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

userSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.password; // remove user password from any response
        return user
    }
});

// methods for authentication ======================
// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};


// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

// Check roles included
userSchema.methods.hasRoles = function (roles) {
    if (!(roles instanceof Array)) {
        roles = [roles];
    }
    let thisUser = this;
    let found = false;
    for (const index in roles) {
        let role = roles[index];
        if (thisUser.roles.indexOf(role) >= 0) {
            found = true;
            break;
        }
    }
    ;
    return found;
};

// filter queries
userSchema.statics.filterQuery = function (user, callback) {
    if (user.hasRoles([constants.roleNames.admin])) {
        return callback(null, {});
    }
    else if (user.hasRoles([constants.roleNames.vetcenter])) {
        return callback(null, {
            $or: [
                {"_id": user._id},
                {
                    $and: [
                        {"origin.user": {$in: [user._id, null]}},
                        {"roles": {$in: [constants.roleNames.client, constants.roleNames.potentialClient]}}
                    ]
                }
            ]
        });
    }
    else if (user.hasRoles([constants.roleNames.telemarketing])) {
        return callback(null, {
            $or: [
                {"_id": user._id},
                {
                    $and: [
                        {"origin.user": {$in: [user._id, null]}},
                        {"roles": {$in: [constants.roleNames.client, constants.roleNames.potentialClient, constants.roleNames.vetcenter]}}
                    ]
                }
            ]
        });
    }
    else if (user.hasRoles([constants.roleNames.client]) || user.hasRoles([constants.roleNames.potentialClient])) {
        return callback(null, {_id: user._id});
    }
    else {
        callback({
            localizedError: 'Not found',
            rawError: 'user ' + user._id + ' could not match role for query'
        }, null);
    }
};
userSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new User();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
        if (newObject[key] === null){
            newDBObject[key] = undefined;
        }
    })
    if (newObject.password) {
        newDBObject.password = newDBObject.generateHash(newObject.password);
    }
    return newDBObject
};
userSchema.methods.mapToRoyalCanin = function () {
    let unixtime = "" + Math.floor(moment().utc() / 1000);
    let royalCanin = {
        email: this.email,
        password: this.royalCaninPassword,
        companyId: this.country === "ES" ? 1 : 2,
        appId: config.royalCanin.app_id,
        clientId: config.royalCanin.client_id,
        unixTime: unixtime,
        languageCode: this.country,
        name: this.name,
        lastName: this.lastName,
        mobilePhone: this.phones[0],
        phoneCountryCode: this.country,
        postalCode: this.address.postalCode,
        countryCode: this.country,
        pets: [
            // Should be filled by controller
        ]
    };
    return royalCanin
};

// Other functions
userSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// Recursively delete user and related info
// TODO: CREATE RECURSIVE DELETION
userSchema.statics.deleteByIds = function (ids, callback) {
    token.remove({user: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        User.remove({_id: {$in: ids}}, function (err, element) {
            if (err) return callback(err);
            if (callback) callback(err, element.result);
        })
    });
};
let User = mongoose.model('User', userSchema);
module.exports = User;
