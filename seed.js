// Path helper

require('app-module-path').addPath(__dirname);
let winston = require('lib/loggers/logger').winston;
let async = require('async');
let fs = require('fs');
let imageLoader = require("bootstrap/load_images");
let bcrypt = require("bcrypt-nodejs");
const seeder = require('mongoose-seeder');
const csv = require('csvtojson');
const constants = require('api/common/constants');
const dataLoader = require("bootstrap/load_data");

let shouldLoadImages = false;
let shouldLoadDatabase = true;

// Config
const mongoose = require('lib/db/mongoose')(function () {

    async.series([
        function (done) {
            if (!shouldLoadImages) {
                return done()
            }
            imageLoader.loadImages(function (err, imagesLoaded) {
                if (err) {
                    winston.error("Error loading images " + err)
                }
                else {
                    winston.info("Images loaded " + Object.keys(imagesLoaded.images).length);
                    fs.writeFileSync("./bootstrap/bevvie/bevvie.seedimages.json", JSON.stringify(imagesLoaded, 0, 2));
                }
                done()
            });
        },
        function (done) {
            if (!shouldLoadDatabase) {
                return done()
            }
            winston.log("LOADING DATABASE");
            dataLoader.initDatabase(
                ["breeds","admin","telemarketing","vetCenters","potentialClients","pets"]
                ,function () {
                winston.log("Loaded database");
                done();
            })
        }
    ], function (err) {
        if (err) {
            winston.error("ERROR: " + err);
            process.exit(-1);
        }
        process.exit(0);
    });

});
