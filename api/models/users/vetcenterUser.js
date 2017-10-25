const mongoose = require('mongoose');
const User = require('./user');
const constants = require('api/common/constants');
const Schema = mongoose.Schema;
const validator = require('validator');
let mongooseValidators = require('lib/validation/mongooseValidators');

// VetcenterUser Schema
/**
 * @apiDefine VetCenterParameters
 * @apiParam (VetCenter) {String} royalCaninCode     The code assigned by royal canin.
 * @apiParam (VetCenter) {Object} [origin] origin of the user who acquired this user.
 * @apiParam (VetCenter) {String} origin.user id of the user who acquired this user.
 * @apiParam (VetCenter) {String="originCV","originTelemarketing","originWeb"} origin.originType type of origin.
 * @apiParam (VetCenter) {String} origin.name name of the user who acquired this user. It is used for search purposes
 * @apiParam (PotentialClient) {Object[]} contracts contracts signed
 * @apiParam (VetCenter) {String="small","mid","large"} [size=small]  size of the vetCenter.
 * @apiParam (VetCenter) {String} legalName  legal name of the VetCenter.
 * @apiParam (VetCenter) {String} NIF  VAT Number.
 * @apiParam (VetCenter) {Object[]} [contracts] contracts signed
 * @apiParam (VetCenter) {Date} contracts.date date of the contract
 * @apiParam (VetCenter) {String} contracts.contract id of the signed contract.
 * @apiParam (VetCenter) {Object} contact the vetCenter contact person
 * @apiParam (VetCenter) {String} contact.name name of the contact
 * @apiParam (VetCenter) {Object} contact.surname surname of the contact
 * @apiParam (VetCenter) {Object} [contact.secondSurname] surname of the contact
 * @apiParam (VetCenter) {String{9..}} contact.phone phone of the contact
 * @apiParam (VetCenter) {String} [contact.email] email of the contact
 * @apiParam (VetCenter) {Object} address address of the VetCenter
 * @apiParam (VetCenter) {String} address.address address line of the VetCenter.
 * @apiParam (VetCenter) {String} address.city city line of the VetCenter.
 * @apiParam (VetCenter) {String} address.postalCode postalCode line of the VetCenter.
 * @apiParam (VetCenter) {String} address.region region line of the VetCenter.
 * @apiParam (VetCenter) {String="ES","PT"} address.country=ES country line of the VetCenter.
 * @apiParam (VetCenter) {String{9..}} phone phone of the vetcenter
 * @apiParam (VetCenter) {String[]="Dogs","Cats"} species species the vetcenter has consultation for.
 * @apiParam (VetCenter) {Object} [economicResults] economic results of the vetCenter
 * @apiParam (VetCenter) {String} [economicResults.pdfResults] a pdf object id or full object.
 * @apiParam (VetCenter) {Object} [economicResults.incomeStatement] income data
 * @apiParam (VetCenter) {Number} [economicResults.incomeStatement.income] income value
 * @apiParam (VetCenter) {Number} [economicResults.incomeStatement.purchases] purchases value
 * @apiParam (VetCenter) {Number} [economicResults.incomeStatement.staff] staff value
 * @apiParam (VetCenter) {Number} [economicResults.incomeStatement.operativeSpending] operativeSpending value
 * @apiParam (VetCenter) {Number} [economicResults.incomeStatement.financialSpending] financialSpending value
 * @apiParam (VetCenter) {Date} economicResults.lastModification=CurrentDate the last date of modification
 * @apiParam (VetCenter) {String} [stripeId] the token used for the payments
 */
let vetSchema =  new mongoose.Schema({
    royalCaninCode: {type: String, trim:true, required: true},
    origin: {
        user: {type: Schema.Types.ObjectId, ref: 'User'},
        originType: {
            type: String,
            required: true,
            enum: {
                values: constants.origins,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.origins
            },
            default: constants.originNames.originTelemarketing
        }
    },
    size: {
        type: String,
        enum: {
            values: constants.vetSizes,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.vetSizes
        },
        default: constants.vetSizesNames.small
    },
    legalName: {type: String, required: true, trim: true},
    NIF: {type: String, required: true, trim: true},
    contracts: [
        {
            date: {type: Date, default: new Date()},
            contract: {type: Schema.Types.ObjectId, ref: 'Contract'},
        }
    ],
    contact: {
        name: {type: String, required: true, trim:true},
        surname: {type: String, required: true, trim:true},
        secondSurname: {type: String, trim:true},
        phone: {
            type: String,
            trim:true,
            required: true,
            minlength: [9, 'The value of `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            validate: [mongooseValidators.mailValidator, 'Please fill a valid email address for `{PATH}`: (`{VALUE}`) is not valid'],
        },
    },
    address: {
        address: {type: String, required: true, trim: true},
        city: {type: String, required: true, trim: true},
        postalCode: {type: String, required: true,trim: true},
        region: {type: String, required: true, trim: true,
            enum: {
                values: constants.allRegions,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allRegions
            }
            },
        country: {
            type: String,
            enum: {
                values: ["ES","PT"],
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + ["ES","PT"]
            },
            default: "ES"
        },
    },
    phone: {
        type: String,
        required: true,
        trim:true,
        minlength: [9, 'The value of `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).']
    },
    species: [{
        type: String,
        required: true,
        enum: {
            values: constants.species,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.species
        }
    }],
    economicResults: {
        pdfResults: {type: Schema.Types.ObjectId, ref: 'Files'},
        incomeStatement: {
            income: {type: Number},
            purchases: {type: Number},
            staff: {type: Number},
            operativeSpending: {type: Number},
            financialSpending: {type: Number},
        },
        lastModification: {type: Date, default: new Date()}
    },
    stripeId: {type: String},
    sort:{
        name: {type: String},
    },
}, {timestamps: true, discriminatorKey: 'userType'});

let VetcenterUser = User.discriminator('VetcenterUser',vetSchema);

vetSchema.index({'sort.name': 1}, {name: 'sortNameIndex'});
vetSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.password; // remove user password from any response
        delete user.sort; // remove sort data
    }
});

// Modify mapping
VetcenterUser.mapObject = function (user, newObject) {
    if (!user) {
        user = new VetcenterUser();
    }
    Object.keys(newObject).forEach(function (key) {
        user[key] = newObject[key]
    });
    if (newObject.password) {
        user.password = user.generateHash(newObject.password);
    }

    return user
};

module.exports = VetcenterUser;