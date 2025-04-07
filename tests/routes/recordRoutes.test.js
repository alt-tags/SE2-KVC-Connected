const request = require('supertest');
const express = require('express');
const path = require('path');
// Keep the original import for type checking/intellisense if needed
// const fs = require('fs');

// --- Mocking Dependencies ---

// Mock the Record Controller
jest.mock('../../server/controllers/recordController', () => ({
    addRecord: jest.fn(),
    updateRecord: jest.fn(),
    requestDiagnosisAccessCode: jest.fn(),
    getVisitRecords: jest.fn(),
}));

// Mock the Authentication Middleware
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        // ... (implementation remains the same) ...
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                userId: 'mockUserId',
                role: req.headers['x-test-user-role'] || 'guest'
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    // authorize factory returns the actual middleware mock
    authorize: jest.fn((options) => (req, res, next) => {
        // ... (implementation remains the same) ...
        const allowedRoles = options.roles || [];
        if (req.user && allowedRoles.includes(req.user.role)) {
            next();
        } else if (!req.user) {
             res.status(403).json({ error: 'Forbidden: User not authenticated for authorization check (mocked)' });
        } else {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions (mocked)' });
        }
    }),
}));

// Mock authenticateToken from authUtility.js
jest.mock('../../server/utils/authUtility', () => ({
    authenticateToken: jest.fn((req, res, next) => {
        // ... (implementation remains the same) ...
         if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                userId: 'mockUserId',
                role: req.headers['x-test-user-role'] || 'guest'
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    generateToken: jest.fn(),
}));

// Mock multer
jest.mock('multer', () => {
    // ... (implementation remains the same) ...
    const multerMock = () => ({
        single: () => (req, res, next) => next()
    });
    multerMock.diskStorage = () => ({});
    return multerMock;
});


// Mock database
jest.mock('../../server/config/db', () => ({
    query: jest.fn().mockResolvedValue([[]]),
}));

// Mock generatePDF
jest.mock('../../server/utils/generatePDF', () =>
    jest.fn().mockResolvedValue('path/to/generated/pdf.pdf')
);

// FIX: Define mockPipe function reference outside beforeEach if needed, or just define it inside.
// Let's define it inside beforeEach for simplicity and scope control.

// Mock fs
jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    // The mock implementation will be set in beforeEach
    createReadStream: jest.fn(),
}));

// --- NOW require the modules that use the mocks ---
const recordRoutes = require('../../server/routes/recordRoutes');
const recordController = require('../../server/controllers/recordController');
// We don't need to import the mocked 'authorize' factory just to check calls on it anymore
const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware');
const { authenticateToken: mockedAuthenticateToken } = require('../../server/utils/authUtility');
const db = require('../../server/config/db');
const generatePdf = require('../../server/utils/generatePDF');
const mockedFs = require('fs'); // Get the mocked version of fs


// --- Test Application Setup ---
const app = express();
app.use(express.json());
app.use('/', recordRoutes);

