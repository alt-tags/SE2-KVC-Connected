const request = require('supertest');
const express = require('express');

// --- Mocking Dependencies ---
jest.mock('../../server/controllers/petController', () => ({
    updatePetProfile: jest.fn(),
    archivePet: jest.fn(),
    restorePet: jest.fn(),
    getAllActivePets: jest.fn(),
    getAllArchivedPets: jest.fn(),
    addPetForOwner: jest.fn(),
    getPetsByOwner: jest.fn(),
    getPetById: jest.fn(),
}));

// Mock authenticateToken from authUtility.js
jest.mock('../../server/utils/authUtility', () => ({
    authenticateToken: jest.fn((req, res, next) => {
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

jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        // Since authenticateToken already set up the user, just pass through
        next();
    }),
    // The factory mock - returns the actual middleware logic
    authorize: jest.fn((options) => (req, res, next) => {
        const allowedRoles = options.roles || [];
        if (req.user && allowedRoles.includes(req.user.role)) {
            next();
        } else if (!req.user) {
             res.status(403).json({ error: 'Forbidden: User not authenticated for authorization check (mocked)' });
        }
        else {
            res.status(403).json({ error: 'Forbidden: Insufficient permissions (mocked)' });
        }
    }),
}));

// --- Require modules AFTER mocks ---
const petRoutes = require('../../server/routes/petRoutes');
const petController = require('../../server/controllers/petController');
const {
    authenticate: mockedAuthenticate,
    // We still get the reference to the factory mock, even if we don't check its calls directly in 'it'
    authorize: mockedAuthorize
} = require('../../server/middleware/authMiddleware');
const {
    authenticateToken: mockedAuthenticateToken
} = require('../../server/utils/authUtility');

// --- Test Application Setup ---
const app = express();
app.use(express.json());
app.use('/pets', petRoutes);

// --- Test Suite ---
describe('Pet Routes (/pets)', () => {
    const petId = '123';
    let agent;

    beforeEach(() => {
        jest.clearAllMocks(); // Reset mocks for each test

        // Default implementations
        petController.updatePetProfile.mockImplementation((req, res) => res.status(200).json({ message: 'Pet updated (mocked)' }));
        petController.archivePet.mockImplementation((req, res) => res.status(200).json({ message: 'Pet archived (mocked)' }));
        petController.restorePet.mockImplementation((req, res) => res.status(200).json({ message: 'Pet restored (mocked)' }));
        petController.getAllActivePets.mockImplementation((req, res) => res.status(200).json([{ id: 1, name: 'Active Pet (mocked)' }]));
        petController.getAllArchivedPets.mockImplementation((req, res) => res.status(200).json([{ id: 2, name: 'Archived Pet (mocked)' }]));

        agent = request.agent(app);
    });

    // --- Tests for routes requiring clinician/doctor roles ---
    const protectedRoutes = [
        { method: 'put', path: `/pets/edit/${petId}`, controller: petController.updatePetProfile },
        { method: 'put', path: `/pets/archive/${petId}`, controller: petController.archivePet },
        { method: 'put', path: `/pets/restore/${petId}`, controller: petController.restorePet },
    ];

    protectedRoutes.forEach(({ method, path, controller }) => {
        describe(`${method.toUpperCase()} ${path}`, () => {
            // Note: We don't need allowedRoles variable here anymore for assertions inside 'it'

            ["clinician", "doctor"].forEach(role => {
                it(`should allow access and call controller for role: ${role}`, async () => {
                    const response = await agent[method](path)
                        .set('x-test-authenticated', 'true')
                        .set('x-test-user-role', role)
                        .send({ name: 'Updated Name' });

                    expect(response.status).toBe(200);
                    // Check authenticateToken middleware was called during the request
                    expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
                    // Check authenticate middleware was called during the request
                    expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                    // Check the controller was reached (meaning authenticate AND the inner authorize logic passed)
                    expect(controller).toHaveBeenCalledTimes(1);
                    expect(controller).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.any(Function));
                    // *** REMOVED checks for mockedAuthorize factory calls ***
                });
            });

            it('should return 403 Forbidden for unauthorized role (e.g., petowner)', async () => {
                const response = await agent[method](path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', 'petowner')
                    .send({ name: 'Updated Name' });

                expect(response.status).toBe(403);
                expect(response.body).toEqual({ error: 'Forbidden: Insufficient permissions (mocked)' });
                // Check authenticateToken middleware was called during the request
                expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
                // Check authenticate middleware was called during the request
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                // Controller should not be called because authorization failed
                expect(controller).not.toHaveBeenCalled();
                // *** REMOVED checks for mockedAuthorize factory calls ***
            });

            it('should return 401 Unauthorized if user is not authenticated', async () => {
                const response = await agent[method](path)
                    .set('x-test-authenticated', 'false')
                    .set('x-test-user-role', 'doctor')
                    .send({ name: 'Updated Name' });

                expect(response.status).toBe(401);
                expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
                // Check authenticateToken middleware was called during the request
                expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
                // Authenticate middleware should not be called because authenticateToken failed
                expect(mockedAuthenticate).not.toHaveBeenCalled();
                // Controller should not be called because authentication failed
                expect(controller).not.toHaveBeenCalled();
                // Authorize factory wouldn't have been called during the request anyway,
                // and its setup call was cleared. No need to check mockedAuthorize here.
            });
        });
    });

    // --- Tests for routes requiring any authenticated user ---
    const authenticatedRoutes = [
        { method: 'get', path: '/pets/active', controller: petController.getAllActivePets },
        { method: 'get', path: '/pets/archived', controller: petController.getAllArchivedPets },
    ];

    authenticatedRoutes.forEach(({ method, path, controller }) => {
        describe(`${method.toUpperCase()} ${path}`, () => {
            it('should allow access and call controller for any authenticated user', async () => {
                const response = await agent[method](path)
                    .set('x-test-authenticated', 'true')
                    .set('x-test-user-role', 'petowner');

                expect(response.status).toBe(200);
                // Check authenticateToken middleware was called during the request
                expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
                // Check authenticate middleware was called during the request
                expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
                // Controller should be called
                expect(controller).toHaveBeenCalledTimes(1);
                expect(controller).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.any(Function));
                // mockedAuthorize factory was never involved for these routes, so no need to check it.
            });

            it('should return 401 Unauthorized if user is not authenticated', async () => {
                const response = await agent[method](path)
                    .set('x-test-authenticated', 'false');

                expect(response.status).toBe(401);
                expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
                // Check authenticateToken middleware was called during the request
                expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
                // Authenticate middleware should not be called because authenticateToken failed
                expect(mockedAuthenticate).not.toHaveBeenCalled();
                // Controller should not be called
                expect(controller).not.toHaveBeenCalled();
                // mockedAuthorize factory was never involved for these routes, so no need to check it.
            });
        });
    });
});