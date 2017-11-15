// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine DeviceParameters
 * @apiParam (Device) {String} _id id of the object.
 * @apiParam (Device) {String} pushToken the push token.
 * @apiParam (Device) {String} user the owner.
 */

let deviceSchema = new Schema({
    pushToken: {type: String, unique: true},
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

deviceSchema.plugin(mongoosePaginate);
deviceSchema.index({'user': 1});
deviceSchema.index({'pushToken': 1});

let autoPopulate = function (next) {
    this.populate('user');
    this.where({apiVersion: config.apiVersion});
    next();
};
deviceSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

deviceSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Device();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
deviceSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
deviceSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    if (!user.admin){
        return callback(null,{user:user._id});
    }
    return callback(null, {})
};


deviceSchema.statics.deleteByIds = function (ids, callback) {
    Device.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
