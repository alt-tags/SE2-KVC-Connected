const request = require('supertest');
const express = require('express');
const session = require('express-session');
// Leave requires for modules to be mocked or used directly here
const { authenticate } = require('../../server/middleware/authMiddleware'); // Adjust path

// --- Mocking Dependencies ---

// ⭐ Mock the controller using an explicit factory function ⭐
jest.mock('../../server/controllers/authController', () => ({
    // Define ALL functions exported by the actual controller as jest.fn()
    getCaptcha: jest.fn(),
    loginUser: jest.fn(),
    signupPetOwnerStep1: jest.fn(),
    signupPetOwnerStep2: jest.fn(),
    signupEmployeeRequest: jest.fn(),
    signupEmployeeComplete: jest.fn(),
    logoutUser: jest.fn(),
    // Add any other functions if the real controller exports more
}));

// Mock the middleware
jest.mock('../../server/middleware/authMiddleware', () => ({
    authenticate: jest.fn((req, res, next) => {
        if (req.headers['x-test-authenticated'] === 'true') {
            req.user = { id: 'test-user-id', role: 'test-role' };
            next();
        } else if (req.headers['x-test-authenticated'] === 'false') {
            res.status(401).json({ error: 'Authentication required (mocked)' });
        } else {
            next(); // Default pass-through if header not set
        }
    }),
}));

// Mock the DB
jest.mock('../../server/config/db', () => ({
    db: {
        query: jest.fn().mockResolvedValue([[], {}]),
        execute: jest.fn().mockResolvedValue([[], {}]),
        getConnection: jest.fn().mockResolvedValue({
            query: jest.fn().mockResolvedValue([[], {}]),
            execute: jest.fn().mockResolvedValue([[], {}]),
            release: jest.fn(),
        }),
        pool: {
            getConnection: jest.fn().mockResolvedValue({
                query: jest.fn().mockResolvedValue([[], {}]),
                execute: jest.fn().mockResolvedValue([[], {}]),
                release: jest.fn(),
            }),
        }
    },
}));

// --- NOW require the modules that use the mocks ---
const authRoutes = require('../../server/routes/authRoutes');
// Get the *mocked* controller reference AFTER mocking it
const authController = require('../../server/controllers/authController');

// --- Test Application Setup ---
const app = express();
app.use(express.json());
app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Middleware needed for captcha test session setting
// (Keep this if you use the x-test-set-captcha header method)
app.use((req, res, next) => {
    if (req.headers['x-test-set-captcha']) {
        req.session.captcha = req.headers['x-test-set-captcha'];
        // Ensure session is saved before proceeding
        // Add error handling for save
        req.session.save(err => {
            if (err) {
                console.error("Test session save error:", err);
                return next(err); // Pass error to Express handler
            }
            next();
        });
        return; // Don't proceed further in this middleware stack for this specific path
    }
    next();
});


// Mount the authentication routes
app.use('/auth', authRoutes);


