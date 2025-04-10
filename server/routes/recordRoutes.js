const express = require("express");
const multer = require("multer");
const recordController = require("../controllers/recordController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { authenticateToken } = require("../utils/authUtility");
const generatePdf = require('../utils/generatePDF');
const db = require("../config/db");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


// multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});


const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ["image/jpeg", "image/png"];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPG, PNG, and PDF files are allowed."));
        }
    },
});

router.get("/visit-records", authenticateToken, authenticate, recordController.getVisitRecords);

router.post(
    "/records/:petId", authenticateToken,
    authenticate,
    authorize({ roles: ["doctor", "clinician"] }),
    upload.single("record_lab_file"),
    recordController.addRecord
);

router.put(
    "/records/:recordId", authenticateToken,
    authenticate,
    authorize({ roles: ["doctor", "clinician"] }),
    upload.single("record_lab_file"),
    recordController.updateRecord
);
 
router.get("/records/request-access-code", authenticateToken, authenticate, authorize({roles: ["clinician"]}), recordController.requestDiagnosisAccessCode);

// GET records with sorting and filtering by date
router.get("/search-records", authenticateToken, async (req, res) => {
    try {
        let { pet_id, sort_order, start_date, end_date } = req.query;

        if (!pet_id) {
            return res.status(400).json({ error: "pet_id is required" });
        }

        let query = `
            SELECT record_info.record_date AS date, 
                   record_info.record_purpose AS purposeOfVisit, 
                   pet_info.pet_name, 
                   users.user_firstname AS owner_firstname, 
                   users.user_lastname AS owner_lastname
            FROM record_info
            JOIN pet_info ON record_info.pet_id = pet_info.pet_id
            JOIN users ON pet_info.user_id = users.user_id
            WHERE record_info.pet_id = ?
        `;
        let queryParams = [pet_id];

        // filtering by Date Range
        if (start_date) {
            query += " AND record_info.record_date >= ?";
            queryParams.push(start_date);
        }
        if (end_date) {
            query += " AND record_info.record_date <= ?";
            queryParams.push(end_date);
        }

        // sorting by Date (oldest → newest, newest → oldest)
        if (sort_order === "ASC" || sort_order === "DESC") {
            query += ` ORDER BY record_info.record_date ${sort_order}`;
        } else {
            query += " ORDER BY record_info.record_date DESC"; // Default: Newest to Oldest
        }

        const [results] = await db.query(query, queryParams);
        res.json(results);
    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// route to download a specific record for a pet
router.get("/generate-pdf/:petId/:recordId", authenticateToken, async (req, res) => {
    const { petId, recordId } = req.params;

    try {
        // generate the PDF file for the specific record
        const pdfPath = await generatePdf(petId, recordId);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${path.basename(pdfPath)}`);

        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);

        console.log(`PDF generated and sent for petId: ${petId}, recordId: ${recordId}`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

module.exports = router;