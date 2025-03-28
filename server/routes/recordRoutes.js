const express = require("express");
const recordController = require("../controllers/recordController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const generatePdf = require('../utils/generatePDF');
const db = require("../config/db");
const path = require("path");
const fs = require("fs");

const router = express.Router();


router.get("/visit-records", authenticate, recordController.getVisitRecords);
router.post("/records/:petId", authenticate, authorize({roles: ["doctor", "clinician"]}), recordController.addRecord);
router.put("/records/:recordId", authenticate, authorize({roles: ["doctor", "clinician"]}), recordController.updateRecord);
router.get("/records/request-access-code", authenticate, authorize({roles: ["clinician"]}), recordController.requestDiagnosisAccessCode);

// GET records with sorting and filtering by date
router.get("/search-records", async (req, res) => {
    try {
        let { pet_id, sort_order, start_date, end_date } = req.query;

        console.log("Received sort_order:", sort_order); // Debugging line

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
router.get("/generate-pdf/:petId/:recordId", async (req, res) => {
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