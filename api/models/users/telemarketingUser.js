const mongoose = require('mongoose');
const User = require('./user');


let TelemarketingUser = User.discriminator('TelemarketingUser', new mongoose.Schema({
    // No extra attributes for telemarketing
}, {timestamps: true, discriminatorKey: 'userType'}));
module.exports = TelemarketingUser;