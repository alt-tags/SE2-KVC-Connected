const dayjs = require("dayjs");
const PetModel = require("../models/petModel");
const db = require("../config/db");

// update pet profile (only for clinicians and doctors)
exports.updatePetProfile = async (req, res) => {
    const { pet_id } = req.params;
    const updateFields = req.body;

    try {
        const existingPet = await PetModel.findById(pet_id);
        if (!existingPet) {
            return res.status(404).json({ error: "❌ Pet not found." });
        }

        let updatedData = {};
        Object.keys(updateFields).forEach((key) => {
            if (updateFields[key] !== undefined && updateFields[key] !== "" && key !== "speciesDescription") {
                updatedData[key] = updateFields[key];
            }
        });

        const isBirthdayUpdated = updatedData.pet_birthday !== undefined;
        const isAgeUpdated = updatedData.pet_age_year !== undefined || updatedData.pet_age_month !== undefined;

        if (isBirthdayUpdated) {
            const birthDate = dayjs(updatedData.pet_birthday);
            if (!birthDate.isValid()) {
                return res.status(400).json({ error: "❌ Invalid pet_birthday format. Use YYYY-MM-DD." });
            }

            const now = dayjs();
            const computedYears = now.diff(birthDate, "year");
            const computedMonths = now.diff(birthDate, "month") % 12;

            if (!isAgeUpdated) {
                // if only the birthday is updated, auto-update the ages
                updatedData.pet_age_year = computedYears;
                updatedData.pet_age_month = computedMonths;
            } else {
                // if both birthday and ages are updated, ensure they match
                if (
                    updatedData.pet_age_year !== computedYears ||
                    updatedData.pet_age_month !== computedMonths
                ) {
                    return res.status(400).json({
                        error: `❌ Age mismatch! The computed age based on birthday is ${computedYears} years and ${computedMonths} months.`,
                    });
                }
            }
        } else if (isAgeUpdated) {
            // if only age is updated, check if it matches the existing birthday
            const birthDate = dayjs(existingPet.pet_birthday);
            if (birthDate.isValid()) {
                const computedYears = dayjs().diff(birthDate, "year");
                const computedMonths = dayjs().diff(birthDate, "month") % 12;

                if (
                    updatedData.pet_age_year !== computedYears ||
                    updatedData.pet_age_month !== computedMonths
                ) {
                    return res.status(400).json({
                        error: `❌ Age mismatch! The computed age based on birthday is ${computedYears} years and ${computedMonths} months.`,
                    });
                }
            }
        }

        // if no valid fields are provided, return an error
        if (Object.keys(updatedData).length === 0 && !updateFields.speciesDescription) {
            return res.status(400).json({ error: "❌ No valid fields to update." });
        }

        // update (pet_info table)
        if (Object.keys(updatedData).length > 0) {
            const result = await PetModel.updatePet(pet_id, updatedData);

            if (result.affectedRows === 0) {
                return res.status(400).json({ error: "❌ No changes made (pet ID may not exist or data is the same)." });
            }
        }

        // pf species is being updated, update match_pet_species table
        if (updateFields.speciesDescription) {
            const species = await PetModel.findSpeciesByDescription(updateFields.speciesDescription);
            if (!species) {
                return res.status(400).json({ error: "❌ Invalid species selected." });
            }
            const speciesId = species.spec_id;
            await PetModel.updatePetSpecies(pet_id, speciesId);
        }

        res.json({ message: "✅ Pet profile updated successfully!" });

    } catch (error) {
        console.error("Pet Profile Update Error:", error);
        res.status(500).json({ error: "❌ Server error: " + error.message });
    }
};

exports.archivePet = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        await PetModel.archivePet(pet_id);
        res.json({ message: `✅ Pet ${pet.pet_name} archived successfully!` });
    } catch (error) {
        console.error("Archive Pet Error:", error);
        res.status(500).json({ error: "❌ Server error during archiving pet." });
    }
};

exports.restorePet = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        await PetModel.restorePet(pet_id);
        res.json({ message: `✅ Pet ${pet.pet_name} restored successfully!` });
    } catch (error) {
        console.error("Restore Pet Error:", error);
        res.status(500).json({ error: "❌ Server error during restoring pet." });
    }
};

exports.getAllActivePets = async (req, res) => {
    try {
        const activePets = await PetModel.getAllActivePets();
        res.status(200).json(activePets);
    } catch (error) {
        res.status(500).json({ error: "❌ Error fetching active pets." });
    }
};

