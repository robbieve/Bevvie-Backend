const commonTestInit = require('../commonTestInit');
const commonTestUtils = require('../commonTestUtils');
let server = commonTestInit.server;
let configAuth = commonTestInit.configAuth;
let should = commonTestInit.should;
let chai = commonTestInit.chai;
let constants = require('api/common/constants');
// User
let user = require('api/models/users/user');
let royal = require('api/controllers/common/royalcaninProvider');
let config = require("config");
let moment = require("moment");

let unixtime = "" + Math.floor(moment().utc() / 1000);
let registeredMail = commonTestUtils.registeredMail;
let registeredPass = commonTestUtils.registeredPass;

let testUser = {
    email: "development+" + unixtime + "@develapps.es",
    password: registeredPass,
    companyId: 1,
    appId: config.royalCanin.app_id,
    clientId: config.royalCanin.client_id,
    unixTime: unixtime,
    languageCode: "es",
    name: "pp",
    lastName: "pepito",
    mobilePhone: "678999000",
    phoneCountryCode: "ES",
    postalCode: 12540,
    countryCode: "ES",
    pets: [{
        "codigoClinica": 620040000067533,
        "urlImagen": "",
        "supermercadoId": "",
        "codigoTienda": "",
        "especie": 1,
        "alimentoRCId": 120,
        "sexo": "macho",
        "fechaNacimiento": "2000-05-16",
        "marcaAlimentosId": 11,
        "origenId": 1,
        "origenAlimentoId": 2,
        "razaId": 79,
        "pesoId": 1,
        "esterilizado": "false",
        "nombreTienda": "",
        "nombre": "Garbi",
        "nombreClinica": "Presc 2",
        "codigoTiendaOnline": "",
        "nombreTiendaOnline": "",
        "origen": "Criador Test",
        "tiposAlimento": [1, 2, 3]
    }]
};

