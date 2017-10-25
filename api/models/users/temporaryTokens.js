// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let bcrypt = require('bcrypt-nodejs');
let Schema = mongoose.Schema;
let constants = require("api/common/constants");
const config = require('config');
let moment = require("moment");

// create a schema
let tokenSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    plan: {type: Schema.Types.ObjectId, ref: 'Plan'},
    code: {type: String, required: true, unique: true},
    preferedLanguage: {
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        },
        required: true,
        default: "es"
    },
    tokenType: {
        type: String,
        enum: {
            values: constants.verificationTypes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.verificationTypes
        },
        required: true,
    },
    status: [{
        status: {
            type: String,
            enum: {
                values: constants.temporaryTokenStatuses,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.temporaryTokenStatuses
            }
        },
        date: {type: Date, default: Date()},
        description: {type: String}
    }],
    expiration: {
        type: Date,
        required: true,
        default: moment().add(1,'day')
    },
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});
tokenSchema.plugin(mongoosePaginate);
tokenSchema.index({"expiration": 1}, {expireAfterSeconds: 0});

let autoPopulate = function (next) {
    this.populate('user');
    this.where({apiVersion: config.apiVersion});
    next();
};
tokenSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

// the schema is useless so far
// we need to create a model using it
let TemporaryToken = mongoose.model('TemporaryToken', tokenSchema);


// make this available to our users in our Node applications
module.exports = TemporaryToken;
