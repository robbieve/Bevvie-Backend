// grab the things we need
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config');
const mongoosePaginate = require('mongoose-paginate');
const validator = require('validator');
const mime = require("node-mime");

// create a schema

/**
 * @apiDefine FileParameters
 * @apiSuccess (File) {String} [fileName] an file name. May not be unique
 * @apiSuccess (File) {String} [fileLocalName] a file of a local file in the remote device: e.g.: Mobile, Tablet...
 * @apiSuccess (File) {String} contentType an file type. Must be a valid mime type.
 * @apiSuccess (File) {String} md5 md5 checksum of the file
 * @apiSuccess (File) {Object} [s3] s3 block, if stored at s3
 * @apiSuccess (File) {String} s3.identifier s3 identifier. usually matches md5.
 * @apiSuccess (File) {String} s3.url s3 url for downloading.
 * @apiSuccessExample {String} contentType
 *  "doc/pdf"
 *
 * */
const objectSchema = new Schema({
    fileName: {type: String, trim: true}, // May be used to identify the file
    fileLocalName: {type: String, trim: true}, // Name of a local file
    placeholderName: {type: String, trim: true}, // Name of a placeholder local file
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
objectSchema.index({fileName: 1});
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
        newDBObject = new File();
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
const File = mongoose.model('File', objectSchema);

// Delete file
File.deleteByIds = function (ids, callback) {
    File.remove({_id: {$in: ids}}, function (err, element) {
        if (err) callback(err);
        if (callback) callback(err, element.result);
    });
};
// make this available to our users in our Node applications
module.exports = File;
