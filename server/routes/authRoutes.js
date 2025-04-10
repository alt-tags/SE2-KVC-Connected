const express = require("express");
const { generateCaptcha, generateCaptchaImage } = require("../utils/captchaUtility");
const authController = require("../controllers/authController");
const { requestPasswordReset, verifyResetCode, resetPassword, resendResetCode } = require("../controllers/forgotPasswordController");
const { authenticate } = require("../middleware/authMiddleware");
const db = require("../config/db");
const bcrypt = require('bcrypt');
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

console.log("DB module:", db);

// create router instance
const router = express.Router();
const captchaStore = new Map();
const pendingSignups = new Map();

router.use(cookieParser());

router.get('/verify-token', async (req, res) => { 
    console.log('GET /auth/verify-token hit');

    const token = req.cookies.token;
    console.log('Token from cookie:', token);

    if (!token) {
        console.log('No token cookie found.');
        return res.status(401).json({ error: 'Not authenticated: No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded successfully:', decoded);
        if (!decoded.role) {
             console.log('Role missing in token payload.');
             res.clearCookie('token', { path: '/' }); 
             return res.status(401).json({ error: 'Not authenticated: Role missing in token.' });
        }

        console.log('Verification successful. Sending back role:', decoded.role);
        res.status(200).json({ role: decoded.role });

    } catch (error) {
        console.error('Token verification error:', error.message);
        res.clearCookie('token', { path: '/' });
        return res.status(401).json({ error: 'Not authenticated: Invalid or expired token.' });
    }
});
router.post("/captcha/verify", (req, res) => {
    const { captchaResponse } = req.body;

    if (!captchaResponse) {
        return res.status(400).json({ error: "Missing CAPTCHA response." });
    }

    if (!req.session.captcha) {
        return res.status(400).json({ error: "Session expired. Please refresh CAPTCHA." });
    }

    if (captchaResponse !== req.session.captcha) {
        return res.status(400).json({ error: "❌ Incorrect CAPTCHA!" });
    }

    delete req.session.captcha;
    res.json({ message: "✅ CAPTCHA verified!" });
});

// route to generate captcha
router.get("/captcha", authController.getCaptcha);

// routes for user signup and logout (delegated to authController)
router.post("/login", authController.loginUser);
router.post("/signup/petowner-step1", authController.signupPetOwnerStep1);
router.post("/signup/petowner-step2", authController.signupPetOwnerStep2);
router.post("/signup/employee", authController.signupEmployeeRequest);
router.post("/signup/employee-verify", authController.signupEmployeeComplete);
router.post("/logout", authenticate, authController.logoutUser);

// routes for password reset
 router.post("/forgot-password", requestPasswordReset);
 router.post("/verify-reset-code", verifyResetCode);
 router.post("/reset-password", resetPassword);
 router.post("/resend-reset-code", resendResetCode);

module.exports = router;