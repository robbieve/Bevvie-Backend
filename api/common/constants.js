// Countries
let winston = require("lib/loggers/logger").winston;
let CountryLanguage = require('country-language');
let allCountries = CountryLanguage.getCountryCodes(2);
allCountries.push('none');
let allLanguages = CountryLanguage.getLanguageCodes(1);
allLanguages.push('none');
module.exports.allCountries = allCountries;
module.exports.allLanguages = allLanguages;

// Roles

const roleNames = {
    admin: "admin",
    telemarketing: "telemarketing",
    client: "client",
    vetcenter: "vetcenter",
    potentialClient: "potentialClient",
};

const roles = Object.keys(roleNames);

module.exports.roles = roles;
module.exports.roleNames = roleNames;

// Verification types

const verificationTypeNames= {
    activation: "activation",
    resetPassword: "resetPassword",
    simulatePlan: "simulatePlan"
};

const verificationTypes= Object.keys(verificationTypeNames);

module.exports.verificationTypes = verificationTypes;
module.exports.verificationTypeNames = verificationTypeNames;

// Activation status


const temporaryTokenStatusNames= {
    pending: "pending",
    mailSent: "mailSent",
    mailFailedAttempt: "mailFailedAttempt",
    mailFailed: "mailFailed",
};

const temporaryTokenStatuses= Object.keys(temporaryTokenStatusNames);

module.exports.temporaryTokenStatuses = temporaryTokenStatuses;
module.exports.temporaryTokenStatusNames = temporaryTokenStatusNames;


// Status

const statusNames = {
    pending: "pending",
    interested: "interested",
    notInterested: "notInterested",
    goToVetcenter: "goToVetcenter",
    preactive: "preactive",
    active: "active",
    inactive: "inactive"
};

const statuses = Object.keys(statusNames);
module.exports.statuses = statuses;
module.exports.statusNames = statusNames;

// Origin

const originNames = {
    originCV: "originCV",
    originTelemarketing: "originTelemarketing",
    originWeb: "originWeb"
};

const origins = Object.keys(originNames);
module.exports.originNames = originNames;
module.exports.origins = origins;

// Sort Users

const sortNames = {
    createdAt: "createdAt",
    origin: "origin",
    city: "city",
    name: "name",
    email: "email",
    common: "common",
    updatedAt: "updatedAt",
    status: "status",
    planCreationDate: "planCreationDate",
    petName:"petName",
    vetCenterName: "vetCenterName"
};

const sortValues= Object.keys(sortNames);
module.exports.sortNames = sortNames;
module.exports.sortValues = sortValues;

// Sort ORder

const sortOrderNames = {
    asc: "asc",
    desc: "desc",
};

const sortOrder= Object.keys(sortOrderNames);
module.exports.sortOrderNames = sortOrderNames;
module.exports.sortOrder = sortOrder;

// Vet Sizes

const vetSizesNames = {
    small: "small",
    mid: "mid",
    large: "large"
};

const vetSizes = Object.keys(vetSizesNames);
module.exports.vetSizes = vetSizes;
module.exports.vetSizesNames = vetSizesNames;

// Species
const speciesNames = {
    Dogs: "Dogs",
    Cats: "Cats"
};

const species = Object.keys(speciesNames);
module.exports.species = species;
module.exports.speciesNames = speciesNames;

// Gender

const genderNames = {
    Male: "Male",
    Female: "Female"
};

const gender = Object.keys(genderNames);
module.exports.gender = gender;
module.exports.genderNames = genderNames;



let healthPatologyNames = {
    heart: "heart",
    kidney: "kidney",
};

let healthPatologies = Object.keys(healthPatologyNames);
module.exports.healthPatologies = healthPatologies;
module.exports.healthPatologyNames = healthPatologyNames;


// WeightTypes
const weightTypeNames = {
    "thin": "thin",
    "onFit": "onFit",
    "overweight": "overweight",
};
const weightTypeTranslations = {
    "thin": {
        "es": "Raquítico"
    },
    "onFit": {
        "es": "Normopeso"
    },
    "overweigth": {
        "es": "Sobrepeso"
    }
};

const weightTypes = Object.keys(weightTypeNames);
module.exports.weightTypes = weightTypes;
module.exports.weightRoyalCanin = function (name) {
    switch (name){
        case weightTypeNames.thin:
            return 1;
            break;
        case weightTypeNames.onFit:
            return 2;
            break;
        case weightTypeNames.overweight:
            return 3;
            break;
        default:
            return undefined
    }
};
module.exports.weightTypeNames = weightTypeNames;

// FeedingTypes
const feedingTypeNames = {
    "human": "human",
    "supermarket": "supermarket",
    "premium": "premium"
};
const feedingTypeTranslations = {
    "human": {
        "es": "Humana",
    },
    "supermarket": {
        "es": "Supermercado",
    },
    "premium": {
        "es": "Premium"
    }
};

const feedingTypes = Object.keys(feedingTypeNames);
module.exports.feedingTypes = feedingTypes;
module.exports.feedingTypeRoyalCanin = function (name) {
    switch (name){
        case feedingTypeNames.human:
            return 1;
            break;
        case feedingTypeNames.supermarket:
            return 2;
            break;
        case feedingTypeNames.premium:
            return 3;
            break;
        default:
            return undefined
    }
};
module.exports.feedingTypeNames = feedingTypeNames;


