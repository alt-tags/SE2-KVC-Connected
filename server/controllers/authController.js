const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const UserModel = require("../models/userModel");
const PetModel = require("../models/petModel");
const { generateCaptcha, generateCaptchaImage } = require("../utils/captchaUtility");
const { hashPassword } = require("../utils/passwordUtility");
const { generateToken } = require("../utils/authUtility");
const { sendEmail } = require("../utils/emailUtility");
const db = require("../config/db");

const getNewCaptchaData = (req) => {
    const newCaptchaText = generateCaptcha();
    const newCaptchaImage = generateCaptchaImage(newCaptchaText);
    req.session.captcha = newCaptchaText; 
    return { image: newCaptchaImage, captchaKey: newCaptchaText };
};

exports.getCaptcha = (req, res) => {
    const captchaText = generateCaptcha();
    const captchaImage = generateCaptchaImage(captchaText);

    req.session.captcha = captchaText;
    res.json({ image: captchaImage, captchaKey: captchaText });
};

// user login
exports.loginUser = async (req, res) => {
    try {
        const { email, password, captchaInput } = req.body;

<<<<<<< HEAD
        if (!email || !password) {
            req.session.captcha = null; // Clear CAPTCHA
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Validate CAPTCHA
=======
        // validate CAPTCHA
>>>>>>> upstream/master
        if (!req.session.captcha || captchaInput !== req.session.captcha) {
            const newCaptcha = getNewCaptchaData(req);
            return res.status(401).json({
                error: "❌ Incorrect CAPTCHA",
                newCaptcha: newCaptcha,
            });
        }

        // validate email
        const user = await UserModel.findByEmail(email);

        // validate password
        if (!user || !(await bcrypt.compare(password, user.user_password))) {
            const newCaptcha = getNewCaptchaData(req);
            return res.status(401).json({
                error: "Invalid email or password",
                newCaptcha: newCaptcha,
            });
        }

        // clear CAPTCHA after succesfull validation
        req.session.captcha = null;

        // generate token and set cookie
        const token = generateToken(user.user_id, user.user_role);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000,
        });

        res.json({
            message: "✅ Login successful!",
            role: user.user_role,
            redirectUrl: "/patients",
        });

    } catch (error) {
        // generate new captcha if retry is expected
        const newCaptcha = getNewCaptchaData(req);
        res.status(500).json({
            error: "❌ Server error during login",
            newCaptcha: newCaptcha,
        });
    }
};

// pet owner signup
exports.signupPetOwnerStep1 = async (req, res) => {
    const { fname, lname, email, contact, address, password, confirmPassword } = req.body;

    // validate required fields
    if (!fname || !lname || !email || !contact || !address || !password || !confirmPassword) {
        return res.status(400).json({ error: "❌ All fields are required!" });
    }

    // validate password mismatch
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "❌ Passwords do not match!" });
    }

    // validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: "❌ Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }

    try {
        // validate email uniqueness
        if (await UserModel.isEmailTaken(email)) {
            return res.status(400).json({ error: "❌ Email already in use." });
        }

        req.session.petOwnerData = {
            fname, lname, email, contact, address, password: await hashPassword(password)
        };

        req.session.step1Completed = true;

        res.json({
            message: "✅ Step 1 completed. Proceed to pet info.",
            redirectUrl: "/signup-petowner-petinfo"
        });
    } catch (error) {
        res.status(500).json({ error: "❌ Server error during signup." });
    }
};

exports.signupPetOwnerStep2 = async (req, res) => {
    const { petname, gender, speciesDescription, breed, birthdate, altPerson1, altContact1, captchaInput } = req.body;

    // validate CAPTCHA first
    if (!req.session.captcha || captchaInput !== req.session.captcha) {
        const newCaptcha = getNewCaptchaData(req);
        return res.status(400).json({
            error: "❌ Incorrect CAPTCHA!",
            newCaptcha: newCaptcha,
        });
    }

    // validate session data in step 1 (user info)
    if (!req.session.petOwnerData || !req.session.step1Completed) {
        const newCaptcha = getNewCaptchaData(req);
        return res.status(400).json({ 
            error: "❌ Personal info missing or Step 1 not completed. Restart signup process.",
            newCaptcha: newCaptcha, 
        });
    }

    // validate required fields
    if (!petname || !gender || !speciesDescription || !altPerson1 || !altContact1) {
        const newCaptcha = getNewCaptchaData(req);
        return res.status(400).json({
            error: "❌ All required fields must be filled out!",
            newCaptcha: newCaptcha,
        });
    }

    const { fname, lname, email, contact, address, password } = req.session.petOwnerData;
    let connection;

    try {
        const species = await PetModel.findSpeciesByDescription(speciesDescription);

        if (!species) {
            const newCaptcha = getNewCaptchaData(req);
            return res.status(400).json({
                error: "❌ Invalid species selected.",
                newCaptcha: newCaptcha,
            });
        }

        const speciesId = species.spec_id;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // create pet owner
            const userId = await UserModel.createPetOwner(
                { fname, lname, email, contact, address, password, altPerson1, altContact1 },
                connection
            );

            // calculate pet age in years and months
            const calculatePetAge = (birthdate) => {
                const birth = new Date(birthdate);
                const today = new Date();
               
                let years = today.getFullYear() - birth.getFullYear();
                let months = today.getMonth() - birth.getMonth();

                if (months < 0) {
                    years--;
                    months += 12;
                }

                return { years: years, months: months };
            };

            // calculate pet age
            let petAgeYear = null;
            let petAgeMonth = null;

            if (birthdate) {
                const age = calculatePetAge(birthdate);
                petAgeYear = age.years;
                petAgeMonth = age.months;
            }

            // create pet
            const petId = await PetModel.createPet(
                {
                    petname,
                    gender,
                    speciesId,
                    breed: breed || null, 
                    birthdate: birthdate || null,
                    petAgeYear,
                    petAgeMonth,
                    userId,
                },
                connection
            );

            await connection.commit();

            // signup success
            req.session.captcha = null;

            // generate token
            const token = generateToken(userId, "owner");
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "Strict",
                maxAge: 15 * 60 * 1000,
            });

            // clear session data
            req.session.petOwnerData = null;
            req.session.step1Completed = null;

            res.status(201).json({ message: "✅ Pet Owner account created successfully!", role: "owner", redirectUrl: "/patients" });
        } catch (error) {
            if (connection) await connection.rollback();

            const newCaptcha = getNewCaptchaData(req);

            res.status(500).json({
                error: "❌ Server error during signup. Please try again.",
                newCaptcha: newCaptcha,
            });
        } finally {
            if (connection) connection.release();
        }
    } catch (error) {
        const newCaptcha = getNewCaptchaData(req);

        res.status(500).json({
            error: "❌ Server error during signup.",
            newCaptcha: newCaptcha,
        });
    }
};

