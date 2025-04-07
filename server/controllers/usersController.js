const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const { authenticate } = require("../middleware/authMiddleware");
const { hashPassword, comparePassword } = require("../utils/passwordUtility");
const db = require("../config/db");

exports.getEmployeeProfile = [
    authenticate,
    async (req, res) => {
        const userId = req.user.userId;

        console.log("Fetching profile for User ID:", userId);

        try {
            const employeeProfile = await UserModel.getUserById(userId);

            if (!employeeProfile) {
                return res.status(404).json({ error: "❌ Employee profile not found." });
            }

            res.json({
                firstname: employeeProfile.user_firstname,
                lastname: employeeProfile.user_lastname,
                email: employeeProfile.user_email,
                contact: employeeProfile.user_contact,
                role: employeeProfile.user_role,
            });
        } catch (error) {
            console.error("Error fetching employee profile:", error);
            res.status(500).json({ error: "❌ Server error while fetching employee profile." });
        }
    }
];

// Update employee profile
exports.updateEmployeeProfile = [
    authenticate,
    async (req, res) => {
        const { firstname, lastname, email, contact } = req.body;
        const userId = req.user.userId;

        console.log("Request Body:", req.body);
        console.log("User ID from JWT:", userId);

        try {
            const currentProfile = await UserModel.getUserById(userId);

            const updatedProfile = {
                firstname: firstname || currentProfile.user_firstname,
                lastname: lastname || currentProfile.user_lastname,
                email: email || currentProfile.user_email,
                contact: (contact !== undefined) ? contact : currentProfile.user_contact
            };

            const updatedUser = await UserModel.updateEmployeeProfile(userId, updatedProfile.firstname, updatedProfile.lastname, updatedProfile.email, updatedProfile.contact);

            res.json({
                firstname: updatedUser.user_firstname,
                lastname: updatedUser.user_lastname,
                email: updatedUser.user_email,
                contact: updatedUser.user_contact,
                role: updatedUser.user_role,
            });
        } catch (error) {
            console.error("Profile Update Error:", error);
            res.status(500).json({ error: "❌ Server error while updating profile." });
        }
    }
];

// Update pet owner profile
exports.updateOwnerProfile = [
    authenticate,
    async (req, res) => {
        const { firstname, lastname, email, contact, address, altperson, altcontact, altperson2, altcontact2 } = req.body;
        const userId = req.user.userId;

        console.log("Request Body:", req.body);
        console.log("User ID from JWT:", userId);

        // Validate required fields
        const requiredFields = [firstname, lastname, email, contact, address, altperson, altcontact];
        if (requiredFields.some((field) => !field || field.trim() === "")) {
            return res.status(400).json({ error: "All fields except Emergency Contact 2 and Person 2 are required and cannot be empty." });
        }

        // Validate Emergency Contact 2 and Person 2
        if ((altperson2 && !altcontact2) || (!altperson2 && altcontact2)) {
            return res.status(400).json({ error: "If Emergency Contact Person 2 is provided, Emergency Contact Number 2 must also be provided, and vice versa." });
        }

        try {
            const currentProfile = await UserModel.getUserById(userId);
            const currentOwnerProfile = await UserModel.getOwnerByUserId(userId);

            const updatedProfile = {
                firstname: firstname || currentProfile.user_firstname,
                lastname: lastname || currentProfile.user_lastname,
                email: email || currentProfile.user_email,
                contact: contact || currentProfile.user_contact,
                address: address || currentOwnerProfile.owner_address,
                altperson: altperson || currentOwnerProfile.owner_alt_person1,
                altcontact: altcontact || currentOwnerProfile.owner_alt_contact1,
                altperson2: altperson2 || null, // Set to null if not provided
                altcontact2: altcontact2 || null, // Set to null if not provided
            };

            await UserModel.updateOwnerProfile(
                userId,
                updatedProfile.firstname,
                updatedProfile.lastname,
                updatedProfile.email,
                updatedProfile.contact,
                updatedProfile.address,
                updatedProfile.altperson,
                updatedProfile.altcontact,
                updatedProfile.altperson2,
                updatedProfile.altcontact2
            );

            res.json({ message: "✅ Pet owner profile updated successfully!" });
        } catch (error) {
            console.error("Profile Update Error:", error);
            res.status(500).json({ error: "❌ Server error while updating profile." });
        }
    },
];

exports.changePassword = [
    authenticate,
    async (req, res) => {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({ error: "❌ Unauthorized. Please log in." });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ error: "❌ All fields are required!" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: "❌ New passwords do not match!" });
        }

            // Password validation regex
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;


        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: "❌ Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character."
            });
        }


        try {
            const storedPassword = await UserModel.getPasswordById(userId);

            if (!storedPassword) {
                return res.status(404).json({ error: "❌ User not found." });
            }

            const isMatch = await comparePassword(currentPassword, storedPassword);

            if (!isMatch) {
                // Changed from 400 to 401 for incorrect password
                return res.status(401).json({ error: "❌ Incorrect current password." });
            }

            const hashedPassword = await hashPassword(newPassword);

            await UserModel.updatePassword(userId, hashedPassword);

            res.json({ message: "✅ Password changed successfully!" });
        } catch (error) {
            console.error("Password Change Error:", error);
            res.status(500).json({ error: "❌ Server error while changing password." });
        }
    }
];

exports.getOwnerProfile = async (req, res) => {
    const userId = req.user.userId; // Extract user ID from the authenticated token

    try {
        const [userResult] = await db.query(
            `
            SELECT 
                u.user_firstname AS firstname,
                u.user_lastname AS lastname,
                u.user_email AS email,
                u.user_contact AS contact,
                o.owner_address AS address,
                o.owner_alt_person1 AS altperson,
                o.owner_alt_contact1 AS altcontact,
                o.owner_alt_person2 AS altperson2,
                o.owner_alt_contact2 AS altcontact2
            FROM users u
            JOIN owner o ON u.user_id = o.user_id
            WHERE u.user_id = ?
            `,
            [userId]
        );

        if (userResult.length === 0) {
            return res.status(404).json({ error: "Owner profile not found" });
        }

        res.json(userResult[0]); // Return the owner's profile
    } catch (error) {
        console.error("Error fetching owner profile:", error);
        res.status(500).json({ error: "Failed to fetch owner profile" });
    }
};