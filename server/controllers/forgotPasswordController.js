const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendEmail } = require("../utils/emailUtility");
const generateResetToken = require("../utils/tokenGenerator");
const db = require("../config/db");

const resetTokens = new Map(); 

// request a password reset (step 1)
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        // check if user exists
        const [user] = await db.query("SELECT * FROM users WHERE user_email = ?", [email]);
        if (!user || user.length === 0) return res.status(404).json({ error: "User not found." });

        // generate reset code
        const resetToken = generateResetToken();
        resetTokens.set(email, { token: resetToken, expires: Date.now() + 10 * 60 * 1000 }); // 10 minutes expiration

        // send email
        const subject = "Password Reset Request - Kho Veterinary Clinic";
        const body = `Greetings! \n\n
We received a request to reset your password for your Kho Veterinary Clinic account. If you requested this reset, please use the verification code below.\n\n
The code is valid for **10 minutes**. If you did not request this, please ignore this email, and your password will remain unchanged.\n\n
For security reasons, do not share this code with anyone.\n\n
Best regards,\n
**Kho Veterinary Clinic Support Team**\n\n\n
🔑 **Reset Code:** ${resetToken}\n\n`;

        // Send email
        await sendEmail(email, subject, body);

        res.json({ message: "Reset code sent to your email." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while requesting password reset." });
    }
};

// Resend password reset code
const resendResetCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        // check if the user exists
        const [user] = await db.query("SELECT * FROM users WHERE user_email = ?", [email]);
        if (!user) return res.status(404).json({ error: "User not found." });

        // generate new reset code
        const newResetToken = generateResetToken();
        resetTokens.set(email, { token: newResetToken, expires: Date.now() + 10 * 60 * 1000 });

        // send new reset code
        const subject = "Password Reset Code - Kho Veterinary Clinic";
        const body = `Hello,\n\nYour new password reset code is: ${newResetToken}\n\nThis code is valid for 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nKho Veterinary Clinic Support Team`;
        await sendEmail(email, subject, body);

        res.json({ message: "A new reset code has been sent to your email." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while resending reset code." });
    }
};

// verify reset code (step 2)
const verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const storedToken = resetTokens.get(email);

        // validate if token exists
        if (!storedToken) {
            console.log("No token found for email:", email);
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        // validate correct token
        if (storedToken.token !== code) {
            console.log("Provided code does not match stored token:", { provided: code, stored: storedToken.token });
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        // validate expired token
        if (storedToken.expires < Date.now()) {
            console.log("Reset code has expired for email:", email);
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        res.json({ message: "Code verified. Proceed to reset your password." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error while verifying reset code." });
    }
};

// reset password (Step 3)
const resetPassword = async (req, res) => {
    try {
        const { email, accessCode, newPassword, confirmPassword } = req.body;
        console.log("Received password reset request:", req.body);

        // validate password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match." });
        }

        console.log("Current reset tokens:", Array.from(resetTokens.entries()));

        const storedToken = resetTokens.get(email);
        console.log("Stored token for email:", storedToken)

        if (!storedToken) {
            console.log("No token found for email:", email);
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        if (storedToken.token !== accessCode) {
            console.log("Provided code does not match stored token:", { provided: accessCode, stored: storedToken.token }); 
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        if (storedToken.expires < Date.now()) {
            console.log("Reset code has expired for email:", email);
            return res.status(400).json({ error: "Invalid or expired reset code." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET user_password = ? WHERE user_email = ?", [hashedPassword, email]);

        // clear reset token
        resetTokens.delete(email);

        console.log("Password reset successfully for:", email); 
        res.json({ message: "Password reset successfully. You can now log in." });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ error: "Server error while resetting password." });
    }
};

module.exports = { requestPasswordReset, verifyResetCode, resetPassword, resendResetCode };