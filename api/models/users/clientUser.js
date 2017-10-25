const mongoose = require('mongoose');
const User = require('./user');
const constants = require('api/common/constants');
const Schema = mongoose.Schema;
const config = require('config');
const moment = require('moment');


/**
 * @apiDefine ClientParameters
 * @apiParam (Client) {String[]} phones phones of the potential client
 * @apiParam (Client) {Object[]} statuses statuses of the potential client
 * @apiParam (Client) {Date} statuses.date=CurrentDate date of the status
 * @apiParam (Client) {String="active","inactive"} statuses.status status of the client
 * @apiParam (Client) {String{9..}} phones.phone phone of the client
 * @apiParam (Client) {Object} address address of the VetCenter
 * @apiParam (Client) {String} address.address address line of the VetCenter.
 * @apiParam (Client) {String} address.city city line of the VetCenter.
 * @apiParam (Client) {String} address.postalCode postalCode line of the VetCenter.
 * @apiParam (Client) {String} address.region region line of the VetCenter.
 * @apiParam (Client) {Object} origin the origin of the user
 * @apiParam (Client) {String} origin.user id of the user who acquired this user.
 * @apiParam (Client) {String="originCV","originTelemarketing","originWeb"} origin.originType type of origin.
 * @apiParam (Client) {String} origin.name name of the user who acquired this user. It is used for search purposes.
 * @apiParam (Client) {Date} contracts.date date of the contract
 * @apiParam (Client) {Object[]} contracts contracts signed
 * @apiParam (Client) {String} contracts.contract id of the signed contract.
 * @apiParam (Client) {String="ES","PT"} country=ES country of the potential client.
 * @apiParam (Client) {String} royalCaninIdentifier id of the related client.
 * @apiParam (Client) {String} [royalCaninToken] user token to perform calls to royal canin API.
 * @apiParam (Client) {String} royalCaninPassword user password for royal canin.
 * @apiParam (Client) {String} cardId user id card
 * @apiParam (Client) {String} stripeCardToken stripe token for the payments
 * @apiParam (Client) {String} stripeId stripe id of the user
 */
let clientSchema =  new mongoose.Schema({
    phones: [{
        type: String,
        trim:true,
        required: true,
        minlength: [9, 'The value of `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).']
    }],
    address: {
        address: {type: String, required: true, trim: true},
        city: {type: String, required: true, trim: true},
        postalCode: {type: String, trim: true},
        region: {type: String, required: true, trim: true,
            enum: {
                values: constants.allRegions,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allRegions
            }
        },
        country: {type: String, required: true, trim: true},
    },
    statuses: [
        {
            date: {type: Date, required: true, default: new Date()},
            status: {
                type: String,
                enum: {
                    values: constants.statuses,
                    message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.statuses
                }
            }
        }
    ],
    origin: {
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        originType: {
            type: String,
            required: true,
            enum: {
                values: constants.origins,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.origins
            }
        }
    },
    sort:{
        name: {type: String},
    },
    contracts: [
        {
            date: {type: Date, required: true, default: new Date()},
            contract: {type: Schema.Types.ObjectId, ref: 'Contract'},
        }
    ],
    royalCaninIdentifier: {type: String, required: true, trim:true},
    royalCaninToken: {type: String, trim:true},
    royalCaninPassword: {type: String, trim:true, required: true},
    cardId: {type: String, required:true, trim:true},
    stripeCardToken: {type: String, trim:true},
    stripeId: {type: String, trim:true},
    country: {
        type: String,
        enum: {
            values: constants.allCountries,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allCountries
        },
        default: "ES"
    },
}, {timestamps: true, discriminatorKey: 'userType'});

clientSchema.index({'sort.name': 1}, {name: 'sortNameIndex'});
clientSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.password; // remove user password from any response
        delete user.sort; // remove sort data
    }
});

// Modify mapping
clientSchema.methods.mapObject = function (user, newObject) {
    if (!user) {
        user = new ClientUser();
    }
    Object.keys(newObject).forEach(function (key) {
        user[key] = newObject[key]
    })
    if (newObject.statuses === undefined){
        user.statuses = { status: constants.statusNames.pending }
    }
    if (newObject.password) {
        user.password = user.generateHash(newObject.password);
    }

    return user
};


clientSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.password; // remove user password from any response
        delete user.royalCaninPassword;
        return user;
    }
});



/* This will map a user to a royalCaninUser
let testUser = {
    email: "development+" + unixtime + "@develapps.es",
    password: "pass",
    companyId: 1,
    appId: config.royalCanin.app_id,
    clientId: config.royalCanin.client_id,
    unixTime: unixtime,
    languageCode: "es",
    name: "pp",
    lastName: "pepito",
    mobilePhone: "678999000",
    phoneCountryCode: "ES",
    postalCode: 12540,
    countryCode: "ES",
    pets: [{
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
    }]
};

 */
clientSchema.methods.mapToRoyalCanin = function () {
    let unixtime = "" + Math.floor(moment().utc() / 1000);
    let royalCanin = {
        email: this.email,
        password: this.royalCaninPassword,
        companyId: this.country === "ES" ? 1 : 2,
        appId: config.royalCanin.app_id,
        clientId: config.royalCanin.client_id,
        unixTime: unixtime,
        languageCode: this.country,
        name: this.name,
        lastName: this.lastName,
        mobilePhone: this.phones[0],
        phoneCountryCode: this.country,
        postalCode: this.address.postalCode,
        countryCode: this.country,
        pets: [
            // Should be filled by controller
        ]
    };
    return royalCanin
};

let ClientUser = User.discriminator('ClientUser',clientSchema);
module.exports = ClientUser;