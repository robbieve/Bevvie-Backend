// grab the things we need
let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');
let Schema = mongoose.Schema;
const config = require('config');
let constants = require('api/common/constants');
let mongooseValidators = require('lib/validation/mongooseValidators');
let moment = require("moment");

/**
 * @apiDefine VenueParameters
 * @apiParam (Venue) {String} _id id of the object.
 * @apiParam (Venue) {String} name name of the venue
 * @apiParam (Venue) {String} [image] id of the image
 * @apiParam (Venue) {Number} radius radius where a user can check in
 * @apiParam (Venue) {Object} location location of the venue
 * @apiParam (Venue) {String} location.type=Point type of location
 * @apiParam (Venue) {Object[Number]} location.coordinates coordinates for the location (Lat,Long if point)
 * @apiParam (Venue) {Object[]} schedule schedule of the venue
 * @apiParam (Venue) {Number=1,2,3,4,5,6,7} schedule.weekday weekday of the schedule (1=Monday...)
 * @apiParam (Venue) {Date} schedule.openTime start time of the venue.
 * @apiParam (Venue) {Date} schedule.closeTime end time of the venue.
 *
 */

// https://stackoverflow.com/questions/32199658/create-find-geolocation-in-mongoose

let venueSchema = new Schema({
    name: {
        $type: String,
        required: true,
        trim: true
    },
    image: {$type: Schema.Types.ObjectId, ref: 'Image'},
    images: [{$type: Schema.Types.ObjectId, ref: 'Image'}],
    location: {
        type: {
            $type: String,
            default: "Point",
            enum: {
                values: constants.geo.forms,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.geo.forms
            },
            required: true
        },
        coordinates: [Number],
    },
    radius: {
        $type: Number,
        default: 30,
    },
    schedule: [{
        weekday: {
            $type: Number,
            enum: {
                values: constants.venues.weekdays,
                message: "value  (`{VALUE}`) not allowed for `{PATH}` , allowed values are " + constants.venues.weekdays
            },
            required: true,
        },
        openTime: {$type: Date, required: true},
        closeTime: {$type: Date, required: true},
    }],
    active: {$type: Boolean, default: true},
    apiVersion: {$type: String, required: true, default: config.apiVersion},
}, {timestamps: true, typeKey: '$type'});

venueSchema.plugin(mongoosePaginate);
venueSchema.index({'active': 1}, {name: 'activeIndex'});
venueSchema.index({'name': 1}, {name: 'nameIndex'});
venueSchema.index({'location': '2dsphere'}, {name: 'locationIndex'});
venueSchema.index({'$**': 'text'}, {name: 'textIndex', default_language: 'es'});
venueSchema.index({'schedule.weekday': 1}, {name: 'weekDayIndex'});

let autoPopulate = function (next) {
    this.populate('image');
    this.populate('images');
    this.where({apiVersion: config.apiVersion});
    next();
};
venueSchema.pre('findOne', autoPopulate).pre('find', autoPopulate);


venueSchema.statics.mapObject = function (newDBObject, newObject) {
    if (!newDBObject) {
        newDBObject = new Venue();
    }
    Object.keys(newObject).forEach(function (key) {
        newDBObject[key] = newObject[key]
    });
    newDBObject.image = newObject.image;
    return newDBObject
};

// Other functions
venueSchema.statics.validateObject = function (user, callback) {
    return callback(null)
};

// filter queries
venueSchema.statics.filterQuery = function (user, callback) {
    // No filtering here
    return callback(null, {})
};


venueSchema.statics.deleteByIds = function (ids, callback) {
    Venue.remove({_id: {$in: ids}}, function (err, element) {
        if (err) return callback(err);
        if (callback) callback(err, element.result);
    })
};

venueSchema.methods.maxTimePerCheck = function () {
    if (this.schedule) {
        let dayOfWeek = moment().isoWeekday();
        let schedule = this.schedule.filter(function (day) {
            return day.weekday === dayOfWeek;
        });
        if (schedule && schedule.length > 0) {
            let closeTimeString     = moment(schedule[0].closeTime).format("HH:mm");
            let currentTimeString   = moment().format("HH:mm");
            let currentTime = moment(currentTimeString,"HH:mm");
            let closeTime = moment(closeTimeString,"HH:mm");
            if (closeTime.unix()<currentTime.unix()){ // Time is tomorrow
                closeTime = moment(closeTime).add(1, "day");
            }
            let diff =  closeTime.unix()  - currentTime.unix();
            return diff < constants.checkins.maxTime ? diff : constants.checkins.maxTime ;
        }
    }
    return constants.checkins.maxTime;
};


let Venue = mongoose.model('Venue', venueSchema);

module.exports = Venue;