// --- Test Suite ---
describe('Authentication Routes (/auth)', () => {
    let agent;

    // Apply beforeEach to the top-level describe
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Re-apply default mock implementations for controller methods
        // Use the reference obtained AFTER mocking
        authController.getCaptcha.mockImplementation((req, res) => res.status(200).json({ message: 'Captcha served (mocked)' }));
        authController.loginUser.mockImplementation((req, res) => res.status(200).json({ message: 'Login successful (mocked)' }));
        authController.signupPetOwnerStep1.mockImplementation((req, res) => res.status(200).json({ message: 'Signup step 1 successful (mocked)' }));
        authController.signupPetOwnerStep2.mockImplementation((req, res) => res.status(200).json({ message: 'Signup step 2 successful (mocked)' }));
        authController.signupEmployeeRequest.mockImplementation((req, res) => res.status(200).json({ message: 'Employee signup request successful (mocked)' }));
        authController.signupEmployeeComplete.mockImplementation((req, res) => res.status(200).json({ message: 'Employee signup complete successful (mocked)' }));
        authController.logoutUser.mockImplementation((req, res) => res.status(200).json({ message: 'Logout successful (mocked)' }));

        // Create a new agent for each test
        agent = request.agent(app);
    });


    // --- Test /captcha/verify ---
    // ⭐ Describe block is NOW correctly placed ⭐
    describe('POST /auth/captcha/verify', () => {
        const captchaText = 'ABCDE';

        it('should return 200 and success message for correct CAPTCHA', async () => {
            // Set captcha in session via header
            await agent.get('/auth/captcha').set('x-test-set-captcha', captchaText); // Use any endpoint to establish session and set

            // Verify captcha
            const verifyResponse = await agent
               .post('/auth/captcha/verify')
               .send({ captchaResponse: captchaText });

           expect(verifyResponse.status).toBe(200);
           expect(verifyResponse.body).toEqual({ message: '✅ CAPTCHA verified!' });
        });

        it('should return 400 if CAPTCHA response is missing', async () => {
            const response = await agent
                .post('/auth/captcha/verify')
                .send({}); // Missing captchaResponse

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Missing CAPTCHA response.' });
        });

        it('should return 400 if session expired (no CAPTCHA in session)', async () => {
            // Make request without setting captcha in session first
            const response = await agent // Use a fresh agent if previous tests might have set session
                .post('/auth/captcha/verify')
                .send({ captchaResponse: 'anything' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'Session expired. Please refresh CAPTCHA.' });
        });

        it('should return 400 for incorrect CAPTCHA', async () => {
            // Set the captcha via header again
            await agent.get('/auth/captcha').set('x-test-set-captcha', captchaText);

            // Now verify with the wrong code
            const verifyResponse = await agent
               .post('/auth/captcha/verify')
               .send({ captchaResponse: 'WRONG' }); // Send incorrect captcha

            expect(verifyResponse.status).toBe(400);
            expect(verifyResponse.body).toEqual({ error: '❌ Incorrect CAPTCHA!' });
        });
    });

    // --- Test /captcha ---
    describe('GET /auth/captcha', () => {
        it('should call authController.getCaptcha and return 200', async () => {
            const response = await agent.get('/auth/captcha');

            expect(response.status).toBe(200);
            // Check the mock function obtained AFTER mocking
            expect(authController.getCaptcha).toHaveBeenCalledTimes(1);
            expect(response.body).toEqual({ message: 'Captcha served (mocked)' });
        });
    });

    // --- Test /login ---
    describe('POST /auth/login', () => {
        it('should call authController.loginUser and return 200', async () => {
            const loginCredentials = { email: 'test@test.com', password: 'password' };
            const response = await agent.post('/auth/login').send(loginCredentials);

            expect(response.status).toBe(200);
            expect(authController.loginUser).toHaveBeenCalledTimes(1);
            expect(authController.loginUser).toHaveBeenCalledWith(
                expect.objectContaining({ body: loginCredentials }),
                expect.anything(),
                expect.anything()
            );
            expect(response.body).toEqual({ message: 'Login successful (mocked)' });
        });
    });

    // --- Test Pet Owner Signup ---
    describe('POST /auth/signup/petowner-step1', () => {
        it('should call authController.signupPetOwnerStep1 and return 200', async () => {
            const step1Data = { email: 'owner@test.com' };
            const response = await agent.post('/auth/signup/petowner-step1').send(step1Data);

            expect(response.status).toBe(200);
            expect(authController.signupPetOwnerStep1).toHaveBeenCalledTimes(1);
            expect(authController.signupPetOwnerStep1).toHaveBeenCalledWith(expect.objectContaining({ body: step1Data }), expect.anything(), expect.anything());
            expect(response.body).toEqual({ message: 'Signup step 1 successful (mocked)' });
        });
    });

    describe('POST /auth/signup/petowner-step2', () => {
        it('should call authController.signupPetOwnerStep2 and return 200', async () => {
            const step2Data = { token: 'some-token', password: 'password' };
            const response = await agent.post('/auth/signup/petowner-step2').send(step2Data);

            expect(response.status).toBe(200);
            expect(authController.signupPetOwnerStep2).toHaveBeenCalledTimes(1);
            expect(authController.signupPetOwnerStep2).toHaveBeenCalledWith(expect.objectContaining({ body: step2Data }), expect.anything(), expect.anything());
            expect(response.body).toEqual({ message: 'Signup step 2 successful (mocked)' });
        });
    });

    // --- Test Employee Signup ---
    describe('POST /auth/signup/employee', () => {
        it('should call authController.signupEmployeeRequest and return 200', async () => {
            const empData = { email: 'employee@test.com', role: 'clinician' };
            const response = await agent.post('/auth/signup/employee').send(empData);

            expect(response.status).toBe(200);
            expect(authController.signupEmployeeRequest).toHaveBeenCalledTimes(1);
            expect(authController.signupEmployeeRequest).toHaveBeenCalledWith(expect.objectContaining({ body: empData }), expect.anything(), expect.anything());
            expect(response.body).toEqual({ message: 'Employee signup request successful (mocked)' });
        });
    });

    describe('POST /auth/signup/employee-verify', () => {
        it('should call authController.signupEmployeeComplete and return 200', async () => {
            const verifyData = { token: 'verify-token', password: 'password' };
            const response = await agent.post('/auth/signup/employee-verify').send(verifyData);

            expect(response.status).toBe(200);
            expect(authController.signupEmployeeComplete).toHaveBeenCalledTimes(1);
            expect(authController.signupEmployeeComplete).toHaveBeenCalledWith(expect.objectContaining({ body: verifyData }), expect.anything(), expect.anything());
            expect(response.body).toEqual({ message: 'Employee signup complete successful (mocked)' });
        });
    });

    // --- Test /logout ---
    describe('POST /auth/logout', () => {
        it('should call authenticate middleware, then authController.logoutUser and return 200 if authenticated', async () => {
             // We need the mocked authenticate function from the middleware mock
             const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware');
            const response = await agent
                .post('/auth/logout')
                .set('x-test-authenticated', 'true')
                .send();

            expect(response.status).toBe(200);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1); // Check authenticate middleware mock
            expect(authController.logoutUser).toHaveBeenCalledTimes(1);
            expect(response.body).toEqual({ message: 'Logout successful (mocked)' });
        });

        it('should call authenticate middleware and return 401 if not authenticated', async () => {
            const { authenticate: mockedAuthenticate } = require('../../server/middleware/authMiddleware');
            const response = await agent
                .post('/auth/logout')
                .set('x-test-authenticated', 'false')
                .send();

            expect(response.status).toBe(401);
            expect(mockedAuthenticate).toHaveBeenCalledTimes(1); // Authenticate middleware mock
            expect(authController.logoutUser).not.toHaveBeenCalled();
            expect(response.body).toEqual({ error: 'Authentication required (mocked)' });
        });
    });
    // --- End of Test Suite ---
}); // End top-level describe