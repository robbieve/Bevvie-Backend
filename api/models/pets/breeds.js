// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
/**
 * @apiDefine BreedParameters
 * @apiParam (Breed) {String} _id id of the object.
 * @apiParam (Breed) {String} royalCaninIdentifier id of the breed at Royal Canin
 * @apiParam (Breed) {Bool} common=true common breed.
 * @apiParam (Breed) {String="Dogs","Cats"} species species the breed belongs to.
 * @apiParam (Breed) {Object[]} name name of the breed, localized
 * @apiParam (Breed) {String} name.localizedName name of the breed
 * @apiParam (Breed) {String="es","pt"} name.language the language of the translation
 */
let breedSchema = new Schema({
    royalCaninIdentifier: {type: String, required: true, trim: true},
    species: {
        type: String,
        required: true,
        enum: {
            values: constants.species,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.species
        }
    },
    common:{
        type: Boolean,
        default: true,
    },
    name:{
        type:[{
            localizedName: {type: String, required: true, trim: true},
            language: {
                type: String,
                enum: {
                    values: constants.allLanguages,
                    message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
                }
            },
        }],
        required: true
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

breedSchema.plugin(mongoosePaginate);
breedSchema.index({'active': 1}, {name: 'activeIndex'});
breedSchema.index({'royalCaninIdentifier': 1}, {name: 'royalCaninIdentifierIndex'});
breedSchema.index({'species': 1, 'language':1}, {name: 'speciesAndLanguageIndex'});
breedSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});

let autoPopulate = function (next) {
    //this.populate('client');
    this.where({apiVersion: config.apiVersion});
    next();
};
breedSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

breedSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Breed();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
breedSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
breedSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};


breedSchema.statics.deleteByIds = function (ids, callback) {
    Breed.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};

let Breed = mongoose.model('Breed', breedSchema);

module.exports = Breed;