// tests
describe('RoyalCanin Group', () => {
    // Needed to not recreate schemas
    before(function (done) {
        commonTestInit.before(done);
    });
    // Needed to not fail on close
    after(function (done) {
        commonTestInit.after();
        done();
    });

    describe('Authorization', () => {
        it('Should succeed with no authorization token', function (done) {
            /*
            *
            * For example, with the next values for the parameters:

            signature = REM3MEI4QTYtM0ZFNi00RkY0LTlDOUUtNThGMzhFMEZGNTAy
            unixtime = 1428670290
            client_secret = NDg5MzcwMTYwNjg0QTY4M0RBOUYtNTFB
            Authorization is:

            2b0ec728ac929408c06ace4d3ef1a8446e47ec4d6a45e3c93d0efe41a21e846d

            * */
            let authHeader = royal.auth.authHeaderWithoutToken("REM3MEI4QTYtM0ZFNi00RkY0LTlDOUUtNThGMzhFMEZGNTAy", "1428670290", "NDg5MzcwMTYwNjg0QTY4M0RBOUYtNTFB");
            authHeader.should.be.equal("2b0ec728ac929408c06ace4d3ef1a8446e47ec4d6a45e3c93d0efe41a21e846d");
            done();
        });
        it('Should succeed with authorization token', function (done) {
            /*
            *
            * For example, with the next values for the parameters:

            access_token = RjZBN0MyQzQtOTNBQy00NDE2LTlCREItM0NBMjEwNkQ2NkEyLjEzNA==
            client_secret = MzE5NTY0NjI0NjY3MTA3RTNEQ0MtQTk0
            The value of access_token_proof is:

            d69eeeef2cec4bd83c5da74f86207fbf07930914ce9f161098248be8a7309efd
            and Authorization is:

            RjZBN0MyQzQtOTNBQy00NDE2LTlCREItM0NBMjEwNkQ2NkEyLjEzNA==:d69eeeef2cec4bd83c5da74f86207fbf07930914ce9f161098248be8a7309efd

            * */
            royal.accessToken = "RjZBN0MyQzQtOTNBQy00NDE2LTlCREItM0NBMjEwNkQ2NkEyLjEzNA==";
            let authHeader = royal.auth.authHeader("MzE5NTY0NjI0NjY3MTA3RTNEQ0MtQTk0");
            authHeader.should.be.equal("RjZBN0MyQzQtOTNBQy00NDE2LTlCREItM0NBMjEwNkQ2NkEyLjEzNA==:d69eeeef2cec4bd83c5da74f86207fbf07930914ce9f161098248be8a7309efd");
            done();
        });
    });
    describe('Register', () => {
        it('should succeed for valid data', (done) => {
            royal.register(testUser, function (err, res) {
                res.statusCode.should.be.equal(200);
                res.should.be.json;
                res.body.should.be.an('object');
                // {"userId":"N0NEOERFNTg4NjQ1NDk4.17"}
                res.body.should.have.property('userId');
                done();
            });
        });
    });
    describe('Login', () => {
        let userId = "";
        let newTestUser = {};
        before(function (done) {
            let unixtime = "" + Math.floor(moment().utc() / 1000);
            newTestUser = JSON.parse(JSON.stringify(testUser));
            newTestUser.email = registeredMail;
            royal.register(newTestUser, function (err, res) {
                let userId = res.userId;
                done();

            });
        });
        it('should succeed for valid data', (done) => {
            let userLogin = {
                email: newTestUser.email,
                userPassword: newTestUser.password,
                appid: newTestUser.appId,
                clientid: newTestUser.clientId,
                unixtime: Math.floor(moment().utc() / 1000),
            };
            royal.login(userLogin, function (err, res) {
                res.statusCode.should.be.equal(200);
                res.should.be.json;
                res.body.should.be.an('object');
                res.body.should.have.property('accessToken');

                /*
                {
                    "sessionId": 97,
                    "accessToken": "NzYwRkRDOUUtRkYxQS00QTE1LUI4RUUtM0IxMEFDMjJBRTM1Ljk3",
                    "expires": 1505825572,
                    "userId": "NkM3Mzc2NUE2NDA0NDU0.29"
                }
                */
                done();

            });
        });
    });
    describe('User Data', () => {
        let userId = "";
        before(function (done) {
            let unixtime = "" + Math.floor(moment().utc() / 1000);
            let userLogin = {
                email: registeredMail,
                userPassword: registeredPass,
                appid: config.royalCanin.app_id,
                clientid: config.royalCanin.client_id,
                unixtime: unixtime,
            };
            royal.login(userLogin, function (err, res) {
                res.statusCode.should.be.equal(200);
                res.should.be.json;
                res.body.should.be.an('object');
                res.body.should.have.property('accessToken');

                /*
                {
                    "sessionId": 97,
                    "accessToken": "NzYwRkRDOUUtRkYxQS00QTE1LUI4RUUtM0IxMEFDMjJBRTM1Ljk3",
                    "expires": 1505825572,
                    "userId": "NkM3Mzc2NUE2NDA0NDU0.29"
                }
                */
                userId = res.body.userId;
                royal.accessToken = res.body.accessToken;
                done();

            });
        });
        it('should succeed getting user data', (done) => {
            royal.userData(userId, true, function (err, res) {
                res.statusCode.should.be.equal(200);
                res.should.be.json;
                res.body.should.be.an('object');
                res.body.should.have.property('userData');
                res.body.should.have.property('pets');

                /*
                {
                    "sessionId": 97,
                    "accessToken": "NzYwRkRDOUUtRkYxQS00QTE1LUI4RUUtM0IxMEFDMjJBRTM1Ljk3",
                    "expires": 1505825572,
                    "userId": "NkM3Mzc2NUE2NDA0NDU0.29"
                }
                */
                done();

            });
        });
        it('should succeed updating user data', (done) => {
            /*
            *
            * password	string	User's password
            name	string	User's name
            lastName	string	User's last name
            mobilePhone	string	User's mobile phone, without the country prefix.
            phoneCountryCode	string	ISO 3166-1 alpha-2 code of user's mobile phone. For example, in Spain: ES; in Portugal :PT.
            postalCode	string	User's postal code
            countryCode	string	User's country code (ISO 3166-1 alpha-2). Possible values: AD: Andorra, AE: United Arab Emirates; AF: Afghanistan; etc.
            pets	json array	Array with User's pets.
            * */

            let modifiedUser = {
                password: registeredPass,
                name: "RegisteredName-"+unixtime,
                lastName: "ALastName",
                mobilePhone: "650009988",
                phoneCountryCode: "ES",
                postalCode: "46021",
                countryCode: "ES",
                pets:[
                    {
                        "codigoClinica": 620040000067533,
                        "urlImagen": "",
                        "supermercadoId": "",
                        "codigoTienda": "",
                        "especie": 1,
                        "alimentoRCId": 120,
                        "sexo": "macho",
                        "fechaNacimiento": "2000-05-16",
                        "marcaAlimentosId": 11,
                        "origenId": 1,
                        "origenAlimentoId": 2,
                        "razaId": 79,
                        "pesoId": 1,
                        "esterilizado": "false",
                        "nombreTienda": "",
                        "nombre": "ElOtroChucho-"+unixtime,
                        "nombreClinica": "Presc 2",
                        "codigoTiendaOnline": "",
                        "nombreTiendaOnline": "",
                        "origen": "Criador Test",
                        "tiposAlimento": [1, 2, 3]
                    }
                ]
            };

            royal.updateUserData(modifiedUser, userId, function (err, res) {
                should.not.exist(err);
                res.statusCode.should.be.equal(200);
                done();
            });
        });
    });
    describe('Get Clinics Data', () => {
        it('should succeed for valid data', (done) => {
            royal.clinicsData("12005", function (err, res) {
                res.statusCode.should.be.equal(200);
                res.body.should.be.an('object');
                res.body.should.have.property('prescribers');
                done();

            });
        });
    });
});

