// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");


/**
 * @apiDefine ReportParameters
 * @apiParam (Report) {String} _id id of the object.
 * @apiParam (Report) {String} userReports user who reports.
 * @apiParam (Report) {String} userReported user reported.
 * @apiParam (Report) {String} reason test of the reason for the report
 */

let reportSchema = new Schema({
    userReports: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    userReported: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    reason: {type: String, required: true},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

reportSchema.plugin(mongoosePaginate);
reportSchema.index({'active': 1}, {name: 'activeIndex'});
reportSchema.index({'userReported': 1});
reportSchema.index({'userReports': 1});

let autoPopulate = function (next) {
    this.populate('userReports');
    this.populate('userReported');
    this.where({apiVersion: config.apiVersion});
    next();
};
reportSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

reportSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Report();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
reportSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
reportSchema.statics.filterQuery = function (user, callback) {
    if (!user.admin) {
        return callback(null, {userReports: user._id});
    }
    // No filtering here
    return callback(null, {})
};


reportSchema.statics.deleteByIds = function (ids, callback) {
    Report.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};


let Report = mongoose.model('Report', reportSchema);

module.exports = Report;
