// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine ChatParameters
 * @apiParam (Chat) {String} _id id of the object.
 * @apiParam (Chat) {Object[]} members members of the chat.
 * @apiParam (Chat) {Object[]} members.user user id.
 * @apiParam (Chat) {Bool} members.creator=false this user is the creator of the chat.
 * @apiParam (Chat) {String} [members.lastMessage] id of the last message sent to the user, if any.
 * @apiParam (Chat) {String="created","accepted","rejected","exhausted","expired"} [members.lastMessage] id of the last message sent to the user, if any.
 * @apiParam (Chat) {Date} expiration expiration time
 */

let chatSchema = new Schema({
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

chatSchema.plugin(mongoosePaginate);
chatSchema.index({'active': 1}, {name: 'activeIndex'});
chatSchema.index({'user_age': 1});
chatSchema.index({"expiration": 1}, {expireAfterSeconds: 0});
chatSchema.index({'venue': 1});
chatSchema.index({'user': 1});

let autoPopulate = function (next) {
    this.populate('user');
    this.populate('venue');
    this.where({apiVersion: config.apiVersion});
    next();
};
chatSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

chatSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Chat();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
chatSchema.statics.validateObject = function (user, callback) {
    if (!user.admin) {
        return callback(null, {user: user._id});
    }
    return callback(null)
};

// filter queries
chatSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};


chatSchema.statics.deleteByIds = function (ids, callback) {
    Chat.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
