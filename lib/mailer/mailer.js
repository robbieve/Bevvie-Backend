let nodemailer = require('nodemailer');
let config = require('config');
/*
*WARNING: MUST ENABLE https://myaccount.google.com/lesssecureapps
*
* EXAMPLE:
*
*
const mailer = require('lib/mailer/mailer');
// Message object
var message = {

    // sender info
    from: 'Sender Name <sender@example.com>',

    // Comma separated list of recipients
    to: '"Receiver Name" <pablo.romeu@gmail.com',

    // Subject of the message
    subject: 'Nodemailer is unicode friendly ✔',

    // plaintext body
    text: 'Hello to myself!',

    // HTML body
    html:'<p><b>Hello</b> to myself <img src="cid:note@node"/></p>'+
    '<p>Here\'s a nyan cat for you as an embedded attachment:<br/></p>'

};

console.log('Sending Mail');
mailer.sendMail(message, function(error) {
    if (error) {
        console.log('Error occured');
        console.log(error.message);
        return;
    }
    console.log('Message sent successfully!');
})
*
*
* */




module.exports = nodemailer.createTransport({
    host: config.nodemailer.host,
    port: config.nodemailer.port,
    pool: true,
    auth: {
        user: config.nodemailer.user,
        pass: config.nodemailer.pass
    },
    secure: config.nodemailer.secure,
    tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
    },
    maxConnections: 5,
    maxMessages: 10
});