// employee signup
exports.signupEmployeeRequest = async (req, res) => {
    const { fname, lname, contact, email, role, password, confirmPassword, captchaInput } = req.body;
    
    // validate CAPTCHA first
     if (!req.session.captcha || captchaInput !== req.session.captcha) {
        const newCaptcha = getNewCaptchaData(req);
        return res.status(400).json({
            error: "❌ Incorrect CAPTCHA!",
            newCaptcha: newCaptcha,
        });
    }

    // validate required fields
    if (!fname || !lname || !email || !role || !password || !confirmPassword) {
        const newCaptcha = getNewCaptchaData(req);

        return res.status(400).json({ 
            error: "❌ All fields are required!",
            newCaptcha: newCaptcha,
        });
    }

    // validate password match
    if (password !== confirmPassword) {
        const newCaptcha = getNewCaptchaData(req);

        return res.status(400).json({
            error: "❌ Passwords do not match!",
            newCaptcha: newCaptcha, 
        });
    }

    // validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: "❌ Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
        });
    }

    try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            const newCaptcha = getNewCaptchaData(req);
            console.log("New CAPTCHA generated (Email Taken):", newCaptcha.captchaKey);
           return res.status(400).json({
               error: "❌ Email already in use.",
               newCaptcha: newCaptcha,
           });
        }

        req.session.captcha = null;

        const accessCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        req.session.employeeData = { fname, lname, contact, email, role, password, accessCode };

        // send email to clinic owner
        const clinicOwnerEmail = process.env.CLINIC_OWNER_EMAIL;
        const subject = "New Employee Signup Request - PAWtient Tracker";
        const body = `Hello Clinic Owner,\n\nA new employee has requested to sign up:\n\nName: ${fname} ${lname}\n Contact Number: ${contact}\nEmail: ${email}\nPosition: ${role}\n\nTo approve, provide them with the following access code:\n\nAccess Code: ${accessCode}\n\nIf this request is unauthorized, please ignore this email.`;

        await sendEmail(clinicOwnerEmail, subject, body);

        res.json({
            message: "✅ Signup request sent. Await access code from the clinic owner.",
            redirectUrl: "/signup-employee-accesscode",
        });
    } catch (err) {
        console.error("Employee Signup Request Error:", err);
        const newCaptcha = getNewCaptchaData(req);
        res.status(500).json({
            error: "❌ Server error during signup request.",
            newCaptcha: newCaptcha,
        });
    }
};

exports.signupEmployeeComplete = async (req, res) => {
    const { accessCode } = req.body;

    // validate access code is not null
    if (!accessCode) {
        return res.status(400).json({ error: "❌ Access code is required!" });
    }

    try {
        if (!req.session.employeeData) {
            return res.status(400).json({ error: "❌ No signup request found. Please start again." });
        }

        const { fname, lname, contact, role, password, accessCode: storedCode, email } = req.session.employeeData;

        // validate access code
        if (accessCode !== storedCode) {
            return res.status(400).json({ error: "❌ Invalid access code." });
        }

        const hashedPassword = await hashPassword(password);
        const userId = await UserModel.createEmployee({ fname, lname, contact, email, role, hashedPassword });

        // create token for user
        const token = generateToken(userId, role);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            path: "/",
            maxAge: 15 * 60 * 1000
        });

        req.session.employeeData = null;

        res.json({
            message: "✅ Signup successful! You can now log in.",
            role: role,
            redirectUrl: "/patients",
        });
    } catch (error) {
        res.status(500).json({ error: "❌ Server error." });
    }
};

// user logout
exports.logoutUser = (req, res) => {
    try {
        // clear cookie and token
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Logout failed" });
            }

            res.clearCookie("connect.sid", { path: "/" });
            res.clearCookie("token", { path: "/" });

            return res.json({ message: "Logout successful" });
        });
    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({ error: "❌ Server error during logout" });
    }
};


