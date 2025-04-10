const express = require("express");
const router = express.Router();
const vaccineController = require("../controllers/vaccineController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { authenticateToken } = require("../utils/authUtility");

router.post(
    "/pets/:pet_id/vaccines", authenticateToken,
    authenticate,
    authorize({ roles: ["doctor", "clinician"] }),
    vaccineController.addPetVaccinationRecord
);
router.get(
    "/pets/:pet_id/viewVaccines", authenticateToken,
    authenticate,
    vaccineController.getPetVaccinationRecords
);

module.exports = router;
