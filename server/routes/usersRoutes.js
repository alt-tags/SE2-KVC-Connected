const express = require("express");
const usersController = require("../controllers/usersController");
const { authenticate } = require("../middleware/authMiddleware");
const { authenticateToken } = require("../utils/authUtility");
const router = express.Router();

router.get("/myAccount", authenticateToken, authenticate, usersController.getEmployeeProfile);

// update profile (Protected route)
router.put("/update-employee-profile", authenticateToken, authenticate, usersController.updateEmployeeProfile);
router.put("/update-petowner-profile", authenticateToken, authenticate, usersController.updateOwnerProfile);

// change password (Protected route)
router.post("/change-password", authenticateToken, authenticate, usersController.changePassword);

module.exports = router;
