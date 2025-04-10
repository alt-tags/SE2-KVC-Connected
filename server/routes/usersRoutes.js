const express = require("express");
const usersController = require("../controllers/usersController");
const { authenticate } = require("../middleware/authMiddleware");
const { authenticateToken } = require("../utils/authUtility");
const router = express.Router();

router.get("/myAccount", authenticateToken, authenticate, usersController.getEmployeeProfile);
router.get("/owner/myAccount", authenticateToken, authenticate, usersController.getOwnerProfile);

// update profile
router.put("/update-employee-profile", authenticateToken, authenticate, usersController.updateEmployeeProfile);
router.put("/update-petowner-profile", authenticateToken, authenticate, usersController.updateOwnerProfile);

// change password
router.post("/change-password", authenticateToken, authenticate, usersController.changePassword);

module.exports = router;
