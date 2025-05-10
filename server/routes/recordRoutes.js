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

// ✅ Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
   fs.mkdirSync(uploadDir, { recursive: true });
}


// ✅ Multer configuration
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

        console.log("Received sort_order:", sort_order); // Debugging line

        if (!pet_id) {
            return res.status(400).json({ error: "pet_id is required" });
        }

        let query = `
            SELECT
              record_info.record_id AS id,
              record_info.record_date AS date,
              record_info.record_purpose AS purposeOfVisit,
              record_info.record_weight AS weight,          -- Added
              record_info.record_temp AS temperature,      -- Added
              record_info.record_condition AS conditions,  -- Added
              record_info.record_symptom AS symptoms,      -- Added
              record_info.record_recent_visit AS recentVisit, -- Added
              record_info.record_purchase AS recentPurchase, -- Added
              record_info.record_lab_file AS file,         -- Added
              p.pet_name,                      -- Already present
              l.lab_description AS laboratories,   -- Added
              s.surgery_type AS surgeryType,       -- Added
              s.surgery_date AS surgeryDate,       -- Added
              d.diagnosis_text AS latestDiagnosis, -- Added
              record_info.pet_id AS petId,                 -- Added (or ensure if needed)
              CASE WHEN s.surgery_id IS NOT NULL THEN TRUE ELSE FALSE END AS hadSurgery -- Added
            FROM record_info
            LEFT JOIN pet_info p ON record_info.pet_id = p.pet_id           -- Keep JOIN
            LEFT JOIN users u ON p.user_id = u.user_id             -- Changed alias from users to u
            LEFT JOIN lab_info l ON record_info.lab_id = l.lab_id           -- Added JOIN
            LEFT JOIN surgery_info s ON record_info.surgery_id = s.surgery_id -- Added JOIN
            LEFT JOIN diagnosis d ON record_info.diagnosis_id = d.diagnosis_id -- Added JOIN
            WHERE record_info.pet_id = ?
        `;
        let queryParams = [pet_id];

        // ✅ Filtering by Date Range
        if (start_date) {
            query += " AND record_info.record_date >= ?";
            queryParams.push(start_date);
        }
        if (end_date) {
            query += " AND record_info.record_date <= ?";
            queryParams.push(end_date);
        }

        // ✅ Sorting by Date (oldest → newest, newest → oldest)
        if (sort_order === "ASC" || sort_order === "DESC") {
            query += ` ORDER BY record_info.record_date ${sort_order}`;
        } else {
            query += " ORDER BY record_info.record_date DESC"; // Default: Newest to Oldest
        }

        console.log("Final Query:", query); // Debugging line
        console.log("Query Parameters:", queryParams); // Debugging line

        const [results] = await db.query(query, queryParams);
        res.json(results);
    } catch (error) {
        console.error("Error fetching records:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// Route to download a specific record for a pet
router.get("/generate-pdf/:petId/:recordId", authenticateToken, async (req, res) => {
    const { petId, recordId } = req.params;

    try {
        // Generate the PDF file for the specific record
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