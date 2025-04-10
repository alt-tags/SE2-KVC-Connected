const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const { authenticateToken } = require("../utils/authUtility");
const db = require("../config/db");
const mysql = require("mysql2");

router.post("/:pet_id/vaccines", authenticateToken, authenticate, authorize({ roles: ["clinician", "doctor"] }), async (req, res) => {
  const { pet_id } = req.params
  const { vax_type, imm_rec_quantity, imm_rec_date } = req.body

  try {
    const [vaxResult] = await db.query("SELECT vax_id FROM vax_info WHERE vax_type = ?", [vax_type])

    if (vaxResult.length === 0) {
      return res.status(404).json({ error: "Vaccine type not found" })
    }

    const vax_id = vaxResult[0].vax_id

    const [result] = await db.query(
      "INSERT INTO immunization_record (vax_id, pet_id, imm_rec_quantity, imm_rec_date) VALUES (?, ?, ?, ?)",
      [vax_id, pet_id, imm_rec_quantity, imm_rec_date],
    )

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: "Failed to add vaccination record" })
    }
    res.status(201).json({
      id: result.insertId,
      vax_id,
      pet_id,
      vax_type,
      imm_rec_quantity,
      imm_rec_date,
    })
  } catch (error) {
    console.error("Error adding vaccination record:", error)
    res.status(500).json({ error: "Failed to add vaccination record" })
  }
})

// route to get all vaccination records for a pet
router.get("/:pet_id/vaccines", authenticateToken, authenticate, async (req, res) => {
  const { pet_id } = req.params

  try {
    const [records] = await db.query(
      `SELECT ir.*, vi.vax_type
        FROM immunization_record ir
        JOIN vax_info vi ON ir.vax_id = vi.vax_id
        WHERE ir.pet_id = ?
        ORDER BY ir.imm_rec_date DESC`,
      [pet_id],
    )

    res.json(records)
  } catch (error) {
    console.error("Error fetching vaccination records:", error)
    res.status(500).json({ error: "Failed to fetch vaccination records" })
  }
})

// route to update a vaccination record (for the + button)
router.put(
  "/:pet_id/vaccines/:record_id", authenticateToken,
  authenticate,
  authorize({ roles: ["clinician", "doctor"] }),
  async (req, res) => {
    const { pet_id, record_id } = req.params
    const { imm_rec_quantity, imm_rec_date } = req.body

    try {
      const [result] = await db.query(
        "UPDATE immunization_record SET imm_rec_quantity = ?, imm_rec_date = ? WHERE vax_id = ? AND pet_id = ?",
        [imm_rec_quantity, imm_rec_date, record_id, pet_id],
      )

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Vaccination record not found" })
      }

      res.json({ message: "Vaccination record updated successfully" })
    } catch (error) {
      console.error("Error updating vaccination record:", error)
      res.status(500).json({ error: "Failed to update vaccination record" })
    }
  },
)

router.put("/edit/:pet_id", authenticateToken, authenticate, authorize({ roles: ["clinician", "doctor"] }), async (req, res) => {
  const { pet_id } = req.params;
  const updatedData = req.body;

  try {
    const {
        pet_name = "",
        pet_breed = "",
        pet_gender = "Unknown",
        pet_birthday = null,
        pet_age_month = "",
        pet_age_year = "",
        pet_color = "",
        pet_status = "1",
        spec_id
    } = updatedData;

    const result = await db.query(
        `UPDATE pet_info
          SET pet_name = ?, pet_breed = ?, pet_gender = ?, pet_birthday = ?, pet_age_month = ?, pet_age_year = ?, pet_color = ?, pet_status = ?
          WHERE pet_id = ?`,
        [pet_name, pet_breed, pet_gender, pet_birthday, pet_age_month, pet_age_year, pet_color, pet_status, pet_id]
    );


    let speciesUpdateResult = null;
      
    if (spec_id) {
      try {
        speciesUpdateResult = await db.query(
          "UPDATE match_pet_species SET spec_id = ? WHERE pet_id = ?",
          [spec_id, pet_id]
        );
        
        if (speciesUpdateResult[0].affectedRows === 0) {
          speciesUpdateResult = await db.query(
            "INSERT INTO match_pet_species (pet_id, spec_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE spec_id = VALUES(spec_id)",
            [pet_id, spec_id]
          );
        }
      } catch (speciesError) {
        console.error("Error updating species:", speciesError);
      }
    }

    const success = (result[0].affectedRows > 0) ||
      (speciesUpdateResult && (speciesUpdateResult[0].affectedRows > 0 || speciesUpdateResult[0].insertId > 0));
    
    if (!success) {
      return res.status(404).json({ error: "Pet not found or no changes made" });
    }


    res.status(200).json({ message: "Pet profile updated successfully", speciesUpdated: speciesUpdateResult ? true : false });
  } catch (error) {
    console.error("Error updating pet profile:", error);
    res.status(500).json({ error: "Failed to update pet profile" });
  }
});

