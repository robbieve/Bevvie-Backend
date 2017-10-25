// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
/**
 * @apiDefine ContractParameters
 * @apiParam (Contract) {String} royalCaninIdentifier id of the contract at Royal Canin
 * @apiParam (Contract) {String} localizedName name of the contract
 * @apiParam (Contract) {String="Dogs","Cats"} species species the contract belongs to.
 * @apiParam (Contract) {String="es","pt"} language the language of the object
 *
 * Permite llevar un seguimiento de los contratos, LOPD y similares que han aceptado los clientes, CV, etc.
 Fecha: (Fecha, Obligatorio) fecha de alta del contrato
 Contrato: (Texto, Obligatorio) Texto del contrato
 Tipo: LOPD de cesión de datos, LOPD comunicaciones comerciales, aceptación contrato Plan de Salud, Aceptación de contrato C.V.
 Fecha de baja: (Fecha, Opcional) El administrador lo ha deshabilitado y no se podrá usar.

 *
 */
let contractSchema = new Schema({
    activationDate:{type: Date, required: true, default: Date.now()},
    deactivationDate:{type: Date},
    localizedText: {type: String, required: true, trim: true},
    language: {
        type: String,
        enum: {
            values: constants.allLanguages,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allLanguages
        }
    },
    contractType: {
        type: String,
        required: true,
        enum: {
            values: constants.contractTypes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.contractTypes
        }

    },
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

contractSchema.plugin(mongoosePaginate);
contractSchema.index({'active': 1}, {name: 'activeIndex'});
contractSchema.index({'royalCaninIdentifier': 1}, {name: 'royalCaninIdentifierIndex'});
contractSchema.index({'species': 1, 'language':1}, {name: 'speciesAndLanguageIndex'});
contractSchema.index({'$**': 'text'}, {name: 'textIndex', default_language:'es'});

let autoPopulate = function (next) {
    //this.populate('client');
    this.where({apiVersion: config.apiVersion});
    next();
};
contractSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

let  Contract = mongoose.model('Contract', contractSchema);
contractSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Pet();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
contractSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

module.exports = Contract;
