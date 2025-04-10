const db = require("../config/db");

const getAllVisitRecords = async (pet_id) => {
try {
const query = `
  SELECT
    r.record_id AS id,
    r.record_date AS date,
    r.record_purpose AS purposeOfVisit,
    r.record_weight AS weight,
    r.record_temp AS temperature,
    r.record_condition AS conditions,
    r.record_symptom AS symptoms,
    r.record_recent_visit AS recentVisit,
    r.record_purchase AS recentPurchase,
    r.record_lab_file AS file,
    p.pet_name,
    l.lab_description AS laboratories,
    s.surgery_type AS surgeryType,
    s.surgery_date AS surgeryDate,
    d.diagnosis_text AS latestDiagnosis,
    r.pet_id AS petId,
    CASE WHEN s.surgery_id IS NOT NULL THEN TRUE ELSE FALSE END AS hadSurgery
  FROM record_info r
  LEFT JOIN pet_info p ON r.pet_id = p.pet_id
  LEFT JOIN lab_info l ON r.lab_id = l.lab_id
  LEFT JOIN surgery_info s ON r.surgery_id = s.surgery_id
  LEFT JOIN diagnosis d ON r.diagnosis_id = d.diagnosis_id
  WHERE r.pet_id = ?
  ORDER BY r.record_date DESC
`;

const [rows] = await db.query(query, [pet_id]);
rows.forEach(record => {
  if (record.file) {
    record.file = `http://localhost:5000/uploads/${record.file}`;
  } else {
    record.file = null;
  }
});

const formattedRows = rows.map((row) => ({
    ...row,
    hadSurgery: row.hadSurgery === 1, 
    surgeryDate: row.surgeryDate, 
  }));
    return formattedRows
  } catch (error) {
    console.error("Error fetching visit records:", error);
    throw error;
  }
};

const updateSurgeryInfo = async (surgeryId, surgeryType, surgeryDate) => {
  try {
    if (!surgeryId) return null
    const [result] = await db.query("UPDATE surgery_info SET surgery_type = ?, surgery_date = ? WHERE surgery_id = ?", [
      surgeryType,
      surgeryDate,
      surgeryId,
    ])
    return result.affectedRows > 0
  } catch (error) {
    console.error("Error updating surgery info:", error)
    throw error
  }
}

const removeSurgeryFromRecord = async (recordId) => {
  try {
    const [result] = await db.query("UPDATE record_info SET surgery_id = NULL WHERE record_id = ?", [recordId])
    return result.affectedRows > 0
  } catch (error) {
    console.error("Error removing surgery from record:", error)
    throw error
  }
}

const getSurgeryIdForRecord = async (recordId) => {
  try {
    const [result] = await db.query("SELECT surgery_id FROM record_info WHERE record_id = ?", [recordId])
    return result.length > 0 ? result[0].surgery_id : null
  } catch (error) {
    console.error("Error getting surgery_id for record:", error)
    throw error
  }
}

const insertLabInfo = async (labDescription) => {
  try {
    const [result] = await db.query("INSERT INTO lab_info (lab_description) VALUES (?)", [labDescription])
    return result.insertId
  } catch (error) {
    console.error("Error inserting lab info:", error)
    throw error
  }
}

const getLabIdByDescription = async (labDescription) => {
  try {
    const [rows] = await db.query("SELECT lab_id FROM lab_info WHERE lab_description = ?", [labDescription])
    return rows.length > 0 ? rows[0].lab_id : null
  } catch (error) {
    console.error("Error getting lab ID by description:", error)
    throw error
  }
}

const insertDiagnosis = async (diagnosisText) => {
  try {
    const [result] = await db.query("INSERT INTO diagnosis (diagnosis_text) VALUES (?)", [diagnosisText])
    return result.insertId
  } catch (error) {
    console.error("Error inserting diagnosis:", error)
    throw error
  }
}

const insertSurgeryInfo = async (surgeryType, surgeryDate) => {
  try {
    const [result] = await db.query("INSERT INTO surgery_info (surgery_type, surgery_date) VALUES (?, ?)", [
      surgeryType,
      surgeryDate,
    ])
    return result.insertId
  } catch (error) {
    console.error("Error inserting surgery info:", error)
    throw error
  }
}