//IAHS-ques: delete ba tong route na to? since same sa nasa taas?
// router.put("/edit/:pet_id", authenticateToken, authenticate, authorize({ roles: ["clinician", "doctor"] }), petController.updatePetProfile);

router.put("/archive/:pet_id", authenticateToken, authenticate, authorize({ roles: ["clinician", "doctor"] }), petController.archivePet);
router.put("/restore/:pet_id", authenticateToken, authenticate, authorize({ roles: ["clinician", "doctor"] }), petController.restorePet);

// route for logged-in owners to add a pet
router.post("/add", authenticateToken, authenticate, authorize({ roles: ["owner"] }), petController.addPetForOwner);
router.get("/mypets", authenticateToken, authenticate, authorize({ roles: ["owner"] }), petController.getPetsByOwner);

// routes accessible to all authenticated users
router.get("/active", authenticateToken, authenticate, petController.getAllActivePets);
router.get("/archived", authenticateToken, authenticate, petController.getAllArchivedPets);

// search pets with filtering and sorting
router.get("/search-pets", authenticateToken, async (req, res) => {
  try {
    const { pet_id, pet_name, owner_name, species, sort_by, sort_order, min_id, max_id, search } = req.query;

    let query = `
      SELECT pet_info.pet_id, pet_info.pet_name, pet_info.pet_breed, pet_info.pet_gender, 
              CONCAT(users.user_firstname, ' ', users.user_lastname) AS owner_name,
              pet_species.spec_description AS species
      FROM pet_info
      JOIN users ON pet_info.user_id = users.user_id
      JOIN match_pet_species ON pet_info.pet_id = match_pet_species.pet_id
      JOIN pet_species ON match_pet_species.spec_id = pet_species.spec_id
      WHERE 1
    `;

    let queryParams = [];

    // add filters
    if (pet_id && !min_id && !max_id) {
        query += " AND pet_info.pet_id = ?";
        queryParams.push(pet_id);
    } else if (min_id && max_id) {
        query += " AND pet_info.pet_id BETWEEN ? AND ?";
        queryParams.push(min_id, max_id);
    } else if (min_id) {
        query += " AND pet_info.pet_id >= ?";
        queryParams.push(min_id);
    } else if (max_id) {
        query += " AND pet_info.pet_id <= ?";
        queryParams.push(max_id);
    }
    if (pet_name) {
        query += " AND pet_info.pet_name LIKE ?";
        queryParams.push(`%${pet_name}%`);
    }
    if (owner_name) {
        query += " AND (users.user_firstname LIKE ? OR users.user_lastname LIKE ?)";
        queryParams.push(`%${owner_name}%`, `%${owner_name}%`);
    }
    if (species) {
        query += " AND pet_species.spec_description LIKE ?";
        queryParams.push(`%${species}%`);
    }

    // add general search
    if (search) {
        const searchTerm = `%${search}%`;
        query += `
            AND (
                pet_info.pet_name LIKE ?
                OR CONCAT(users.user_firstname, ' ', users.user_lastname) LIKE ?
                OR pet_species.spec_description LIKE ?
                OR pet_info.pet_id LIKE ?
            )
        `;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // sorting logic
    const allowedSorts = {
        pet_id: "pet_info.pet_id",
        pet_name: "pet_info.pet_name",
        owner_name: "users.user_lastname",
        species: "pet_species.spec_description"
    };

    let orderClause = "";

    // sorting priority
    if (sort_by && sort_by in allowedSorts) {
        // use selected sort_by as the primary sorting field
        let order = sort_order === "desc" ? "DESC" : "ASC";
        orderClause = ` ORDER BY ${allowedSorts[sort_by]} ${order}`;
    } else if (species && !sort_by) {
        // if only species is selected, sort by pet_id in ascending order
        orderClause = ` ORDER BY pet_info.pet_id ASC`;
    } else if (min_id || max_id) {
        // if range of id is selected, default to sorting by pet_id
        orderClause = ` ORDER BY pet_info.pet_id ASC`;
    }

    // handle combinations of filters
    if (sort_by === "pet_name" && species) {
        orderClause = ` ORDER BY pet_info.pet_name ${sort_order === "desc" ? "DESC" : "ASC"}`;
    } else if (sort_by === "owner_name" && species) {
        orderClause = ` ORDER BY users.user_lastname ${sort_order === "desc" ? "DESC" : "ASC"}`;
    } else if (sort_by === "pet_name" && sort_by === "owner_name") {
        // default to pet_name if both pet_name and owner_name are selected
        orderClause = ` ORDER BY pet_info.pet_name ${sort_order === "desc" ? "DESC" : "ASC"}`;
    }

    // default sorting if no specific sort_by is provided
    if (!orderClause) {
        orderClause = ` ORDER BY pet_info.pet_id ASC`;
    }

    query += orderClause;

    const [results] = await db.query(query, queryParams);
    res.json(results);
  } catch (error) {
      console.error("Error searching pets:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// route to fetch pet details by pet_id
router.get("/:pet_id", authenticateToken, authenticate, petController.getPetById);
module.exports = router;
