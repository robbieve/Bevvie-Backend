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
 * @apiDefine TreatmentParameters
 * @apiParam (Treatment) {String} _id id of the object.
 * @apiParam (Treatment) {String} name name of the treatment.
 * @apiParam (Treatment) {String="es","pt"} [language] the language of the translation
 * @apiParam (Treatment) {Boolean} [isTemplate=false] this is a template object.
 * @apiParam (Treatment) {String} [vaccineFamily] name of the vaccine family if applicable.
 * @apiParam (Treatment) {String} description description of the treatment.
 * @apiParam (Treatment) {String} reason reason of the treatment.
 * @apiParam (Treatment) {String} [reasonAgainst] illness related to the treatment.
 * @apiParam (Treatment) {Date} [deactivationDate] date when this was deactivated.
 * @apiParam (Treatment) {Number} price=0 price of the treatment.
 * @apiParam (Treatment) {Number} ponderation=1.0 percentage to be applied to the base price.
 * @apiParam (Treatment) {String} [plan] related plan if applicable.
 * @apiParam (Treatment) {String} [pet] pet related.
 * @apiParam (Treatment) {String} [owner] owner related.
 * @apiParam (Treatment) {String} [vetCenter] vetCenter related.
 * @apiParam (Treatment) {Object} origin origin of the user who acquired this user.
 * @apiParam (Treatment) {String} origin.user id of the user who acquired this user.
 * @apiParam (Treatment) {String="originCV","originTelemarketing","originWeb"} origin.originType type of origin.
 * @apiParam (Treatment) {String} origin.name name of the user who acquired this user. It is used for search purposes
 * @apiParam (Treatment) {Boolean} active=1 whether the object is active or not.
 *
 */

let treatmentSchema = new Schema({
    name:{
        type:String,
        required: true
    },
    language: {
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        }
    },
    price:{
        type: Number,
        default: 0,
    },
    ponderation:{
        type: Number,
        default: 1.0,
    },

    isTemplate:{
        type:Boolean,
        default: false,
    },
    vaccineFamily:{
        type:String,
    },
    description:{
        type:String,
        required: true
    },
    reason:{
        type:String,
        required: true
    },
    reasonAgainst:{
        type:String,
    },
    deactivationDate:{
        type:Date,
    },
    plan:  {
        type: Schema.Types.ObjectId,
        ref: 'Plan',
    },
    pet: {
        type: Schema.Types.ObjectId,
        ref: 'Pet',
    },
    vetCenter: {
        type: Schema.Types.ObjectId,
        ref: 'VetcenterUser',
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    origin: {
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        name: {type: String},
        originType: {
            type: String,
            enum: {
                values: constants.origins,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.origins
            }
        }
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

treatmentSchema.plugin(mongoosePaginate);
treatmentSchema.index({'active': 1}, {name: 'activeIndex'});
treatmentSchema.index({'isTemplate': 1}, {name: 'isTemplateIndex'});
treatmentSchema.index({'deactivationDate': 1}, {name: 'deactivationDateIndex'});
treatmentSchema.index({'pet': 1}, {name: 'petIndex'});
treatmentSchema.index({'vetCenter': 1}, {name: 'vetCenterIndex'});
treatmentSchema.index({'owner': 1}, {name: 'ownerIndex'});
treatmentSchema.index({'origin.user': 1}, {name: 'originUserIndex'});
treatmentSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});

let autoPopulate = function (next) {
    this.populate('pet');
    this.populate('vetCenter');
    this.populate('owner');
    this.populate('origin.user');
    this.where({apiVersion: config.apiVersion});
    next();
};
treatmentSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

treatmentSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Treatment();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
treatmentSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

treatmentSchema.statics.deleteByIds = function (ids, callback) {
    Treatment.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};
// filter queries
treatmentSchema.statics.filterQuery = function (user, callback) {
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


let Treatment = mongoose.model('Treatment', treatmentSchema);
module.exports = Treatment;
