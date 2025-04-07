const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Import controller AFTER setup/mocks if possible, or ensure mocks are defined before controller is potentially loaded by Jest
const recordController = require('../../server/controllers/recordController');
const db = require('../../server/config/db'); // Need to mock its methods like query
const recordModel = require('../../server/models/recordModel');
const emailUtility = require('../../server/utils/emailUtility');
const crypto = require('crypto');

// --- Mocks ---

// Mock the entire db module, specifically the query method used internally and by getCompleteRecordById
jest.mock('../../server/config/db', () => ({
    query: jest.fn(),
    // Add mock for pool or other specific exports if controller uses them directly
}));

// Mock the specific functions imported from recordModel
jest.mock('../../server/models/recordModel', () => ({
    getAllVisitRecords: jest.fn(),
    insertDiagnosis: jest.fn(),
    insertSurgeryInfo: jest.fn(),
    insertRecord: jest.fn(),
    insertMatchRecLab: jest.fn(),
    getLabIdByDescription: jest.fn(),
    updateRecordInDB: jest.fn(), // Although not directly used in controller, good practice if mocking module
    updateMatchRecLab: jest.fn(),
    getRecordById: jest.fn(),
    updateDiagnosisText: jest.fn(),
    updateSurgeryInfo: jest.fn(),
    deleteSurgeryInfo: jest.fn(), // Though called via db.query, mock if directly imported/used
    insertLabInfo: jest.fn(),
}));

// Mock email utility
jest.mock('../../server/utils/emailUtility', () => ({
    sendEmail: jest.fn(),
}));

// Mock crypto if needed for predictable codes (optional but good for testing)
// We'll spy on it later if needed for specific tests

// --- Test Suite ---

