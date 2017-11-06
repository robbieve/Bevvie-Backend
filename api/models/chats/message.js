// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine MessageParameters
 * @apiParam (Message) {String} _id id of the object.
 * @apiParam (Message) {String} chat chat it belongs to.
 * @apiParam (Message) {String} user creator of the message.
 */

let messageSchema = new Schema({
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

messageSchema.plugin(mongoosePaginate);
messageSchema.index({'active': 1}, {name: 'activeIndex'});
messageSchema.index({'user_age': 1});
messageSchema.index({"expiration": 1}, {expireAfterSeconds: 0});
messageSchema.index({'venue': 1});
messageSchema.index({'user': 1});

let autoPopulate = function (next) {
    this.populate('user');
    this.populate('venue');
    this.where({apiVersion: config.apiVersion});
    next();
};
messageSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

messageSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Message();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
messageSchema.statics.validateObject = function (user, callback) {
    if (!user.admin) {
        return callback(null, {user: user._id});
    }
    return callback(null)
};

// filter queries
messageSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};


messageSchema.statics.deleteByIds = function (ids, callback) {
    Message.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Message = mongoose.model('Message', messageSchema);

module.exports = Message;
