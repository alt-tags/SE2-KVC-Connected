const db = require("../config/db");
const dayjs = require("dayjs");

class PetModel {
    static async findByOwnerId(ownerId) {
        const [result] = await db.query(
            "SELECT * FROM pet_info WHERE user_id = ?",
            [ownerId]
        );
        return result;
    }
    static async findById(pet_id) {
        const [result] = await db.execute(
            `
            SELECT
                pet_info.pet_id,
                pet_info.pet_name AS name,
                pet_info.pet_breed AS breed,
                pet_info.pet_birthday AS birthday,
                pet_info.pet_gender AS gender,
                pet_info.pet_color AS color,
                pet_info.pet_status AS status,
                CONCAT(users.user_firstname, ' ', users.user_lastname) AS owner_name,
                users.user_email AS email,
                users.user_contact AS contact,
                owner.owner_address AS address,
                pet_species.spec_description AS species
            FROM
                pet_info
            JOIN
                users ON pet_info.user_id = users.user_id
            JOIN
                owner ON users.user_id = owner.user_id
            JOIN
                match_pet_species ON pet_info.pet_id = match_pet_species.pet_id
            JOIN
                pet_species ON match_pet_species.spec_id = pet_species.spec_id
            WHERE
                pet_info.pet_id = ?
            `,
            [pet_id]
        );

        return result.length ? result[0] : null;
    }

    static async findSpeciesByDescription(description) {
        const [result] = await db.execute("SELECT * FROM pet_species WHERE spec_description = ?", [description]);
        return result.length ? result[0] : null;
    }

    static async createPet({ petname, gender, speciesId, breed, birthdate, petAgeYear, petAgeMonth, userId }, connection) {
        try {
            const finalBirthdate = birthdate ? birthdate : dayjs().format('YYYY-MM-DD');
            const [result] = await connection.query(
                "INSERT INTO pet_info (pet_name, pet_gender, pet_breed, pet_birthday, pet_age_year, pet_age_month, pet_vitality, pet_status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [petname, gender, breed, finalBirthdate, petAgeYear, petAgeMonth, true, true, userId] // pet_status = 1 (active)
            );
            const petId = result.insertId;

            await connection.query("INSERT INTO match_pet_species (spec_id, pet_id) VALUES (?, ?)", [speciesId, petId]);

            return petId;
        } catch (error) {
            console.error("Error in createPet:", error);
            throw error; // Rethrow the error to handle it in the calling function
        }
    }

    static async updatePet(pet_id, updatedData) {
        const updateFields = Object.keys(updatedData);
        if (updateFields.length === 0) return { affectedRows: 0 };
   
        const setClause = updateFields.map(field => `${field} = ?`).join(", ");
        const values = updateFields.map(field => updatedData[field]);
   
        const sql = `UPDATE pet_info SET ${setClause} WHERE pet_id = ?`;
        values.push(pet_id);
   
        const [result] = await db.execute(sql, values);
        return result;
    }

    static async updatePetSpecies(pet_id, speciesId) {
        return db.execute("UPDATE match_pet_species SET spec_id = ? WHERE pet_id = ?", [speciesId, pet_id]);
    }

    static async archivePet(pet_id) {
        return db.execute("UPDATE pet_info SET pet_status = 0 WHERE pet_id = ?", [pet_id]);
    }

    static async restorePet(pet_id) {
        return db.execute("UPDATE pet_info SET pet_status = 1 WHERE pet_id = ?", [pet_id]);
    }

    static async getAllActivePets() {
        const [result] = await db.execute(`
            SELECT
                pet_info.pet_id,
                pet_info.pet_name,
                CONCAT(users.user_firstname, ' ', users.user_lastname) AS owner_name,
                pet_species.spec_description AS species
            FROM
                pet_info
            JOIN
                users ON pet_info.user_id = users.user_id
            JOIN
                match_pet_species ON pet_info.pet_id = match_pet_species.pet_id
            JOIN
                pet_species ON match_pet_species.spec_id = pet_species.spec_id
            WHERE
                pet_info.pet_status = 1
        `);
        return result;
    }

    static async getAllArchivedPets() {
        const [result] = await db.execute("SELECT * FROM pet_info WHERE pet_status = 0");
        return result;
    }
}

module.exports = PetModel;



