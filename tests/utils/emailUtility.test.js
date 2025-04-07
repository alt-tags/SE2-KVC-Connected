// tests/utils/emailUtility.test.js
const { sendEmail } = require('../../server/utils/emailUtility'); // Adjust path if needed
const nodemailer = require('nodemailer'); // Require after mock

// --- Mock Setup ---
const mockSendMail = jest.fn();

// Mock nodemailer *before* requiring it
jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockImplementation(() => ({
        sendMail: mockSendMail,
    })),
}));

// --- Test Data ---
const testTo = 'recipient@example.com';
const testSubject = 'Test Email Subject';
const testBody = 'This is the test email body.';
const testUser = 'test_user@gmail.com';
const testPass = 'test_password';

describe('sendEmail Function', () => {
    // Store original env vars
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Restore original environment variables and then set for the test
        // This prevents env variable pollution between tests
        process.env = { ...originalEnv };
        process.env.EMAIL_USER = testUser;
        process.env.EMAIL_PASS = testPass;

        // Mock console.error for tests that check it
        jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error output during tests unless needed
    });

    afterEach(() => {
         // Restore console.error
         console.error.mockRestore();
    });

    // Restore original env after all tests in this suite
    afterAll(() => {
        process.env = originalEnv;
    });


    test('should call createTransport with correct service and auth', async () => {
        // Arrange: Mock sendMail to simulate success
        mockSendMail.mockResolvedValue({ response: '250 OK: Mock success' });

        // Act
        await sendEmail(testTo, testSubject, testBody);

        // Assert
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
        expect(nodemailer.createTransport).toHaveBeenCalledWith({
            service: 'gmail',
            auth: {
                user: testUser,
                pass: testPass,
            },
        });
        // Check that sendMail was also called as expected in this flow
        expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    test('should call sendMail with correct mail options', async () => {
        // Arrange
        mockSendMail.mockResolvedValue({ response: '250 OK' });

        // Act
        await sendEmail(testTo, testSubject, testBody);

        // Assert
        expect(mockSendMail).toHaveBeenCalledTimes(1); // Ensure it was called
        expect(mockSendMail).toHaveBeenCalledWith({
            // --- FIX: Use the correct "from" name ---
            from: `"Kho Veterinary Clinic Support" <${testUser}>`,
            to: testTo,
            subject: testSubject,
            text: testBody,
        });
    });

     test('should log error and not call transporter/sendMail if EMAIL_USER is missing', async () => {
        // Arrange
        delete process.env.EMAIL_USER; // Simulate missing variable
        // console.error is already mocked in beforeEach

        // Act
        await sendEmail(testTo, testSubject, testBody);

        // Assert
        // --- FIX: Now this expectation should pass because we added the check in sendEmail ---
        expect(console.error).toHaveBeenCalledTimes(1); // Check it was called
        expect(console.error).toHaveBeenCalledWith("Error sending email: EMAIL_USER or EMAIL_PASS environment variables not set.");
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
        expect(mockSendMail).not.toHaveBeenCalled();
    });

    test('should log error and not call transporter/sendMail if EMAIL_PASS is missing', async () => {
        // Arrange
        delete process.env.EMAIL_PASS; // Simulate missing variable
        // console.error is already mocked in beforeEach

        // Act
        await sendEmail(testTo, testSubject, testBody);

        // Assert
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith("Error sending email: EMAIL_USER or EMAIL_PASS environment variables not set.");
        expect(nodemailer.createTransport).not.toHaveBeenCalled();
        expect(mockSendMail).not.toHaveBeenCalled();
    });

     test('should log error if sendMail fails', async () => {
        // Arrange
        const sendMailError = new Error('Failed to send');
        mockSendMail.mockRejectedValue(sendMailError); // Simulate sendMail failure
        // console.error is already mocked in beforeEach

        // Act
        await sendEmail(testTo, testSubject, testBody);

        // Assert
        expect(nodemailer.createTransport).toHaveBeenCalledTimes(1); // Transport is created
        expect(mockSendMail).toHaveBeenCalledTimes(1); // sendMail is attempted
        expect(console.error).toHaveBeenCalledTimes(1); // Error should be logged
        // Check that the catch block logs the correct message structure
        expect(console.error).toHaveBeenCalledWith("Error sending email:", sendMailError);
    });

});