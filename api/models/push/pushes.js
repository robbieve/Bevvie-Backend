// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine PushParameters
 * @apiParam (Push) {String} _id id of the object.
 * @apiParam (Push) {String} device the device to send to
 * @apiParam (Push) {Object} pushMessage the message to be sent
 * @apiParam (Push) {String} pushMessage.title the push title
 * @apiParam (Push) {String} pushMessage.body the push body
 * @apiParam (Push) {String} pushMessage.custom any custom values
 * @apiParam (Push) {String="high","normal"} [pushMessage.priority=high] priority of the push
 * @apiParam (Push) {Number} [pushMessage.retries=3] retries for the push
 * @apiParam (Push) {Number} [pushMessage.badge] badge to set
 * @apiParam (Push) {Number} [pushMessage.expiry] seconds until expiration
 * @apiParam (Push) {String="chatCreate","chatMessage"} custom.pushType type of push
 * @apiParam (Push) {String="pending","failedAttempt","failed","succeed"} status=pending seconds until expiration
 */


let pushSchema = new Schema({
    device: {type: Schema.Types.ObjectId, ref: 'Device', required: true},
    pushMessage:{
        title: {type: String},
        body: {type: String},
        custom: {type: Schema.Types.Mixed},
        priority: {
            type: String,
            default: constants.pushes.priorityNames.high,
            enum: {
                values: constants.pushes.priorities,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.pushes.priorities
            }
        },
        retries: {type: Number, default: 3},
        badge: {type: Number},
        expiry: {type: Number}
    },
    status: {
        type: String,
        default: constants.pushes.statusNames.pending,
        enum: {
            values: constants.pushes.statuses,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.pushes.statuses
        }
    },
    pushType: {
        type: String,
        enum: {
            values: constants.pushes.pushTypes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.pushes.pushTypes
        }
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

pushSchema.plugin(mongoosePaginate);
pushSchema.index({'device': 1});
pushSchema.index({'pushMessage.title': 1});
pushSchema.index({'pushMessage.body': 1});
pushSchema.index({'status': 1});
pushSchema.index({'pushType': 1});

let autoPopulate = function (next) {
    this.populate('device');
    this.where({apiVersion: config.apiVersion});
    next();
};
pushSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

pushSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Push();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
pushSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
pushSchema.statics.filterQuery = function (user, callback) {
    if (!user.admin) {return callback(null, {_id:user})} // Will not match any. Just admin can match it.
    // No filtering here
    return callback(null, {})
};


pushSchema.statics.deleteByIds = function (ids, callback) {
    Push.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Push = mongoose.model('Push', pushSchema);

module.exports = Push;