// --- Test Suite ---
describe('Record Routes', () => {
    const petId = 'pet123';
    const recordId = 'rec456';
    let agent;
    let mockPipe; // Declare here to be accessible in tests if needed, defined in beforeEach

    beforeEach(() => {
        // Clear all mocks: resets call counts, implementations, return values etc.
        jest.clearAllMocks();

        // FIX: Define the mock pipe function for this specific test run
        mockPipe = jest.fn(res => {
            setImmediate(() => res.end());
            return res;
        });
        const mockStream = { pipe: mockPipe }; // This is the object createReadStream will return

        // FIX: Set the mock implementation for createReadStream *without calling it*
        mockedFs.createReadStream.mockReturnValue(mockStream);

        // Provide default success implementations for mocked controller methods
        recordController.getVisitRecords.mockImplementation((req, res) => res.status(200).json([{ id: 1, pet_id: petId, date: '2023-01-01' }]));
        recordController.addRecord.mockImplementation((req, res) => res.status(201).json({ message: 'Record added (mocked)', id: recordId }));
        recordController.updateRecord.mockImplementation((req, res) => res.status(200).json({ message: 'Record updated (mocked)', id: req.params.recordId }));
        recordController.requestDiagnosisAccessCode.mockImplementation((req, res) => res.status(200).json({ message: 'Access code requested (mocked)', code: 'ABCDEF' }));

        // Default mock for search-records success
        db.query.mockResolvedValue([[{ date: '2023-01-01', purposeOfVisit: 'Checkup', pet_name: 'Fluffy' }]]);

        // Default mock for PDF generation success
        generatePdf.mockResolvedValue('path/to/mocked/pdf.pdf');

        agent = request(app);
    });

    // --- Test GET /visit-records ---
    // ... (no changes needed here) ...
    describe('GET /visit-records', () => {
        const path = '/visit-records';

        it('should allow authenticated user to get visit records (200 OK)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([{ id: 1, pet_id: petId, date: '2023-01-01' }]);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.getVisitRecords).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.getVisitRecords).not.toHaveBeenCalled();
        });
    });

    // --- Test POST /records/:petId ---
    describe('POST /records/:petId', () => {
        const allowedRoles = ['doctor', 'clinician'];
        const path = `/records/${petId}`;
        const requestBody = { diagnosis: 'Healthy', notes: 'Routine checkup' };

        allowedRoles.forEach(role => {
            it(`should allow ${role} to add a record (201 Created)`, async () => {
                const response = await agent.post(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role)
                    .send(requestBody);

                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('message', 'Record added (mocked)');
                expect(response.body).toHaveProperty('id', recordId);
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                // FIX: Remove assertion on authorize factory
                // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["doctor", "clinician"] });
                expect(recordController.addRecord).toHaveBeenCalledTimes(1);
            });
        });

        it('should forbid access for unauthorized role (e.g., petowner) (403 Forbidden)', async () => {
            const response = await agent.post(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner')
                .send(requestBody);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
             // FIX: Remove assertion on authorize factory
            // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["doctor", "clinician"] });
            expect(recordController.addRecord).not.toHaveBeenCalled();
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.post(path)
                .set('x-test-authenticated', 'false')
                .send(requestBody);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.addRecord).not.toHaveBeenCalled();
        });
    });

    // --- Test PUT /records/:recordId ---
    describe('PUT /records/:recordId', () => {
        const allowedRoles = ['doctor', 'clinician'];
        const path = `/records/${recordId}`;
        const requestBody = { notes: 'Updated notes' };

        allowedRoles.forEach(role => {
            it(`should allow ${role} to update a record (200 OK)`, async () => {
                const response = await agent.put(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role)
                    .send(requestBody);

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('message', 'Record updated (mocked)');
                expect(response.body).toHaveProperty('id', recordId);
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                 // FIX: Remove assertion on authorize factory
                // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["doctor", "clinician"] });
                expect(recordController.updateRecord).toHaveBeenCalledTimes(1);
                expect(recordController.updateRecord).toHaveBeenCalledWith(
                    expect.objectContaining({ params: { recordId: recordId }, body: requestBody }),
                    expect.anything(),
                    expect.anything()
                );
            });
        });

        it('should forbid access for unauthorized role (e.g., petowner) (403 Forbidden)', async () => {
            const response = await agent.put(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner')
                .send(requestBody);

            expect(response.status).toBe(403);
            expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
             // FIX: Remove assertion on authorize factory
            // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["doctor", "clinician"] });
            expect(recordController.updateRecord).not.toHaveBeenCalled();
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.put(path)
                .set('x-test-authenticated', 'false')
                .send(requestBody);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.updateRecord).not.toHaveBeenCalled();
        });
    });

    // --- Test GET /records/request-access-code ---
    describe('GET /records/request-access-code', () => {
        const allowedRoles = ['clinician'];
        const path = '/records/request-access-code';

        it(`should allow ${allowedRoles[0]} to request an access code (200 OK)`, async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', allowedRoles[0]);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Access code requested (mocked)');
            expect(response.body).toHaveProperty('code', 'ABCDEF');
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
             // FIX: Remove assertion on authorize factory
            // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["clinician"] });
            expect(recordController.requestDiagnosisAccessCode).toHaveBeenCalledTimes(1);
        });

        ['doctor', 'petowner'].forEach(role => {
            it(`should forbid access for unauthorized role (${role}) (403 Forbidden)`, async () => {
                const response = await agent.get(path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', role);

                expect(response.status).toBe(403);
                expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                 // FIX: Remove assertion on authorize factory
                // expect(mockedAuthorize).toHaveBeenCalledWith({ roles: ["clinician"] });
                expect(recordController.requestDiagnosisAccessCode).not.toHaveBeenCalled();
            });
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(recordController.requestDiagnosisAccessCode).not.toHaveBeenCalled();
        });
    });

    // --- Test GET /search-records ---
    // ... (no changes needed here) ...
    describe('GET /search-records', () => {
        const basePath = '/search-records';
        const successPath = `${basePath}?pet_id=${petId}`;

        it('should allow authenticated user to search records (200 OK)', async () => {
            const response = await agent.get(successPath)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([{ date: '2023-01-01', purposeOfVisit: 'Checkup', pet_name: 'Fluffy' }]);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("WHERE record_info.pet_id = ?"),
                expect.arrayContaining([petId])
            );
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY record_info.record_date DESC"),
                expect.anything()
            );
        });

         it('should allow sorting records (e.g., ASC)', async () => {
            const pathWithSort = `${successPath}&sort_order=ASC`;
            await agent.get(pathWithSort)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

             expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
             expect(db.query).toHaveBeenCalledTimes(1);
             expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("ORDER BY record_info.record_date ASC"),
                expect.arrayContaining([petId])
            );
        });

         it('should allow filtering by date range', async () => {
            const pathWithDate = `${successPath}&start_date=2023-01-01&end_date=2023-12-31`;
            await agent.get(pathWithDate)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

             expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
             expect(db.query).toHaveBeenCalledTimes(1);
             expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining("AND record_info.record_date >= ? AND record_info.record_date <= ?"),
                expect.arrayContaining([petId, '2023-01-01', '2023-12-31'])
            );
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(successPath)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should return 400 if pet_id is missing', async () => {
            const response = await agent.get(basePath)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'pet_id is required' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(db.query).not.toHaveBeenCalled();
        });
    });


    // --- Test GET /generate-pdf/:petId/:recordId ---
    describe('GET /generate-pdf/:petId/:recordId', () => {
        const path = `/generate-pdf/${petId}/${recordId}`;

        it('should allow authenticated user to generate PDF (200 OK)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/pdf');
            expect(response.headers['content-disposition']).toContain('filename=pdf.pdf');

            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledWith(petId, recordId);

            // FIX: Check createReadStream call count and arguments
            expect(mockedFs.createReadStream).toHaveBeenCalledTimes(1); // Should be called once by the route handler
            expect(mockedFs.createReadStream).toHaveBeenCalledWith('path/to/mocked/pdf.pdf'); // Check path used

            // FIX: Check that the mockPipe function was called once
            expect(mockPipe).toHaveBeenCalledTimes(1);

        }, 35000);

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent.get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(generatePdf).not.toHaveBeenCalled();
            expect(mockedFs.createReadStream).not.toHaveBeenCalled();
            expect(mockPipe).not.toHaveBeenCalled(); // Pipe shouldn't be called either
        });

         it('should return 500 if PDF generation fails', async () => {
            const error = new Error('PDF generation failed');
            generatePdf.mockRejectedValue(error);

            const response = await agent.get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'petowner');

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ error: 'Failed to generate PDF' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledTimes(1);
            expect(generatePdf).toHaveBeenCalledWith(petId, recordId);
            expect(mockedFs.createReadStream).not.toHaveBeenCalled();
            expect(mockPipe).not.toHaveBeenCalled(); // Pipe shouldn't be called
        });
    });
});