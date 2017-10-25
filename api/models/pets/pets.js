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
 * @apiDefine PetParameters
 * @apiParam (Pet) {String} _id id of the object.
 * @apiParam (Pet) {String} name name of the pet.
 * @apiParam (Pet) {String} [image] id of the image
 * @apiParam (Pet) {String="Dogs","Cats"} species species the pet belongs to.
 * @apiParam (Pet) {String="Male","Female"} gender gender of the pet.
 * @apiParam (Pet) {String} mainBreed id of the breed,
 * @apiParam (Pet) {String} [secondaryBreed] id of the secondary breed.
 * @apiParam (Pet) {Date} birthday date of the birthday of the pet.
 * @apiParam (Pet) {Boolean} chronic=false whether the pet has a chronic desease.
 * @apiParam (Pet) {String[]} [patologies] array of patologies a pet has.
 * @apiParam (Pet) {String="human","supermarket","premium"} feedingType feeding of the pet.
 * @apiParam (Pet) {String="low","mid","high"} activity activity of the pet.
 * @apiParam (Pet) {String="wet","warn"} environment environment of the pet. Obtained from regionPonderation.
 * @apiParam (Pet) {String="thin","onFit","overweight"} weight weights of the pet.
 * @apiParam (Pet) {String} [vetCenter] vetcenter the pet is related to.
 * @apiParam (Pet) {String} owner the owner of the pet
 * @apiParam (Pet) {Object[]} statuses statuses of the pet
 * @apiParam (Pet) {Date} statuses.date=CurrentDate date of the status
 * @apiParam (Pet) {String="suscribed","unsuscribed","cancelled","deceased"} statuses.status=unsuscribed status of the pet
 * @apiParam (Pet) {Boolean} active=1 whether the object is active or not.

 */
let petSchema = new Schema({
    name: {type: String, required: true, trim: true},
    image: {type: Schema.Types.ObjectId, ref: 'Image'},
    species: {
        type: String,
        required: true,
        enum: {
            values: constants.species,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.species
        }
    },
    gender: {
        type: String,
        required: true,
        enum: {
            values: constants.gender,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.gender
        }
    },
    mainBreed: { // razaId
        type: Schema.Types.ObjectId,
        ref: 'Breed',
        required: true,
    },
    secondaryBreed: {
        type: Schema.Types.ObjectId,
        ref: 'Breed',
    },
    birthday: {
        type: Date,
        required: true
    },
    chronic:
        {
            type: Boolean,
            required: true,
            default: false,
        },
    // TODO: Not defined
    patologies:
        [{
            type: String,
            enum: {
                values: constants.healthPatologies,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.healthPatologies
            }
        }],
    feedingType: { // tiposAlimento
        type: String,
        enum: {
            values: constants.feedingTypes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.feedingTypes
        }
    },
    activity: {
        type: String,
        required: true,
        enum: {
            values: constants.activity,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.activity
        }
    },
    environment: {
        type: String,
        enum: {
            values: constants.environment,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.environment
        },
    },
    weight: {
        type: String,
        required: true,
        enum: {
            values: constants.weightTypes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.weightTypes
        }
    }, //pesoId
    vetCenter: {type: Schema.Types.ObjectId, ref: 'VetcenterUser'},
    owner: {type: Schema.Types.ObjectId, ref: 'User', required: true},
    statuses: [
        {
            date: {type: Date, required: true, default: new Date()},
            status: {
                type: String,
                enum: {
                    values: constants.petStatuses,
                    message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.petStatuses
                },
                required: true,
                default: constants.petStatusNames.unsuscribed
            }
        }
    ],
    sort:{
        vetCenterName: {type: String},
        planCreationDate: {type: Date}
    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

petSchema.plugin(mongoosePaginate);
petSchema.index({'active': 1}, {name: 'activeIndex'});
petSchema.index({'vetCenter': 1}, {name: 'vetCenterIndex'});
petSchema.index({'sort.vetCenterName': 1}, {name: 'vetCenterNameIndex'});
petSchema.index({'sort.planCreationDate': 1}, {name: 'planCreationDateIndex'});
petSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});

let autoPopulate = function (next) {
    this.populate('mainBreed');
    this.populate('secondBreed');
    this.populate('image');
    this.where({apiVersion: config.apiVersion});
    next();
};
petSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);
petSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.sort; // remove sort data
    }
});

petSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Pet();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
        if (newObject[key] === null){
            newDBObject[key] = undefined;
        }
    });
    newDBObject.image = newObject.image;
    return newDBObject
};
// Other functions
petSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

petSchema.statics.deleteByIds = function (ids, callback) {
    Pet.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};
// filter queries
petSchema.statics.filterQuery = function (user, callback) {
    if (user.hasRoles([constants.roleNames.admin])) {
        callback(null, {})
    }
    else if (user.hasRoles([constants.roleNames.telemarketing])) {
        let userModel = require('api/models/users/user');
        userModel.find({'origin.user': user._id}, function (err, result) {
            callback(null, {
                'owner': {
                    $in: result.map(function (element) {
                        return element._id;
                    })
                }
            });
        });
    }
    else if (user.hasRoles([constants.roleNames.vetcenter])) {
        callback(null, {'vetCenter': user._id});
    }
    else {
        callback(null, {'owner': user._id});
    }
};

petSchema.methods.mapToRoyalCanin = function () {

    /*
    {
        "codigoClinica": 620040000067533,
        "urlImagen": "",
        "supermercadoId": "",
        "codigoTienda": "",
        "especie": 1,
        "alimentoRCId": 120,
        "sexo": "macho",
        "fechaNacimiento": "2000-05-16",
        "marcaAlimentosId": 11,
        "origenId": 1,
        "origenAlimentoId": 2,
        "razaId": 79,
        "pesoId": 1,
        "esterilizado": "false",
        "nombreTienda": "",
        "nombre": "Garbi",
        "nombreClinica": "Presc 2",
        "codigoTiendaOnline": "",
        "nombreTiendaOnline": "",
        "origen": "Criador Test",
        "tiposAlimento": [1, 2, 3]
    }
     */

    let royalCanin = {
        "codigoClinica": this.vetCenter ? this.vetCenter.royalCaninIdentifier: undefined,
        "urlImagen": this.image ? this.image.s3.url : undefined,
        "especie": this.species === constants.speciesNames.Dogs ? 1 : 2,
        "sexo": this.gender === constants.genderNames.Male ? "macho" : "hembra",
        "fechaNacimiento": moment(this.birthday).format("YYYY-MM-DD"),
        "razaId": this.mainBreed.royalCaninIdentifier,
        "pesoId": constants.weightRoyalCanin(this.weight),
        "nombre": this.name ? this.name : "N/A",
        "nombreClinica": this.vetCenter ? this.vetCenter.name : undefined,
    };
    return royalCanin
};

let Pet = mongoose.model('Pet', petSchema);
module.exports = Pet;
