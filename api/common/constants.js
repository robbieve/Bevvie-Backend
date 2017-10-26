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
