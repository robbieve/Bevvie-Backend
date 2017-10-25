const mongoose = require('mongoose');
const User = require('./user');
const constants = require('api/common/constants');
const Schema = mongoose.Schema;

// PotentialClientUser Schema

/**
 * @apiDefine PotentialClientParameters
 * @apiParam (PotentialClient) {String[]} phones phones of the potential client
 * @apiParam (PotentialClient) {Object[]} statuses statuses of the potential client
 * @apiParam (PotentialClient) {Date} statuses.date=CurrentDate date of the status
 * @apiParam (PotentialClient) {String="pending","interested","notInterested","goToVetCenter","preactive"} statuses.status=pending status of the client
 * @apiParam (PotentialClient) {String{9..}} phones.phone phone of the client
 * @apiParam (PotentialClient) {Object} address address of the VetCenter
 * @apiParam (PotentialClient) {String} address.address address line of the VetCenter.
 * @apiParam (PotentialClient) {String} address.city city line of the VetCenter.
 * @apiParam (PotentialClient) {String} address.postalCode postalCode line of the VetCenter.
 * @apiParam (PotentialClient) {String} address.region region line of the VetCenter.
 * @apiParam (PotentialClient) {Object} origin origin of the user who acquired this user.
 * @apiParam (PotentialClient) {String} origin.user id of the user who acquired this user.
 * @apiParam (PotentialClient) {String="originCV","originTelemarketing","originWeb"} origin.originType type of origin.
 * @apiParam (PotentialClient) {String} origin.name name of the user who acquired this user. It is used for search purposes
 * @apiParam (PotentialClient) {Object[]} contracts contracts signed
 * @apiParam (PotentialClient) {Date} contracts.date date of the contract
 * @apiParam (PotentialClient) {String} contracts.contract id of the signed contract.
 * @apiParam (PotentialClient) {String="ES","PT"} country=ES country of the potential client.
 */

let potentialSchema =  new mongoose.Schema({
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
        region: {type: String, required: true, trim: true,enum: {
            values: constants.allRegions,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allRegions
        }},
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
        name: {type: String},
        originType: {
            type: String,
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
    country: {
        type: String,
        enum: {
            values: constants.allCountries,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.allCountries
        },
        default: "ES"
    },

}, {timestamps: true, discriminatorKey: 'userType'});

let PotentialClientUser = User.discriminator('PotentialClientUser',potentialSchema);

potentialSchema.index({'sort.name': 1}, {name: 'sortNameIndex'});
potentialSchema.set('toJSON', {
    transform: function (doc, user, options) {
        delete user.password; // remove user password from any response
        delete user.sort; // remove sort data
    }
});


// Modify mapping
PotentialClientUser.mapObject = function (user, newObject) {
    if (!user) {
        user = new PotentialClientUser();
    }
    Object.keys(newObject).forEach(function (key) {
        user[key] = newObject[key]
    })
    if (newObject.statuses === undefined){
        user.statuses = { status: constants.statusNames.preactive }
    }
    if (newObject.password) {
        user.password = user.generateHash(newObject.password);
    }

    return user
};


module.exports = PotentialClientUser;