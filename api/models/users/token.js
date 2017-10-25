// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let bcrypt = require('bcrypt-nodejs');
let Schema = mongoose.Schema;
let moment = require("moment");

const config = require('config');

// create a schema
let tokenSchema = new Schema({
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    token: {type: String, unique: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
    expiration: {
        type: Date,
        required: true,
        default: moment().add(1,'year')
    },
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
let Token = mongoose.model('Token', tokenSchema);

// Used by the bearer to get the user by token
Token.findByToken = function (token, callback) {
    this.findOne({'token': token})
        .exec(function (err, newToken) {
            if (newToken) {
                callback(err, newToken.user);
            }
            else {
                callback(err, null);
            }
        })
};

// make this available to our users in our Node applications
module.exports = Token;
