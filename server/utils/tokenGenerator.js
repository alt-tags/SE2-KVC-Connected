const crypto = require("crypto");

const generateResetToken = () => {
    return crypto.randomBytes(3).toString("hex").toUpperCase(); 
};

module.exports = generateResetToken;