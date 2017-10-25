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
 * @apiParam {String} [facebook_id] facebook id
 * @apiParam {String} [firebase_id] facebook id
 * @apiParam {String} name
 * @apiParam {Number} age
 * @apiParam {String} country ISO String
 * @apiParam {String} [about] About bio
 * @apiParam {String[]} languages array (ISO) of languages spoken
 * @apiParam {String} [studies] studies of the user
 * @apiParam {String[]} [images] array with id of the image or an image object
 * @apiParam {Boolean} [banned=0] whether the user is banned or not.
 * @apiParam {Boolean} [about_validated=0] whether the about is validated or not.
 * @apiParam {Boolean} active=1 user is active (not deleted)
 */


/*
* https://stackoverflow.com/questions/4623974/design-for-facebook-authentication-in-an-ios-app-that-also-accesses-a-secured-we?rq=1
* */

let userSchema = new Schema({
    facebook_id: {type: String, trim: true},
    firebase_id: {type: String, trim: true},
    name: {type: String, required: true, trim: true},
    age: {type: Number, required: true},
    country: {
        type: String,
        enum: {
            values: constants.allCountries,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allCountries
        },
        required: true
    },
    about: {type: String, trim: true},
    languages: [{
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        },
        required: true
    }],
    studies: {type: String, trim: true},
    images: [{type: Schema.Types.ObjectId, ref: 'Image'}],
    banned: {type: Boolean, default: false},
    about_validated: {type: Boolean, default: false},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true, discriminatorKey: 'userType'});
userSchema.plugin(mongoosePaginate);
userSchema.index({'facebook_id': 1,'firebase_id': 1}, {name: 'nameIndex'});
userSchema.index({'name': 1}, {name: 'nameIndex', unique: true});
userSchema.index({'age': 1}, {name: 'ageIndex'});
userSchema.index({'country': 1}, {name: 'countryIndex'});
userSchema.index({'active': 1}, {name: 'activeIndex'});
userSchema.index({'$**': 'text'}, {name: 'textIndex', default_language: 'en'});

let autoPopulate = function (next) {
    this.populate('images');
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

// filter queries
userSchema.statics.filterQuery = function (user, callback) {
    if (user.admin) {
        return callback(null, {});
    }
    else  {
        return callback(null, {
            $or: [
                {"_id": user._id}
               /* {
                    $and: [
                        {"origin.user": {$in: [user._id, null]}},
                        {"roles": {$in: [constants.roleNames.client, constants.roleNames.potentialClient]}}
                    ]
                }*/
            ]
        });
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

// Other functions
userSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// Recursively delete user and related info

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
