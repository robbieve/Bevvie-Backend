// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let bcrypt = require('bcrypt-nodejs');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");

/**
 * @apiDefine RegionPonderationParameters
 * @apiParam (RegionPonderation) {String} _id id of the object.
 * @apiParam (RegionPonderation) {String} country country of the pricing (e.g.: ES, PT).
 * @apiParam (RegionPonderation) {String} region region of the pricing.
 * @apiParam (RegionPonderation) {String} postalCode postalCode of the pricing.
 * @apiParam (RegionPonderation) {String="wet","warn"} environment environment of the region.
 * @apiParam (RegionPonderation) {Number} ponderation=1.0 ponderation in terms of percentage of the base price of the treatments.
 * @apiParam (RegionPonderation) {Boolean} active=1 whether the object is active or not.
 *
 */

let regionPonderationSchema = new Schema({
    country: {
        type: String,
        enum: {
            values: constants.allCountries,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allCountries
        }
    },
    region: {
        type: String,
        enum: {
            values: constants.allRegions,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allRegions
        }
    },
    environment:{
        type: String,
        enum: {
            values: constants.environment,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.environment
        }
    },
    postalCode: {
        type: String,
    },
    ponderation:{
        type: Number,
        required: true,
        default: 1.0
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

regionPonderationSchema.plugin(mongoosePaginate);
regionPonderationSchema.index({'active': 1}, {name: 'activeIndex'});
regionPonderationSchema.index({'country': 1}, {name: 'countryIndex'});
regionPonderationSchema.index({'region': 1}, {name: 'regionIndex'});
regionPonderationSchema.index({'postalCode': 1}, {name: 'postalCodeIndex'});
regionPonderationSchema.index({'ponderation': 1}, {name: 'ponderationIndex'});
regionPonderationSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});
regionPonderationSchema.index({'country':1, 'postalCode': 1}, {name: 'countryAndPostalCodelIndex', unique:1});

let autoPopulate = function (next) {
    //this.populate('origin.user');
    this.where({apiVersion: config.apiVersion});
    next();
};

regionPonderationSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);
regionPonderationSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new RegionPonderation();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
regionPonderationSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

regionPonderationSchema.statics.deleteByIds = function (ids, callback) {
    RegionPonderation.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};
// filter queries
regionPonderationSchema.statics.filterQuery = function (user, callback) {
    callback(null, {}) // free for any user
};

let RegionPonderation = mongoose.model('RegionPonderation', regionPonderationSchema);
module.exports = RegionPonderation;
