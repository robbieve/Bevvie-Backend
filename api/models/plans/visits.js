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
 * @apiDefine VisitParameters
 * @apiParam (Visit) {String} _id id of the object.
 * @apiParam (Visit) {String} name name of the visit.
 * @apiParam (Visit) {Number} price=0 price of the visit.
 * @apiParam (Visit) {Number} ponderation=1.0 percentage to be applied to the base price.
 * @apiParam (Visit) {String="es","pt"} [language] the language of the translation
 * @apiParam (Visit) {Boolean} [isTemplate=false] this is a template object.
 * @apiParam (Visit) {Boolean} active=1 whether the object is active or not.
 *
 */

let visitSchema = new Schema({
    name:{
        type:String,
        required: true
    },
    price:{
        type: Number,
        default: 0,
    },
    ponderation:{
        type: Number,
        default: 1.0,
    },
    language: {
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        }
    },
    isTemplate:{
        type:Boolean,
        default: false,
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

visitSchema.plugin(mongoosePaginate);
visitSchema.index({'active': 1}, {name: 'activeIndex'});
visitSchema.index({'isTemplate': 1}, {name: 'isTemplateIndex'});
visitSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});

let autoPopulate = function (next) {
    //this.populate('origin.user');
    this.where({apiVersion: config.apiVersion});
    next();
};
visitSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

visitSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Visit();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
visitSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

visitSchema.statics.deleteByIds = function (ids, callback) {
    Visit.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};
// filter queries
visitSchema.statics.filterQuery = function (user, callback) {
    if (user.hasRoles([constants.roleNames.admin])) {
        callback(null, {})
    }
    else if (user.hasRoles([constants.roleNames.telemarketing])) {
        callback(null, {$or: [{'origin.user': user._id}, { 'isTemplate': true} ]});
    }
    else if (user.hasRoles([constants.roleNames.vetcenter])) {
        callback(null, {$or: [{'vetCenter': user._id}, { 'isTemplate': true} ]});
    }
    else {
        callback(null, {$or: [{'owner': user._id}, { 'isTemplate': true}]});
    }
};


let Visit = mongoose.model('Visit', visitSchema);
module.exports = Visit;
