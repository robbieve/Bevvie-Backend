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
}

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
