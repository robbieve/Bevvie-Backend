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
 * @apiParam (Chat) {String} [members.lastMessageSeen] id of the last message sent to the user, if any.
 * @apiParam (Chat) {String="created","accepted","rejected","exhausted","expired"} status=created status of the chat
 * @apiParam (Chat) {Date} expiration expiration time
 */

let chatSchema = new Schema({
    members: [{
        user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        creator:{type: Boolean, default: false},
        lastMessageSeen:{type: Schema.Types.ObjectId, ref: 'Message'},
    }],
    status: {
        type: String,
        enum: {
            values: constants.chats.chatStatuses,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.chats.chatStatuses
        },
        default: constants.chats.chatStatusNames.created,
        required: true
    },
    expiration: {
        type: Date,
        required: true,
        default: moment().add(18, 'hours')
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

chatSchema.plugin(mongoosePaginate);
chatSchema.index({'members.user': 1});
chatSchema.index({'status': 1});
chatSchema.index({"expiration": 1}, {expireAfterSeconds: 0});

let autoPopulate = function (next) {
    this.populate('members.user');
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
    if (!user.admin) {
        return callback(null, { "members.user": user._id});
    }
    return callback(null, {})
};


chatSchema.statics.deleteByIds = function (ids, callback) {
    const Message = require("api/models/chats/message");
    Message.remove({chat: {$in: ids}},function(err, elements){
        Chat.remove({_id: {$in: ids}}, function (err, element) {
            if (err) return callback(err);
            if (callback) callback(err, element.result);
        })
    });
};

chatSchema.methods.chatCreator = function () {
    let creator = this.members.filter(function (element) {
        return element && element.creator;
    });
    return creator.length>0 ? creator[0]:null;
}


let Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