exports.getAllArchivedPets = async (req, res) => {
    try {
        const archivedPets = await PetModel.getAllArchivedPets();
        res.status(200).json(archivedPets);
    } catch (error) {
        res.status(500).json({ error: "❌ Error fetching archived pets." });
    }
};

exports.getPetById = async (req, res) => {
    const { pet_id } = req.params;

    try {
        const pet = await PetModel.findById(pet_id);
        if (!pet) {
            return res.status(404).json({ error: "❌ Pet not found!" });
        }

        res.status(200).json(pet);
    } catch (error) {
        console.error("Error fetching pet details:", error);
        res.status(500).json({ error: "❌ Server error while fetching pet details." });
    }
};

exports.addPetForOwner = async (req, res) => {
    const { name, speciesDescription, gender, breed } = req.body;
    let birthday = req.body.birthday;
    // check if req.user and req.user.userId exist
    if (!req.user || typeof req.user.userId === 'undefined') {
        console.error("Error adding pet: User ID not found in request. req.user:", req.user);
        return res.status(401).json({ error: "❌ Unauthorized or User ID missing." });
    }
    const userId = req.user.userId;

    let connection; 

    try {
        if (!name || !speciesDescription || !gender) {
            return res.status(400).json({ error: "❌ Name, species, and gender are required." });
        }

        if (!birthday) {
            birthday = dayjs().format('YYYY-MM-DD');
            console.log(`[addPetForOwner] Birthday was empty, defaulting to today: ${birthday}`);
        } else {
            if (!dayjs(birthday, 'YYYY-MM-DD', true).isValid()) {
                 return res.status(400).json({ error: "❌ Invalid birthday format. Please use YYYY-MM-DD." });
            }
        }

        connection = await db.getConnection();
        console.log(`[addPetForOwner] DB Connection obtained for user ${userId}`);

        await connection.beginTransaction();
        console.log(`[addPetForOwner] Transaction started for user ${userId}`);

        const species = await PetModel.findSpeciesByDescription(speciesDescription);
        if (!species) {
            await connection.rollback();
            connection.release(); 
            return res.status(400).json({ error: `❌ Species '${speciesDescription}' not found.` });
        }
        const speciesId = species.spec_id;
        console.log(`[addPetForOwner] Found speciesId ${speciesId} for description ${speciesDescription}`);

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


            return { years, months };
        };

        let petAgeYear = null;
        let petAgeMonth = null;

        if (birthday) {
            const age = calculatePetAge(birthday);
            petAgeYear = age.years;
            petAgeMonth = age.months;
        }


        // pet object data
        const petData = {
            petname: name,
            gender,
            speciesId,
            breed: breed || null,
            birthdate: birthday || null, 
            petAgeYear,
            petAgeMonth,
            userId,
        };
        const newPetId = await PetModel.createPet(petData, connection); 
        await connection.commit();
        res.status(201).json({ message: "✅ Pet added successfully!", petId: newPetId });
    } catch (error) {
        console.error(`[addPetForOwner] Error adding pet for user ${userId}:`, error);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(`[addPetForOwner] Error rolling back transaction for user ${userId}:`, rollbackError);
            }
        }
        res.status(500).json({ error: "❌ Server error while adding pet." });

    } finally {
        if (connection) {
            try {
                connection.release();
                console.log(`[addPetForOwner] DB Connection released for user ${userId}`);
            } catch (releaseError) {
                console.error(`[addPetForOwner] Error releasing connection for user ${userId}:`, releaseError);
            }
        }
    }
};

exports.getPetsByOwner = async (req, res) => {
    const userId = req.user.userId;

    try {
        const [pets] = await db.query(
            `
            SELECT 
                pet_info.pet_id,
                pet_info.pet_name,
                pet_info.pet_breed,
                pet_info.pet_gender,
                pet_info.pet_birthday,
                pet_species.spec_description AS species
            FROM pet_info
            JOIN match_pet_species ON pet_info.pet_id = match_pet_species.pet_id
            JOIN pet_species ON match_pet_species.spec_id = pet_species.spec_id
            WHERE pet_info.user_id = ?
            `,
            [userId]
        );

        res.json(pets);
    } catch (error) {
        console.error("Error fetching pets for owner:", error);
        res.status(500).json({ error: "Failed to fetch pets for owner" });
    }
};

