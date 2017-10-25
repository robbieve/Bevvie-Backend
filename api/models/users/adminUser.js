const mongoose = require('mongoose');
const User = require('./user');

// AdminUser Schema
let AdminUser = User.discriminator('AdminUser', new mongoose.Schema({
    // No extra attributes for admin
}, {timestamps: true, discriminatorKey: 'userType'}));

module.exports = AdminUser;