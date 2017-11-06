// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine BlockParameters
 * @apiParam (Block) {String} _id id of the object.
 * @apiParam (Block) {String} userBlocks user who blocks.
 * @apiParam (Block) {String} userBlocked user blocked.
 */

let blockSchema = new Schema({
    userBlocks: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    userBlocked: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

blockSchema.plugin(mongoosePaginate);
blockSchema.index({'active': 1}, {name: 'activeIndex'});
blockSchema.index({'userBlocked': 1});
blockSchema.index({'userBlocks': 1});

let autoPopulate = function (next) {
    this.populate('userBlocks');
    this.populate('userBlocked');
    this.where({apiVersion: config.apiVersion});
    next();
};
blockSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

blockSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Block();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
blockSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
blockSchema.statics.filterQuery = function (user, callback) {
    if (!user.admin) {
        return callback(null, {userBlocks: user._id});
    }
    // No filtering here
    return callback(null, {})
};


blockSchema.statics.deleteByIds = function (ids, callback) {
    Block.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Block = mongoose.model('Block', blockSchema);

module.exports = Block;
