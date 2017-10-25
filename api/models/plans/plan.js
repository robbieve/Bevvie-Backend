// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let bcrypt = require('bcrypt-nodejs');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");
let winston = require("lib/loggers/logger").winston;
let async = require("async");
let regionPonderation = require("api/models/plans/regionPonderation");

/**
 * @apiDefine PlanParameters
 * @apiParam (Plan) {String} _id id of the object.
 * @apiParam (Plan) {Boolean} isSimulation=false whether this is a simulation or not.
 * @apiParam (Plan) {String} pet pet related to the plan.
 * @apiParam (Plan) {String} owner owner related to the plan.
 * @apiParam (Plan) {String} [vetCenter] vetCenter related to the plan.
 * @apiParam (Plan) {Number} [telemarketingProcedings] procedings associated to telemarketing.
 * @apiParam (Plan) {Object[]} statuses statuses of the plan
 * @apiParam (Plan) {Date} statuses.date=CurrentDate date of the status
 * @apiParam (Plan) {String="presubscription","suscribed","renewal","doNotRenew","cancelPending","cancelled"} statuses.status=presubscription status of the plan
 * @apiParam (Plan) {String="notRenewed","deceased","moveToOtherCity","other"} [cancelationReason] reason of the cancellation of the plan
 * @apiParam (Plan) {Object[]} contracts contracts signed
 * @apiParam (Plan) {Date} contracts.date date of the contract
 * @apiParam (Plan) {String} contracts.contract id of the signed contract.
 * @apiParam (Plan) {Object[]} treatments treatments offered
 * @apiParam (Plan) {String} treatments.mandatory mandatory treatments
 * @apiParam (Plan) {String} treatments.suggested suggested treatments
 * @apiParam (Plan) {String} treatments.other other treatments
 * @apiParam (Plan) {Object[]} treatmentsSelected treatments selected
 * @apiParam (Plan) {String} treatmentsSelected.mandatory mandatory treatments
 * @apiParam (Plan) {String} treatmentsSelected.suggested suggested treatments
 * @apiParam (Plan) {String} treatmentsSelected.other other treatments
 * @apiParam (Plan) {Object} origin origin of the user who acquired this user.
 * @apiParam (Plan) {String} origin.user id of the user who acquired this user.
 * @apiParam (Plan) {String="originCV","originTelemarketing","originWeb"} origin.originType type of origin.
 * @apiParam (Plan) {String} origin.name name of the user who acquired this user. It is used for search purposes
 * @apiParam (Plan) {Float} [telemarketingProcedings] proceding of the telemarketing. Percentage.

 * @apiParam (Plan) {Boolean} active=1 whether the object is active or not.
 *
 */
let planSchema = new Schema({
    isSimulation: {
        type: Boolean,
        default: false,
        required: true,
    },
    pet: {
        type: Schema.Types.ObjectId,
        ref: 'Pet',
        required: true,
    },
    vetCenter: {
        type: Schema.Types.ObjectId,
        ref: 'VetcenterUser',
        required: true,
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    statuses: [
        {
            date: {type: Date, required: true, default: new Date()},
            status: {
                type: String,
                enum: {
                    values: constants.planStatuses,
                    message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.planStatuses
                },
                default: constants.planStatusNames.presubscription
            }
        }
    ],
    cancelationReason: {
        type: String,
        enum: {
            values: constants.planCancellationNames,
            message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.planCancellationNames
        }
    },
    contracts: [
        {
            date: {type: Date, default: new Date()},
            contract: {type: Schema.Types.ObjectId, ref: 'Contract'},
        }
    ],
    treatments:
        {
            mandatory: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
            suggested: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
            other: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
        }
    ,
    treatmentsSelected:
        {
            mandatory: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
            suggested: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
            other: [{
                type: Schema.Types.ObjectId,
                ref: 'Treatment',
            }],
        }
    ,
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
    telemarketingProcedings: {type: Number},
    active: {type: Boolean, default: true},
    apiVersion: {type: String, required: true, default: config.apiVersion},
}, {timestamps: true});

planSchema.plugin(mongoosePaginate);
planSchema.index({'active': 1}, {name: 'activeIndex'});
planSchema.index({'vetCenter': 1}, {name: 'vetCenterIndex'});
planSchema.index({'pet': 1}, {name: 'petIndex'});
planSchema.index({'owner': 1}, {name: 'ownerIndex'});
planSchema.index({'$**': 'text'}, {name: 'textIndex', default_language: 'es'});

let autoPopulate = function (next) {
    this.populate('pet');
    this.populate('vetCenter');
    this.populate('owner');
    this.populate('treatments.mandatory');
    this.populate('treatments.suggested');
    this.populate('treatments.other');
    this.populate('treatmentsSelected.mandatory');
    this.populate('treatmentsSelected.suggested');
    this.populate('treatmentsSelected.other');
    this.populate('contracts.contract');
    this.populate('origin.user');
    this.where({apiVersion: config.apiVersion});
    next();
};
planSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);

planSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Plan();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    return newDBObject
};

// Other functions
planSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

planSchema.statics.deleteByIds = function (ids, callback) {
    Plan.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};
// filter queries
planSchema.statics.filterQuery = function (user, callback) {
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

planSchema.methods.isActive = function () {
      let suscribed = this.statuses.filter(function (element) {
          return element.status === constants.planStatusNames.suscribed;
      });
    let cancelled = this.statuses.filter(function (element) {
        return element.status === constants.planStatusNames.cancelled;
    });

    if (suscribed.length>0 && cancelled.length===0){
        return true;
    }
    return false;
};


let Plan = mongoose.model('Plan', planSchema);

// IMPLEMENTATION OF ALGORITHM

//TODO: implement algorithm
function _mockupAlgorithm(pet, ponderation, callback) {
    let Treatment = require("api/models/plans/treatment");
    let treatmentNames = [];
    let treatments = [];
    for (i = 0; i < Math.floor((Math.random() * 10) + 1); i++) {
        treatmentNames.push("Treatment " + i);
    }
    async.each(
        treatmentNames,
        function (name, isDone) {
            let aTreatment = new Treatment({
                name: name,
                description: "a description",
                reason: "a reason",
                price: Math.floor((Math.random() * 40) + 1),
                ponderation: ponderation
            });
            aTreatment.save(function (err) {
                treatments.push(aTreatment);
                isDone(err);
            });
        },
        function (err) {
            callback(err, treatments);
        }
    );
}

Plan.addTreatments = function (plan, country, region, postalCode, callback) {
    plan.treatments = {};
    async.waterfall([
        function (done) {
            regionPonderation.findOne({postalCode: postalCode, country: country}, function (err, ponderation) {
                done(err, ponderation);
            })
        },
        function (ponderation, done) {
            if (ponderation) {
                return done(null, ponderation)
            }
            ;
            regionPonderation.findOne({region: region, country: country}, function (err, ponderation) {
                done(err, ponderation);
            })
        },
        function (ponderation, done) {
            if (ponderation) {
                return done(null, ponderation)
            }
            ;
            regionPonderation.findOne({country: country}, function (err, ponderation) {
                done(err, ponderation);
            })
        },
    ], function (err, ponderation) {
        let ponderationValue = 1.0;
        if (ponderation && ponderation["ponderation"]) {
            ponderationValue = ponderation["ponderation"];
        }
        async.each(
            ["mandatory", "suggested", "other"],
            function (element, doneTreatments) {
                _mockupAlgorithm(plan.pet, ponderationValue, function (err, treatments) {
                    if (err) {
                        return callback(err, null)
                    }
                    plan.treatments[element] = treatments;
                    doneTreatments(err);
                });
            },
            function (err) {
                callback(err, plan);
            });
    });
};
Plan.generateNewSimulation = function (pet, owner, country, region, postalCode, callback = function () {
}) {
    let plan = new Plan();
    plan.isSimulation = true;
    plan.pet = pet;
    plan.owner = owner;
    plan.owner.address.postalCode = postalCode;
    plan.owner.address.region = region;
    plan.owner.address.country = country;
    Plan.addTreatments(plan,country, region, postalCode, callback);
};

module.exports = Plan;