describe('Record Controller', () => {
    let req;
    let res;
    const mockPetId = 'pet123';
    const mockRecordId = 'rec456';
    const mockUserId = 'user789';

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests

        req = {
            query: {},
            params: {},
            body: {},
            user: { id: mockUserId, role: 'doctor' }, // Default to doctor, override in tests
            session: {}, // Mock session for access code tests
            file: null, // Mock file upload
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(), // Include send if used
        };

        // Default mock for db.query used by getCompleteRecordById and updateRecord
        // Return structure: [rows, fields]
        db.query.mockResolvedValue([[], []]);
    });

    // == Test getVisitRecords ==
    describe('getVisitRecords', () => {
        it('should return 400 if pet_id is missing', async () => {
            req.query = {}; // No pet_id

            await recordController.getVisitRecords(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'pet_id is required' });
            expect(recordModel.getAllVisitRecords).not.toHaveBeenCalled();
        });

        it('should fetch and return records successfully', async () => {
            req.query = { pet_id: mockPetId };
            const mockRecords = [{ id: 1, date: '2023-01-01' }, { id: 2, date: '2023-02-15' }];
            recordModel.getAllVisitRecords.mockResolvedValue(mockRecords);

            await recordController.getVisitRecords(req, res);

            expect(recordModel.getAllVisitRecords).toHaveBeenCalledWith(mockPetId);
            expect(res.status).not.toHaveBeenCalled(); // Should default to 200, check json called
            expect(res.json).toHaveBeenCalledWith(mockRecords);
        });

        it('should return 500 if fetching records fails', async () => {
            req.query = { pet_id: mockPetId };
            const error = new Error('DB Error');
            recordModel.getAllVisitRecords.mockRejectedValue(error);

            await recordController.getVisitRecords(req, res);

            expect(recordModel.getAllVisitRecords).toHaveBeenCalledWith(mockPetId);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch visit records' });
        });
    });

    // == Test addRecord ==
    describe('addRecord', () => {
        const baseRecordData = {
            record_date: '2024-03-15',
            record_weight: '10',
            record_temp: '38.5',
            record_condition: 'Good',
            record_symptom: 'None',
            record_recent_visit: 'No',
            record_purchase: 'Food',
            record_purpose: 'Checkup',
        };

        beforeEach(() => {
            req.params = { petId: mockPetId };
            req.body = { ...baseRecordData };
            req.user = { role: 'doctor' }; // Default to doctor

            // Mock insertRecord returning a mock ID
            recordModel.insertRecord.mockResolvedValue(mockRecordId);

            // Mock getCompleteRecordById (via db.query) returning a structure
            const mockCompleteRecord = {
                id: mockRecordId,
                date: baseRecordData.record_date,
                purposeOfVisit: baseRecordData.record_purpose,
                // ... other fields based on getCompleteRecordById query ...
                petId: mockPetId,
                hadSurgery: false,
            };
            // Simulate db.query call inside getCompleteRecordById
            db.query.mockImplementation((query, params) => {
                // Check if it's the SELECT query from getCompleteRecordById
                if (query.includes('SELECT') && query.includes('record_info r') && params[0] === mockRecordId) {
                    return Promise.resolve([[mockCompleteRecord], []]); // [rows, fields]
                }
                return Promise.resolve([[], []]); // Default empty for other queries
            });
        });

        it('should add a record successfully for a doctor without optional fields', async () => {
            await recordController.addRecord(req, res);

            expect(recordModel.insertRecord).toHaveBeenCalledWith(
                mockPetId,
                baseRecordData.record_date,
                baseRecordData.record_weight,
                baseRecordData.record_temp,
                baseRecordData.record_condition,
                baseRecordData.record_symptom,
                baseRecordData.record_recent_visit,
                baseRecordData.record_purchase,
                baseRecordData.record_purpose,
                null, // record_lab_file
                null, // lab_id
                null, // diagnosis_id
                null  // surgery_id
            );
            expect(recordModel.getLabIdByDescription).not.toHaveBeenCalled();
            expect(recordModel.insertLabInfo).not.toHaveBeenCalled();
            expect(recordModel.insertDiagnosis).not.toHaveBeenCalled();
            expect(recordModel.insertSurgeryInfo).not.toHaveBeenCalled();
            expect(recordModel.insertMatchRecLab).not.toHaveBeenCalled();
            expect(db.query).toHaveBeenCalledTimes(1); // Only the getCompleteRecordById call
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: mockRecordId }));
        });

        it('should add a record with existing lab info', async () => {
            req.body.lab_description = 'Blood Test';
            const mockLabId = 'lab001';
            recordModel.getLabIdByDescription.mockResolvedValue(mockLabId);

            await recordController.addRecord(req, res);

            expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('Blood Test');
            expect(recordModel.insertLabInfo).not.toHaveBeenCalled();
            expect(recordModel.insertRecord).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), null, mockLabId, null, null);
            expect(recordModel.insertMatchRecLab).toHaveBeenCalledWith(mockRecordId, mockLabId);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should add a record and create new lab info if not existing', async () => {
            req.body.lab_description = 'New Test';
            const mockNewLabId = 'lab002';
            recordModel.getLabIdByDescription.mockResolvedValue(null); // Not found
            recordModel.insertLabInfo.mockResolvedValue(mockNewLabId);

            await recordController.addRecord(req, res);

            expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('New Test');
            expect(recordModel.insertLabInfo).toHaveBeenCalledWith('New Test');
            expect(recordModel.insertRecord).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), null, mockNewLabId, null, null);
            expect(recordModel.insertMatchRecLab).toHaveBeenCalledWith(mockRecordId, mockNewLabId);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should add a record with diagnosis for a doctor', async () => {
            req.body.diagnosis_text = 'Healthy';
            const mockDiagnosisId = 'diag001';
            recordModel.insertDiagnosis.mockResolvedValue(mockDiagnosisId);

            await recordController.addRecord(req, res);

            expect(recordModel.insertDiagnosis).toHaveBeenCalledWith('Healthy');
            expect(recordModel.insertRecord).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), null, null, mockDiagnosisId, null);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should add a record with surgery info', async () => {
            req.body.surgery_type = 'Spay';
            req.body.surgery_date = '2024-03-16';
            const mockSurgeryId = 'surg001';
            recordModel.insertSurgeryInfo.mockResolvedValue(mockSurgeryId);

            await recordController.addRecord(req, res);

            expect(recordModel.insertSurgeryInfo).toHaveBeenCalledWith('Spay', '2024-03-16');
            expect(recordModel.insertRecord).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), null, null, null, mockSurgeryId);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should add a record with lab file', async () => {
            req.file = { filename: 'lab_report.pdf' };

            await recordController.addRecord(req, res);

            expect(recordModel.insertRecord).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), expect.anything(), 'lab_report.pdf', null, null, null);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should return 403 if clinician tries to add diagnosis', async () => {
            req.user.role = 'clinician';
            req.body.diagnosis_text = 'Attempted Diagnosis';

            await recordController.addRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Clinicians cannot add a diagnosis when creating a record.' });
            expect(recordModel.insertRecord).not.toHaveBeenCalled();
        });

        it('should return 400 if required fields are missing', async () => {
            delete req.body.record_weight; // Remove a required field

            await recordController.addRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields.' });
            expect(recordModel.insertRecord).not.toHaveBeenCalled();
        });

        it('should return 500 if insertRecord fails', async () => {
            const error = new Error('DB Insert Error');
            recordModel.insertRecord.mockRejectedValue(error);

            await recordController.addRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Server error while adding medical record.' });
        });

        it('should return 404 if getCompleteRecordById fails after insert', async () => {

            db.query.mockResolvedValue([[], []]); // No rows found

            await recordController.addRecord(req, res);

            expect(recordModel.insertRecord).toHaveBeenCalled();
            expect(db.query).toHaveBeenCalledTimes(1); // getCompleteRecordById query
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve the newly created record.' });
        });
    });

    // == Test updateRecord ==
    describe('updateRecord', () => {
        const mockRecordId = 'rec789';
        let currentRecordMock;

        beforeEach(() => {
            req.params = { recordId: mockRecordId }; // Or req.params.id depending on route setup
            req.user = { role: 'doctor' };
            req.session = { diagnosisAccessCode: 'VALIDCODE' }; // Assume valid code for relevant tests

            currentRecordMock = {
                record_id: mockRecordId,
                record_date: '2024-03-10',
                record_weight: '9',
                record_temp: '38.0',
                record_condition: 'Fair',
                record_symptom: 'Lethargy',
                record_recent_visit: 'Yes',
                record_purchase: 'Meds',
                record_purpose: 'Follow-up',
                record_lab_file: null,
                lab_id: null,
                diagnosis_id: null,
                surgery_id: null,
            };

            // Mock getRecordById to return the base record
            recordModel.getRecordById.mockResolvedValue(currentRecordMock);
            recordModel.updateSurgeryInfo = jest.fn().mockResolvedValue(undefined);
            recordModel.getRecordById = jest.fn().mockResolvedValue(currentRecordMock);

            // Update currentRecordMock to include surgery info
            currentRecordMock = {
                ...currentRecordMock,
                surgery_id: 'surg001',
                surgeryType: 'Previous Surgery',
                surgeryDate: '2024-03-20'
            };

            // Mock getCompleteRecordById (via db.query) for the final response
            // Simulate db.query calls:
            // 1. Potential SELECT in getCompleteRecordById (mocked to return updated data)
            // 2. The UPDATE query itself
            // 3. Potential DELETE for surgery removal
            // 4. Potential UPDATE for surgery removal (setting to NULL)
            db.query.mockImplementation(async (query, params) => {
                if (typeof query === 'string') {
                    if (query.startsWith('UPDATE record_info SET surgery_id = NULL')) {
                        return Promise.resolve([{ affectedRows: 1 }, []]); // Mock successful NULL update
                    }
                    if (query.startsWith('DELETE FROM surgery_info')) {
                        return Promise.resolve([{ affectedRows: 1 }, []]); // Mock successful delete
                    }
                    if (query.startsWith('UPDATE record_info SET')) {
                        return Promise.resolve([{ affectedRows: 1 }, []]); // Mock successful final update
                    }
                    if (query.startsWith('SELECT') && query.includes('FROM record_info r') && params && params[0] === mockRecordId) {
                        // Return updated data for the final fetch
                        const updatedData = { ...currentRecordMock, ...req.body, id: mockRecordId }; // Simple merge for test
                        return Promise.resolve([[updatedData], []]);
                    }
                }
                return Promise.resolve([[], []]); // Default empty
            });
        });
        it('should update existing surgery info', async () => {
            // Set up request
            req.body = {
                hadSurgery: true,
                surgery_type: 'Neuter Updated',
                surgery_date: '2024-03-21'
            };

            // Mock the record being updated
            const updatedRecord = {
                ...currentRecordMock,
                surgeryType: 'Neuter Updated',
                surgeryDate: '2024-03-21'
            };

            // Mock db.query to return updated record
            db.query.mockImplementation((query) => {
                if (query.includes('SELECT') && query.includes('record_info')) {
                    return Promise.resolve([[updatedRecord], []]);
                }
                return Promise.resolve([{ affectedRows: 1 }, []]);
            });

            await recordController.updateRecord(req, res);
            // Verify surgery info was updated
            expect(recordModel.updateSurgeryInfo).toHaveBeenCalledWith(
                'surg001',
                'Neuter Updated',
                '2024-03-21'
            );

            // Verify response
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Medical record updated successfully!",
                hadSurgery: true
            }));
        });


        // Inside describe('updateRecord', () => {...})

        it('should return 404 if record not found', async () => {
            // Set up request with required fields
            req = {
                params: { recordId: 'rec789' },
                user: { role: 'doctor' },
                body: {},
                session: {},
                file: null
            };

            // Mock recordModel.getRecordById to return null
            recordModel.getRecordById = jest.fn().mockResolvedValue(null);

            // Make the request
            await recordController.updateRecord(req, res);

            // Verify expectations
            expect(recordModel.getRecordById).toHaveBeenCalledWith('rec789');
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "Record not found." });
            expect(db.query).not.toHaveBeenCalled();
        });

        // --- Diagnosis Updates ---
        it('should add diagnosis by doctor if none exists', async () => {
            req.body = { diagnosis_text: 'New Diagnosis' };
            currentRecordMock.diagnosis_id = null; // Ensure no current diagnosis
            const newDiagnosisId = 'diag002';
            recordModel.insertDiagnosis.mockResolvedValue(newDiagnosisId);

            await recordController.updateRecord(req, res);

            expect(recordModel.insertDiagnosis).toHaveBeenCalledWith('New Diagnosis');
            expect(recordModel.updateDiagnosisText).not.toHaveBeenCalled();
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining([newDiagnosisId]) // Check new ID is in the update values
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should update existing diagnosis by doctor', async () => {
            req.body = { diagnosis_text: 'Updated Diagnosis' };
            currentRecordMock.diagnosis_id = 'diag001'; // Has existing diagnosis
            recordModel.updateDiagnosisText.mockResolvedValue(); // Mock success

            await recordController.updateRecord(req, res);

            expect(recordModel.insertDiagnosis).not.toHaveBeenCalled();
            expect(recordModel.updateDiagnosisText).toHaveBeenCalledWith('diag001', 'Updated Diagnosis');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining(['diag001']) // Check existing ID is in the update values
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should add diagnosis by clinician with valid code', async () => {
            req.user.role = 'clinician';
            req.body = { diagnosis_text: 'Clinician Added Diagnosis', accessCode: 'VALIDCODE' };
            currentRecordMock.diagnosis_id = null;
            const newDiagnosisId = 'diag003';
            recordModel.insertDiagnosis.mockResolvedValue(newDiagnosisId);

            await recordController.updateRecord(req, res);

            expect(req.session.diagnosisAccessCode).toBe('VALIDCODE');
            expect(recordModel.insertDiagnosis).toHaveBeenCalledWith('Clinician Added Diagnosis');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining([newDiagnosisId])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should update diagnosis by clinician with valid code', async () => {
            req.user.role = 'clinician';
            req.body = { diagnosis_text: 'Clinician Updated Diagnosis', accessCode: 'VALIDCODE' };
            currentRecordMock.diagnosis_id = 'diag001';
            recordModel.updateDiagnosisText.mockResolvedValue();

            await recordController.updateRecord(req, res);

            expect(req.session.diagnosisAccessCode).toBe('VALIDCODE');
            expect(recordModel.updateDiagnosisText).toHaveBeenCalledWith('diag001', 'Clinician Updated Diagnosis');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining(['diag001'])
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 403 if clinician updates diagnosis without requesting code', async () => {
            req.user.role = 'clinician';
            req.body = { diagnosis_text: 'Test', accessCode: 'ANYCODE' };
            delete req.session.diagnosisAccessCode; // Code not requested/expired

            await recordController.updateRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Access code not requested or expired.' });
            expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE record_info SET'));
        });

        it('should return 403 if clinician updates diagnosis with invalid code', async () => {
            req.user.role = 'clinician';
            req.body = { diagnosis_text: 'Test', accessCode: 'INVALIDCODE' };
            req.session.diagnosisAccessCode = 'VALIDCODE'; // Session has different code

            await recordController.updateRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid access code.' });
            expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE record_info SET'));
        });


        // --- Surgery Updates ---
        // Inside describe('updateRecord', () => { ... });

        it('should update existing surgery info', async () => {
            // --- FIX: Add hadSurgery: true to the request body ---
            req.body = {
                hadSurgery: true, // Indicate that surgery info should exist/be updated
                surgery_type: 'Neuter Updated',
                surgery_date: '2024-03-21'
            };
            currentRecordMock.surgery_id = 'surg001'; // Simulate existing surgery
            recordModel.updateSurgeryInfo.mockResolvedValue(); // Mock the update function to resolve successfully

            // Mock getCompleteRecordById response *after* potential update
            // Ensure it reflects that surgery_id is still 'surg001'
            const finalUpdatedRecord = {
                ...currentRecordMock, // Start with original data
                id: mockRecordId, // Add the id field expected by getCompleteRecordById format
                surgery_id: 'surg001', // Should remain the same after update
                surgeryType: 'Neuter Updated', // Reflect updated value
                surgeryDate: '2024-03-21', // Reflect updated value
                hadSurgery: true // Reflect updated value
                // Map other fields from currentRecordMock to the getCompleteRecordById structure if needed
                // e.g., date: currentRecordMock.record_date, purposeOfVisit: currentRecordMock.record_purpose, etc.
            };

            // Adjust db.query mock to return the final state when getCompleteRecordById is called
            db.query.mockImplementation(async (query, params) => {
                if (typeof query === 'string') {
                    if (query.startsWith('UPDATE record_info SET surgery_id = NULL')) {
                        return Promise.resolve([{ affectedRows: 1 }, []]);
                    }
                    if (query.startsWith('DELETE FROM surgery_info')) {
                        return Promise.resolve([{ affectedRows: 1 }, []]);
                    }
                    if (query.startsWith('UPDATE record_info SET')) {
                        // Simulate the final update affecting 1 row
                        return Promise.resolve([{ affectedRows: 1 }, []]);
                    }
                    // Simulate getCompleteRecordById call *after* the update logic has run
                    if (query.startsWith('SELECT') && query.includes('FROM record_info r') && params && params[0] === mockRecordId) {
                        console.log(`DEBUG (Test Mock): Returning final record data for ${mockRecordId}`);
                        // Return the state *as if* the update was successful
                        return Promise.resolve([[finalUpdatedRecord], []]);
                    }
                }
                console.log(`DEBUG (Test Mock): Default empty result for query: ${query.substring(0, 50)}...`);
                return Promise.resolve([[], []]); // Default empty for other unexpected queries
            });


            await recordController.updateRecord(req, res);

            expect(recordModel.updateSurgeryInfo).toHaveBeenCalledWith('surg001', 'Neuter Updated', '2024-03-21');

            // 2. Verify deleteSurgeryInfo was NOT called
            expect(recordModel.deleteSurgeryInfo).not.toHaveBeenCalled();
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM surgery_info'),
                expect.anything()
            );
            expect(db.query).not.toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET surgery_id = NULL'),
                expect.anything()
            );

            // 3. Verify the final UPDATE query on record_info contains the correct surgery_id
            const finalUpdateCall = db.query.mock.calls.find(call =>
                typeof call[0] === 'string' &&
                call[0].startsWith('UPDATE record_info SET') &&
                call[1].includes(mockRecordId) // Check if the recordId is in the params (usually last for WHERE)
            );
            expect(finalUpdateCall).toBeDefined(); // Ensure the update happened

            // --- FIX: Construct expected values from test scope variables ---
            // The controller builds its `updatedRecordData` by merging `currentRecord`
            // with `req.body` and handling special cases (like surgery_id).
            // We replicate the expected *result* of that merge here for the DB call parameters.
            const expectedUpdateValues = [
                currentRecordMock.record_date,       // From currentRecord (not in req.body)
                currentRecordMock.record_weight,     // From currentRecord (not in req.body)
                currentRecordMock.record_temp,       // From currentRecord (not in req.body)
                currentRecordMock.record_condition,  // From currentRecord (not in req.body)
                currentRecordMock.record_symptom,    // From currentRecord (not in req.body)
                currentRecordMock.record_recent_visit,// From currentRecord (not in req.body)
                currentRecordMock.record_purchase,   // From currentRecord (not in req.body)
                currentRecordMock.record_purpose,    // From currentRecord (not in req.body)
                currentRecordMock.lab_id,          // From currentRecord (not in req.body)
                currentRecordMock.diagnosis_id,    // From currentRecord (not in req.body)
                currentRecordMock.surgery_id,      // Kept 'surg001' because hadSurgery=true and surgery updated
                currentRecordMock.record_lab_file, // From currentRecord (not in req.body)
                mockRecordId                       // The record ID for the WHERE clause
            ];

            // Ensure the parameters passed to the DB update match the expected ones
            // Note: This assumes the order of fields in the UPDATE statement matches the order in expectedUpdateValues.
            // If the order is dynamic, using expect.arrayContaining might be necessary for specific values.
            expect(finalUpdateCall[1]).toEqual(expectedUpdateValues);
            // --- End FIX ---


            // 4. Verify the response status and body
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Medical record updated successfully!",
                hadSurgery: true, // Should be true since surgery was updated
                id: mockRecordId,
                surgeryType: 'Neuter Updated', // Check returned data reflects update
                surgeryDate: '2024-03-21'
                // Add other fields from finalUpdatedRecord if necessary
            }));
        });

        it('should remove surgery info if hadSurgery is false', async () => {
            req.body = { hadSurgery: false };
            currentRecordMock.surgery_id = 'surg001'; // Has existing surgery

            await recordController.updateRecord(req, res);

            // Check the query to set surgery_id to NULL in record_info
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET surgery_id = NULL WHERE record_id = ?'),
                [mockRecordId]
            );
            // Check the query to DELETE from surgery_info
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM surgery_info WHERE surgery_id = ?'),
                [currentRecordMock.surgery_id]
            );
            // Check the final UPDATE query has surgery_id as NULL
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining([null]) // surgery_id should be null in the update list
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hadSurgery: false }));
        });

        // --- Lab Update ---
        it('should update lab info', async () => {
            req.body = { lab_description: 'Updated Blood Test' };
            const newLabId = 'lab003';
            recordModel.getLabIdByDescription.mockResolvedValue(newLabId);
            currentRecordMock.lab_id = 'lab001'; // Has different current lab

            await recordController.updateRecord(req, res);

            expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('Updated Blood Test');
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining([newLabId]) // Check new lab ID in update values
            );
            expect(recordModel.updateMatchRecLab).toHaveBeenCalledWith(mockRecordId, newLabId);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 if invalid lab description provided', async () => {
            req.body = { lab_description: 'NonExistentTest' };
            recordModel.getLabIdByDescription.mockResolvedValue(null); // Lab not found

            await recordController.updateRecord(req, res);

            expect(recordModel.getLabIdByDescription).toHaveBeenCalledWith('NonExistentTest');
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid lab description.' });
            expect(db.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE record_info SET'));
        });

        // --- File Update ---
        it('should update record with new lab file', async () => {
            req.file = { filename: 'new_report.pdf' };

            await recordController.updateRecord(req, res);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE record_info SET'),
                expect.arrayContaining(['new_report.pdf']) // Check filename in update values
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });

        // --- General Error ---
        it('should return 500 if database update fails', async () => {
            req.body = { record_weight: '10' };
            const updateError = new Error('DB Update Failed');
            // Make the final UPDATE query fail
            db.query.mockImplementation(async (query) => {
                if (typeof query === 'string' && query.startsWith('UPDATE record_info SET')) {
                    throw updateError;
                }
                // Allow getRecordById query to succeed
                if (typeof query === 'string' && query.startsWith('SELECT') && query.includes('FROM record_info r')) {
                    return [[currentRecordMock], []];
                }
                return [[], []];
            });
            recordModel.getRecordById.mockResolvedValue(currentRecordMock); // Ensure this still resolves first


            await recordController.updateRecord(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Server error while updating medical record.' });
        });

    });

    // == Test requestDiagnosisAccessCode ==
    describe('requestDiagnosisAccessCode', () => {
        const mockAccessCode = 'ABCDEF12'; // Predictable code
        const mockOwnerEmail = 'owner@clinic.com';

        beforeEach(() => {
            // Mock crypto to return a predictable value
            const mockBuffer = Buffer.from(mockAccessCode.toLowerCase(), 'hex'); // Simulate hex bytes
            jest.spyOn(crypto, 'randomBytes').mockReturnValue(mockBuffer);

            // Set the required environment variable for the test
            process.env.CLINIC_OWNER_EMAIL = mockOwnerEmail;

            req.session = {}; // Ensure session exists
            emailUtility.sendEmail.mockResolvedValue(); // Mock successful email send
        });

        afterEach(() => {
            // Clean up environment variable changes if necessary
            delete process.env.CLINIC_OWNER_EMAIL;
        });

        it('should generate code, store in session, send email, and return code', async () => {
            await recordController.requestDiagnosisAccessCode(req, res);

            expect(crypto.randomBytes).toHaveBeenCalledWith(4);
            expect(req.session.diagnosisAccessCode).toBe(mockAccessCode); // Check if stored (case adjusted)
            expect(emailUtility.sendEmail).toHaveBeenCalledWith(
                mockOwnerEmail,
                expect.stringContaining('Diagnosis Access Code Request'),
                expect.stringContaining(mockAccessCode) // Check if code is in email body
            );
            expect(res.json).toHaveBeenCalledWith({
                message: expect.any(String),
                accessCode: mockAccessCode, // Check code is returned
            });
            expect(res.status).not.toHaveBeenCalled(); // Should be 200 OK by default
        });

        it('should return 500 if session is not initialized', async () => {
            req.session = null; // Simulate no session middleware

            await recordController.requestDiagnosisAccessCode(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: '❌ Session is not initialized.' });
            expect(emailUtility.sendEmail).not.toHaveBeenCalled();
        });

        it('should return 500 if clinic owner email is not set', async () => {
            delete process.env.CLINIC_OWNER_EMAIL; // Simulate missing env var

            await recordController.requestDiagnosisAccessCode(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: '❌ Clinic owner email is not set.' });
            expect(emailUtility.sendEmail).not.toHaveBeenCalled();
        });

        it('should return 500 if sending email fails', async () => {
            const emailError = new Error('SMTP Error');
            emailUtility.sendEmail.mockRejectedValue(emailError);

            await recordController.requestDiagnosisAccessCode(req, res);

            expect(emailUtility.sendEmail).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: '❌ Server error while requesting access code.' });
        });
    });
});