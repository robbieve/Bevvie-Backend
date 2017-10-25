let Plan = require("api/models/plans/plan");
let Contract = require("api/models/contracts/contracts");
let Treatment = require("api/models/plans/treatment");
let Pet = require("api/models/pets/pets");
let winston = require("lib/loggers/logger").winston;
let async = require("async");
let regionPonderation = require("api/models/plans/regionPonderation");

//TODO: implement algorithm
function _mockupAlgorithm(pet, ponderation, callback) {
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

module.exports.generateNewSimulation = function (pet, owner, country, region, postalCode, callback = function () {
}) {
    let plan = new Plan();
    plan.isSimulation = true;
    plan.pet = pet;
    plan.owner = owner;
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
                _mockupAlgorithm(pet, ponderationValue, function (err, treatments) {
                    if (err) {
                        return callback(err, null)
                    }
                    plan.treatments[element] = treatments;
                    doneTreatments(err);
                });
            },
            function (err) {
                plan.save(function (err) {
                    Plan.findOne({_id: plan._id}, function (err, aPlan) {
                        callback(err, aPlan);
                    });
                });
            });
    });

};

module.exports.addTreatments = function (pet, owner, country, region, postalCode, callback = function () {
}) {
    let plan = new Plan();
    plan.isSimulation = true;
    plan.pet = pet;
    plan.owner = owner;
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
                _mockupAlgorithm(pet, ponderationValue, function (err, treatments) {
                    if (err) {
                        return callback(err, null)
                    }
                    plan.treatments[element] = treatments;
                    doneTreatments(err);
                });
            },
            function (err) {
                plan.save(function (err) {
                    Plan.findOne({_id: plan._id}, function (err, aPlan) {
                        callback(err, aPlan);
                    });
                });
            });
    });

};