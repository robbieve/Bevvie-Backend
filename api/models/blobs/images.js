// grab the things we need
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config');
const mongoosePaginate = require('mongoose-paginate');
const validator = require('validator');
const mime = require("node-mime");

// create a schema

/**
 * @apiDefine ImageParameters
 * @apiSuccess (Image) {String} [imageName] an image name. May not be unique
 * @apiSuccess (Image) {String} [imageLocalName] a image of a local image in the remote device: e.g.: Mobile, Tablet...
 * @apiSuccess (Image) {String} [placeholderName] placeholder to be used while downloading new image.
 * @apiSuccess (Image) {String} contentType an image type. Must be a valid mime type.
 * @apiSuccess (Image) {String} md5 md5 checksum of the image
 * @apiSuccess (Image) {Object} [s3] s3 block, if stored at s3
 * @apiSuccess (Image) {String} s3.identifier s3 identifier. usually matches md5.
 * @apiSuccess (Image) {String} s3.url s3 url for downloading.
 * @apiSuccessExample  {String} contentType
 * "image/jpeg"
 * */
const objectSchema = new Schema({
    imageName: {type: String, trim: true}, // May be used to identify the image
    imageLocalName: {type: String, trim: true}, // Name of a local image
    placeholderName: {type: String, trim: true}, // Name of a placeholder local image
    contentType: {
        type: String,
        trim: true,
        required: true,
        enum: {
            values: Object.keys(mime.types),
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + Object.keys(mime.types)
        }
    },
    md5: {type: String, required: true},
    s3: {
        identifier: {type: String, trim: true},
        url: {
            type: String,
            validate: {
                validator: function (v) {
                    return validator.isURL(v)
                },
                message: '{VALUE} is not a valid for url'
            }
        }
    },
    owner: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
});
objectSchema.index({imageName: 1});
objectSchema.index({md5: 1}, {unique: true});

objectSchema.plugin(mongoosePaginate);
const autoPopulate = function (next) {
    //this.populate('client');
    this.where({apiVersion: config.apiVersion});
    next();
};
objectSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);


objectSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Image();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
objectSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
objectSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};

// the schema is useless so far
// we need to create a model using it
const Image = mongoose.model('Image', objectSchema);

// Delete image
Image.deleteByIds = function (ids, callback) {
    Image.remove({_id: {$in: ids}}, function (err, element) {
        if (err) callback(err);
        if (callback) callback(err, element.result);
    });
};
// make this available to our users in our Node applications
module.exports = Image;
