const request = require('supertest');
const express = require('express');
const session = require('express-session');

// --- Mock Dependencies ---
// Mock the controller BEFORE requiring the routes
jest.mock('../../server/controllers/usersController', () => ({
    updateEmployeeProfile: jest.fn(),
    updateOwnerProfile: jest.fn(),
    changePassword: jest.fn(),
    getEmployeeProfile: jest.fn(),
    getOwnerProfile: jest.fn(),
}));

// Mock authenticateToken from authUtility.js
jest.mock('../../server/utils/authUtility', () => ({
    authenticateToken: jest.fn((req, res, next) => {
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = {
                userId: 'user-123',
                role: req.headers['x-test-user-role'] || 'guest'
            };
            next();
        } else {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        }
    }),
    generateToken: jest.fn(),
}));

// Mock the middleware BEFORE requiring the routes
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        // Since authenticateToken already set up the user, just pass through
        next();
    }),
    // authorize is not used in these routes based on the snippet, so no need to mock explicitly unless routes file requires it
}));

// --- Require modules AFTER mocks ---
const usersRoutes = require('../../server/routes/usersRoutes'); // Adjust path if needed
const usersController = require('../../server/controllers/usersController'); // Get the mocked controller
const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware'); // Get the mocked middleware
const { authenticateToken: mockedAuthenticateToken } = require('../../server/utils/authUtility'); // Get the mocked authenticateToken

// --- Test Application Setup ---
const app = express();
app.use(express.json()); // Needed to parse JSON bodies

// Include session middleware if your actual 'authenticate' depends on session state
app.use(session({
    secret: 'test-secret-key', // Use a consistent secret for testing
    resave: false,
    saveUninitialized: false, // Usually false for login sessions
    cookie: { secure: false } // Set secure: true if testing HTTPS
}));

// Mount the routes
app.use('/users', usersRoutes);

// --- Test Suite ---
describe('Users Routes (/users)', () => {
    const mockUserId = 'user-123';
    const mockUser = { userId: mockUserId, /* other user properties */ };
    let agent;

    beforeEach(() => {
        jest.clearAllMocks(); // Clear mocks between tests

        // Create a fresh agent for each test to avoid cookie/session interference
        agent = request.agent(app); // Use agent to handle cookies/session if needed by auth

        // Default implementations for controller methods
        usersController.getEmployeeProfile.mockImplementation((req, res) => {
            res.status(200).json({ userId: mockUserId, role: 'employee', name: 'Test Employee' });
        });
        
        usersController.getOwnerProfile.mockImplementation((req, res) => {
            res.status(200).json({ userId: mockUserId, role: 'owner', name: 'Test Owner' });
        });

        // Default successful controller mocks (can be overridden)
        usersController.updateEmployeeProfile.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Employee profile updated successfully!' });
        });
        usersController.updateOwnerProfile.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Pet owner profile updated successfully!' });
        });
        usersController.changePassword.mockImplementation((req, res) => {
            res.status(200).json({ message: '✅ Password changed successfully!' });
        });
    });

    // --- Test GET /users/myAccount ---
    describe('GET /users/myAccount', () => {
        const path = '/users/myAccount';

        it('should get employee profile successfully (200 OK)', async () => {
            const response = await agent
                .get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'employee');

            expect(response.status).toBe(200);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.getEmployeeProfile).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent
                .get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).not.toHaveBeenCalled();
            expect(usersController.getEmployeeProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test GET /users/owner/myAccount ---
    describe('GET /users/owner/myAccount', () => {
        const path = '/users/owner/myAccount';

        it('should get owner profile successfully (200 OK)', async () => {
            const response = await agent
                .get(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'owner');

            expect(response.status).toBe(200);
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.getOwnerProfile).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent
                .get(path)
                .set('x-test-authenticated', 'false');

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).not.toHaveBeenCalled();
            expect(usersController.getOwnerProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test PUT /users/update-employee-profile ---
    describe('PUT /users/update-employee-profile', () => {
        const path = '/users/update-employee-profile';
        const employeeData = {
            firstname: 'Jane',
            lastname: 'Doe',
            email: 'jane.doe@example.com',
            contact: '0987654321'
        };

        it('should update employee profile successfully (200 OK)', async () => {
            const response = await agent
                .put(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'employee')
                .send(employeeData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Employee profile updated successfully!' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateEmployeeProfile).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent
                .put(path)
                .set('x-test-authenticated', 'false')
                .send(employeeData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).not.toHaveBeenCalled();
            expect(usersController.updateEmployeeProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test PUT /users/update-petowner-profile ---
    describe('PUT /users/update-petowner-profile', () => {
        const path = '/users/update-petowner-profile';
        const ownerData = {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john.doe@example.com',
            contact: '1234567890',
            address: '456 Elm St',
            altperson: 'Jane Doe',
            altcontact: '1122334455'
        };

        it('should update pet owner profile successfully (200 OK)', async () => {
            const response = await agent
                .put(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'owner')
                .send(ownerData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Pet owner profile updated successfully!' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.updateOwnerProfile).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent
                .put(path)
                .set('x-test-authenticated', 'false')
                .send(ownerData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).not.toHaveBeenCalled();
            expect(usersController.updateOwnerProfile).not.toHaveBeenCalled();
        });
    });

    // --- Test POST /users/change-password ---
    describe('POST /users/change-password', () => {
        const path = '/users/change-password';
        const passwordData = {
            currentPassword: 'oldpassword',
            newPassword: 'newpassword',
            confirmNewPassword: 'newpassword'
        };

        it('should change password successfully (200 OK)', async () => {
            const response = await agent
                .post(path)
                .set('x-test-authenticated', 'true')
                .set('x-test-user-role', 'employee')
                .send(passwordData);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: '✅ Password changed successfully!' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
            expect(usersController.changePassword).toHaveBeenCalledTimes(1);
        });

        it('should require authentication (401 Unauthorized)', async () => {
            const response = await agent
                .post(path)
                .set('x-test-authenticated', 'false')
                .send(passwordData);

            expect(response.status).toBe(401);
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
            expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockedAuthenticate).not.toHaveBeenCalled();
            expect(usersController.changePassword).not.toHaveBeenCalled();
        });

        // Optional: Add test for password mismatch if validation is in controller
        // (Depends on how usersController.changePassword is implemented)
        // it('should return error if new passwords do not match (e.g., 400 Bad Request)', async () => {
        //     usersController.changePassword.mockImplementationOnce((req, res) => {
        //         res.status(400).json({ error: 'New passwords do not match' });
        //     });
        //
        //     const badPasswordData = { ...passwordData, confirmNewPassword: 'differentpassword' };
        //     const response = await agent
        //         .post(path)
        //         .set('x-test-authenticated', 'true')
        //         .set('x-test-user-role', 'employee')
        //         .send(badPasswordData);
        //
        //     expect(response.status).toBe(400);
        //     expect(response.body).toEqual({ error: 'New passwords do not match' });
        //     expect(mockedAuthenticateToken).toHaveBeenCalledTimes(1);
        //     expect(mockedAuthenticate).toHaveBeenCalledTimes(1);
        //     expect(usersController.changePassword).toHaveBeenCalledTimes(1);
        // });
    });
});