const insertRecord = async (
  petId,  
  recordDate,
  recordWeight,
  recordTemp,
  recordCondition,
  recordSymptom,
  recordRecentVisit,
  recordPurchase,
  recordPurpose,
  recordLabFile,
  labId, 
  diagnosisId,
  surgeryId,
) => {
  try {
    const [result] = await db.query(
      "INSERT INTO record_info (pet_id, record_date, record_weight, record_temp, record_condition, record_symptom, record_recent_visit, record_purchase, record_purpose, record_lab_file, lab_id, diagnosis_id, surgery_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        petId,
        recordDate,
        recordWeight,
        recordTemp,
        recordCondition,
        recordSymptom,
        recordRecentVisit,
        recordPurchase,
        recordPurpose,
        recordLabFile,
        labId,
        diagnosisId,
        surgeryId,
      ],
    )
    return result.insertId
  } catch (error) {
    console.error("Error inserting record:", error)
    throw error
  }
}

const updateRecordInDB = async (
  recordId,
  recordDate,
  recordPurpose,
  recordWeight,
  recordTemp,
  recordCondition,
  recordSymptom,
  recordRecentVisit,
  recordPurchase,
  recordLabFile,
) => {
  try {
    const [result] = await db.query(
      "UPDATE record_info SET record_date = ?, record_purpose = ?, record_weight = ?, record_temp = ?, record_condition = ?, record_symptom = ?, record_recent_visit = ?, record_purchase = ?, record_lab_file = ? WHERE record_id = ?",
      [
        recordDate,
        recordPurpose,
        recordWeight,
        recordTemp,
        recordCondition,
        recordSymptom,
        recordRecentVisit,
        recordPurchase,
        recordLabFile,
        recordId,
      ],
    )
    return result.affectedRows > 0
  } catch (error) {
    console.error("Error updating record:", error)
    throw error
  }
}

const getRecordById = async (recordId) => {
  try {
    const [rows] = await db.query("SELECT * FROM record_info WHERE record_id = ?", [recordId])
    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error("Error getting record by ID:", error)
    throw error
  }
}

const insertMatchRecLab = async (recordId, labId) => {
  try {
    const [result] = await db.query("INSERT INTO match_rec_lab (record_id, lab_id) VALUES (?, ?)", [recordId, labId])
    return result.insertId
  } catch (error) {
    console.error("Error inserting record lab match:", error)
    throw error
  }
}

const updateMatchRecLab = async (recordId, labId) => {
  try {
    const [result] = await db.query("UPDATE match_rec_lab SET lab_id = ? WHERE record_id = ?", [labId, recordId])
    return result.affectedRows > 0
  } catch (error) {
    console.error("Error updating record lab match:", error)
    throw error
  }
}

const updateDiagnosisText = async (diagnosisId, diagnosisText) => {
  try {
    const query = `
      UPDATE diagnosis
      SET diagnosis_text = ?
      WHERE diagnosis_id = ?
    `;
    const [result] = await db.query(query, [diagnosisText, diagnosisId]);
    return result;
  } catch (error) {
    console.error("Error updating diagnosis text:", error);
    throw error;
  }
}

const deleteSurgeryInfo = async (surgeryId) => {
  try {
    if (!surgeryId) return null

    const [result] = await db.query("DELETE FROM surgery_info WHERE surgery_id = ?", [surgeryId])
    return result.affectedRows > 0
  } catch (error) {
    console.error("Error deleting surgery info:", error)
    throw error
  }
}

module.exports = {
  getAllVisitRecords,
  insertLabInfo,
  getLabIdByDescription,
  insertDiagnosis,
  insertSurgeryInfo,
  insertRecord,
  updateRecordInDB,
  getRecordById,
  insertMatchRecLab,
  updateMatchRecLab,
  updateDiagnosisText,
  updateSurgeryInfo,
  removeSurgeryFromRecord,
  getSurgeryIdForRecord,
  deleteSurgeryInfo,
}