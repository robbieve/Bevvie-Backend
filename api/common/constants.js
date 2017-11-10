// Countries
let winston = require("lib/loggers/logger").winston;
let CountryLanguage = require('country-language');
let allCountries = CountryLanguage.getCountryCodes(2);
allCountries.push('none');
let allLanguages = CountryLanguage.getLanguageCodes(1);
allLanguages.push('none');
module.exports.allCountries = allCountries;
module.exports.allLanguages = allLanguages;

// Users
// Roles

module.exports.users = {};

module.exports.users.accessTypeNames  = {
    facebook: "facebook",
    firebase: "firebase",
    password: "password",
};
module.exports.users.accessTypes = Object.keys(module.exports.users.accessTypeNames);

module.exports.users.validationTypeNames  = {
    true: "true",
    false: "false",
    pending: "pending",
};
module.exports.users.validationTypes = Object.keys(module.exports.users.validationTypeNames  );

module.exports.users.sortNames = {
    name: "name",
    country: "country",
    languages: "languages",
    banned: "banned",
    createdAt: "createdAt"
};

module.exports.sortOrderNames = {
    asc: "asc",
    desc: "desc",
};

module.exports.users.maxAge = 66;

// Venues
module.exports.venues = {};
module.exports.venues.weekdaysNames = {
    1: 1,
    2: 1,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7
};

module.exports.venues.weekdays = Object.keys(module.exports.venues.weekdaysNames);

// GEO
module.exports.geo = {};
module.exports.geo.formNames = {
    Point:"Point",
    LineString:"LineString",
    Polygon:"Polygon",
    MultiPoint:"MultiPoint",
    MultiLineString:"MultiLineString",
    MultiPolygon:"MultiPolygon",
    GeometryCollection:"GeometryCollection",
};
module.exports.geo.forms = Object.keys(module.exports.geo.formNames);

// CHECKIN
module.exports.checkins = {};
module.exports.checkins.maxTime = 18*3600; //18 hours max per visit

// Chat constants

// Chats
module.exports.chats = {};
module.exports.chats.chatStatusNames= {
    "created":"created",
    "accepted":"accepted",
    "rejected":"rejected",
    "exhausted":"exhausted",
    "expired":"expired"
};

module.exports.chats.chatStatuses = Object.keys(module.exports.chats.chatStatusNames);
module.exports.chats.maxMessages = 3;

// Push
module.exports.pushes = {};
module.exports.pushes.pushTypeNames= {
    "chatCreate":"chatCreate",
    "chatMessage":"chatMessage",
    "chatRejected":"chatRejected",
    "validProfile":"validProfile",
    "validProfileReview":"validProfileReview",
    "invalidProfile":"invalidProfile",
};
module.exports.pushes.pushTypes = Object.keys(module.exports.pushes.pushTypeNames);

module.exports.pushes.priorityNames= {
    "high":"high",
    "normal":"normal"
};

module.exports.pushes.priorities = Object.keys(module.exports.pushes.priorityNames);
module.exports.pushes.statusNames= {
    "pending":"pending",
    "failedAttempt":"failedAttempt",
    "failed":"failed",
    "succeed":"succeed"
};

module.exports.pushes.statuses = Object.keys(module.exports.pushes.statusNames);