// Activity
const activityNames = {
    high: "high",
    mid: "mid",
    low: "low",
};

const activity = Object.keys(activityNames);
module.exports.activity = activity;
module.exports.activityNames = activityNames;

// Ambient
const environmentNames = {
    wet: "wet",
    warm: "warm",
};

const environment = Object.keys(environmentNames);
module.exports.environment = environment;
module.exports.environmentNames = environmentNames;

// Pets Status

const petStatusNames = {
    suscribed: "suscribed",
    unsuscribed: "unsuscribed",
    cancelled: "cancelled",
    deceased: "deceased",
};

const petStatuses = Object.keys(petStatusNames);
module.exports.petStatuses = petStatuses;
module.exports.petStatusNames = petStatusNames;

// ContractTypes


const contractTypeNames = {
    // Tipo: LOPD comunicaciones comerciales, aceptación contrato Plan de Salud, Aceptación de contrato C.V.
    LOPDData: "LOPDData",
    LOPDCommercialComunication: "LOPDCommercialComunication",
    HealthPlan: "HealthPlan",
    VetCenterContract: "VetCenterContract",
};

const contractTypes = Object.keys(contractTypeNames);
module.exports.contractTypes= contractTypes;
module.exports.contractTypeNames = contractTypeNames;

// Plans Status

module.exports.planStatusNames = {
    presubscription: "presubscription",
    suscribed: "suscribed",
    renewal: "renewal",
    doNotRenew: "doNotRenew",
    cancelPending: "cancelPending",
    cancelled: "cancelled",
};

module.exports.planStatuses = Object.keys(module.exports.planStatusNames);

// Plans Cancellation Reasons

module.exports.planCancellationNames = {
    notRenewed: "notRenewed",
    deceased: "deceased",
    moveToOtherCity: "moveToOtherCity",
    other: "other",
};

module.exports.planCancellations = Object.keys(module.exports.planCancellationNames );

// Spain regions

module.exports.regionNames = {
    "ES":
        {
            "Madrid":"Madrid",
            "Barcelona":"Barcelona",
            "Valencia":"Valencia",
            "Alicante":"Alicante",
            "Sevilla":"Sevilla",
            "Málaga":"Málaga",
            "Murcia":"Murcia",
            "Cádiz":"Cádiz",
            "Vizcaya":"Vizcaya",
            "La Coruña":"La Coruña",
            "Baleares":"Baleares",
            "Las Palmas":"Las Palmas",
            "Asturias":"Asturias",
            "Santa Cruz de Tenerife":"Santa Cruz de Tenerife",
            "Zaragoza":"Zaragoza",
            "Pontevedra":"Pontevedra",
            "Granada":"Granada",
            "Tarragona":"Tarragona",
            "Córdoba":"Córdoba",
            "Girona":"Girona",
            "Gipuzkoa":"Gipuzkoa",
            "Toledo":"Toledo",
            "Almería":"Almería",
            "Badajoz":"Badajoz",
            "Jaén":"Jaén",
            "Navarra":"Navarra",
            "Castellón":"Castellón",
            "Cantabria":"Cantabria",
            "Valladolid":"Valladolid",
            "Ciudad Real":"Ciudad Real",
            "Huelva":"Huelva",
            "León":"León",
            "Lleida":"Lleida",
            "Cáceres":"Cáceres",
            "Albacete":"Albacete",
            "Burgos":"Burgos",
            "Lugo":"Lugo",
            "Salamanca":"Salamanca",
            "Ourense":"Ourense",
            "La Rioja":"La Rioja",
            "Álava":"Álava",
            "Guadalajara":"Guadalajara",
            "Huesca":"Huesca",
            "Cuenca":"Cuenca",
            "Zamora":"Zamora",
            "Palencia":"Palencia",
            "Ávila":"Ávila",
            "Segovia":"Segovia",
            "Teruel":"Teruel",
            "Soria":"Soria",
            "Ceuta":"Ceuta",
            "Melilla":"Melilla",
        },
    "PT":
        {
            "Aveiro":"Aveiro",
            "Beja":"Beja",
            "Braga":"Braga",
            "Bragança":"Bragança",
            "Castelo Branco":"Castelo Branco",
            "Coimbra":"Coimbra",
            "Évora":"Évora",
            "Faro":"Faro",
            "Guarda":"Guarda",
            "Leiria":"Leiria",
            "Lisbon":"Lisbon",
            "Portalegre":"Portalegre",
            "Porto":"Porto",
            "Santarém":"Santarém",
            "Setúbal":"Setúbal",
            "Viana do Castelo":"Viana do Castelo",
            "Vila Real":"Vila Real",
            "Viseu":"Viseu",
        }
};

module.exports.spainRegions = Object.keys(module.exports.regionNames.ES);
module.exports.portugalRegions = Object.keys(module.exports.regionNames.PT);
module.exports.allRegions = module.exports.spainRegions.concat(module.exports.portugalRegions);