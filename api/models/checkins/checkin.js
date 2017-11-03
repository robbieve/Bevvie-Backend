// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine CheckinParameters
 * @apiParam (Checkin) {String} _id id of the object.
 * @apiParam (Checkin) {String} venue id of the venue
 * @apiParam (Checkin) {String} user id of the user
 * @apiParam (Checkin) {Date} expiration expiration time
 */

let checkinSchema = new Schema({
    venue: {type: Schema.Types.ObjectId, ref: 'Venue', required: true},
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    user_age: {type: Number},
    expiration: {
        type: Date,
        required: true,
        default: moment().add(18,'hours')
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

checkinSchema.plugin(mongoosePaginate);
checkinSchema.index({'active': 1}, {name: 'activeIndex'});
checkinSchema.index({'user_age': 1});
checkinSchema.index({"expiration": 1}, {expireAfterSeconds: 0});
checkinSchema.index({'venue': 1});
checkinSchema.index({'user': 1});

let autoPopulate = function (next) {
    this.populate('user');
    this.populate('venue');
    this.where({apiVersion: config.apiVersion});
    next();
};
checkinSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

checkinSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Checkin();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
checkinSchema.statics.validateObject = function (user, callback) {
    if (!user.admin) {
        return callback(null, {user: user._id});
    }
    return callback(null)
};

// filter queries
checkinSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};


checkinSchema.statics.deleteByIds = function (ids, callback) {
    Checkin.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Checkin = mongoose.model('Checkin', checkinSchema);

module.exports = Checkin;
