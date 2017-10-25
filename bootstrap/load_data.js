// Path helper
let winston = require('lib/loggers/logger').winston;
let async = require('async');
let fs = require('fs');
let imageLoader = require("bootstrap/load_images");
let bcrypt = require("bcrypt-nodejs");
const seeder = require('mongoose-seeder');
const csv = require('csvtojson');
const constants = require('api/common/constants');

// Config


// Constants

const files = [
    {"file": "bootstrap/bevvie/data/breedsCats.csv", "species": "Cats"},
    {"file": "bootstrap/bevvie/data/breedsDogs.csv", "species": "Dogs"},
];

let breedsToLoad = {
    breeds: {
        "_model": "Breed",
    }
};

let shouldLoad = ["breeds","admin","telemarketing","vetCenters","potentialClients","pets"];

let jsonToLoad = {
    breeds: {},
    pets: require("bootstrap/bevvie/data/pets.json"),
    admin: require("bootstrap/bevvie/data/adminUsers.json"),
    potentialClients: require("bootstrap/bevvie/data/potentialClients.json"),
    telemarketing: require("bootstrap/bevvie/data/telemarketing.json"),
    vetCenters: require("bootstrap/bevvie/data/vetCenters.json")
};



// Helper functions

function _createDir(dir) {
    let fs = require('fs');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function _readCSV(csvFilePath, productsReadData, cb) {
    csv({trim: true})
        .fromFile(csvFilePath)
        .on('json', (jsonObj) => {
            // combine csv header row and csv line to a json object
            // jsonObj.a ==> 1 or 4
            productsReadData.push(jsonObj)
        })
        .on('done', (error) => {
            if (error) {
                winston.error('Data error ' + error)
            }
            else {
                winston.info('Readed data from ' + csvFilePath)
            }
            cb(error)
        })
}


function _getUsers() {
    let admin = process.env.BOOTSTRAP_ADMIN_USER,
        admin_pass = bcrypt.hashSync(process.env.BOOTSTRAP_ADMIN_PASS, bcrypt.genSaltSync(8), null),
        user = process.env.BOOTSTRAP_USER_USER,
        user_pass = bcrypt.hashSync(process.env.BOOTSTRAP_USER_PASS, bcrypt.genSaltSync(8), null);
    if (!admin || !admin_pass || !user || !user_pass) {
        console.log("No variables set for users");
        process.exit(-1)
    }

    return {
        "_dependencies": {
            "bcrypt": "bcrypt-nodejs"
        },
        "users": {
            "_model": "User",
            "admin": {
                "username": admin,
                "password": admin_pass,
                "admin": 1
            },
        }
    }
}

function processBreeds(species, breeds, cb) {
    let finalObject = {};
    async.each(breeds,
        function (breed, done) {
            let id = breed["ID"];
            let object = {};
            object[id] = {
                royalCaninIdentifier: id,
                species: species,
                name: [
                    {
                        localizedName: breed["Spanish"],
                        language: "es",
                    }, {
                        localizedName: (breed["Portuguese"] + "_PT"),
                        language: "pt",
                    }
                ],
            };
            Object.assign(finalObject, object);
            done();
        },
        function (err) {
            if (err) {
                winston.error("ERROR: " + err);
                process.exit(-1)
            }
            cb(finalObject)
        })
}

function _loadDB(callback) {
    winston.info('Seeding...');

    let data = {};
    //let userData = _getUsers();
    jsonToLoad.breeds = breedsToLoad;

    // Models
    const user = require('api/models/users/user');
    const breeds = require('api/models/pets/breeds');
    const potentialUser = require('api/models/users/potentiaclientUser');
    const telemarketing = require('api/models/users/telemarketingUser');
    const vetcenter = require('api/models/users/vetcenterUser');
    const admin = require('api/models/users/adminUser');
    const pets = require('api/models/pets/pets');

    // Order is important

    shouldLoad.forEach(function (element) {
        let dataElement = jsonToLoad[element];
        Object.assign(data, dataElement);
    });

    winston.info('loading data: ' + JSON.stringify(Object.keys(data), 0, 2));
    let timer = winston.startTimer();
    seeder.seed(data, {dropDatabase: true}).then(function (dbData) {
        // The database objects are stored in dbData
        async.map(data, function (element, done) {
            let name = element._model;
            let size = Object.keys(element).length;
            let newElement = {};
            newElement[name] = size;
            done(null, newElement)
        }, function (err, result) {
            winston.info('loaded data: ' + JSON.stringify(result), 0, 2);
            timer.done("Filled data ");
            callback()
        });

    }).catch(function (err) {
        // handle error
        winston.error('error loading data: ' + err);
        process.exit(-1)

    });
}

function startDBCreation(callback) {
    // Read Product data from files
    async.eachSeries(files, function (file, fileDone) {
            let breedsReadData = [];
            let filename = file["file"];
            let species = file["species"];
            winston.info('Reading ' + filename);
            _readCSV(filename, breedsReadData, function (err, result) {
                winston.info('Read data from files ' + species + ' nº: ' + breedsReadData.length);
                processBreeds(species, breedsReadData, function (resultData) {
                    Object.assign(breedsToLoad.breeds, resultData);
                    fileDone();
                });

            });
        },
        function (err) {
            if (err) {
                winston.error('Error reading files ' + err);
                process.exit(-1)
            }
            else {
                _loadDB(callback)
            }
        }
    )
}


module.exports.initDatabase = function (elements,callback) {
    if (typeof elements === "function"){
        callback = elements;
        elements = ["breeds"];
    }
    shouldLoad = elements;
    const mongoose = require('lib/db/mongoose')(function () {
        startDBCreation(callback);
    });
};