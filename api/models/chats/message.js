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
 * @apiParam (Message) {String} message text of the message.
 */

let messageSchema = new Schema({
    chat: {type: Schema.Types.ObjectId, ref: 'Chat', required: true},
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    message: {type: String, required: true},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

messageSchema.plugin(mongoosePaginate);
messageSchema.index({'user': 1});
messageSchema.index({'chat': 1});

let autoPopulate = function (next) {
    this.populate('user');
    this.populate('chat');
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
    return newDBObject
};

// Other functions
messageSchema.statics.validateObject = function (user, callback) {
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
