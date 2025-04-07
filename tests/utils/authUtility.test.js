const jwt = require("jsonwebtoken");
const { generateToken } = require("../../server/utils/authUtility");

describe("generateToken Utility", () => { // Renamed describe block to match test output
  const OLD_ENV = process.env;
  const MOCK_USER_ID = "testUser123"; // Changed mock ID slightly from output example
  const MOCK_ROLE = "admin";
  const MOCK_SECRET = "test-secret-key-should-be-longer-and-random";

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.JWT_SECRET = MOCK_SECRET;
    // Use fake timers for tests that depend on time
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });


  it("should generate a non-empty string token", () => {
    const token = generateToken(MOCK_USER_ID, MOCK_ROLE);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should create a token that can be verified with the same secret", () => {
    const token = generateToken(MOCK_USER_ID, MOCK_ROLE);

    // Wrap verification in expect().not.toThrow() or try/catch
    expect(() => {
      jwt.verify(token, MOCK_SECRET);
    }).not.toThrow();
  });

  it("should include the correct userId and role in the token payload", () => {
    const token = generateToken(MOCK_USER_ID, MOCK_ROLE);
    const decoded = jwt.verify(token, MOCK_SECRET); // Verify and decode

    expect(decoded).toHaveProperty("userId", MOCK_USER_ID);
    expect(decoded).toHaveProperty("role", MOCK_ROLE);
  });

  it("should include standard JWT claims like 'iat' (issued at) and 'exp' (expiration time)", () => {
    const token = generateToken(MOCK_USER_ID, MOCK_ROLE);
    const decoded = jwt.verify(token, MOCK_SECRET);

    expect(decoded).toHaveProperty("iat");
    expect(typeof decoded.iat).toBe("number"); // Should be a timestamp

    expect(decoded).toHaveProperty("exp");
    expect(typeof decoded.exp).toBe("number"); // Should be a timestamp
  });

  it("should set the expiration time to 15 minutes from the issue time", () => {
    const token = generateToken(MOCK_USER_ID, MOCK_ROLE);
    const decoded = jwt.verify(token, MOCK_SECRET);

    const issueTime = decoded.iat;
    const expiryTime = decoded.exp;
    const expectedDurationSeconds = 15 * 60; // 15 minutes

    expect(expiryTime - issueTime).toBe(expectedDurationSeconds);
  });

  it("should throw an error if JWT_SECRET environment variable is not set", () => {
    // Store the original value if it exists, otherwise undefined
    const originalSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET; // Simulate missing secret

    try {
      // Expect the function call to throw an error
      expect(() => {
        generateToken(MOCK_USER_ID, MOCK_ROLE);
      }).toThrow("secretOrPrivateKey must have a value"); // <-- Corrected message
    } finally {
      // IMPORTANT: Restore the secret *after* the test, even if it fails
      // Handle case where originalSecret might have been undefined initially
      if (originalSecret !== undefined) {
        process.env.JWT_SECRET = originalSecret;
      } else {
        // If it was truly deleted, ensure it remains deleted
        // (though beforeEach should handle this on the next run)
        delete process.env.JWT_SECRET;
      }
    }
  });

  it('should generate different tokens for different inputs or times', () => {
    // Set a specific start time
    jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));

    const token1 = generateToken(MOCK_USER_ID, MOCK_ROLE);

    // Advance time by more than a second to ensure 'iat' changes
    jest.advanceTimersByTime(1001); // Advance by 1.001 seconds

    const token2 = generateToken(MOCK_USER_ID, MOCK_ROLE);
    const token3 = generateToken('anotherUser', 'clinician');

    expect(token1).not.toBe(token2); // Tokens should differ due to 'iat'/'exp' changing
    expect(token1).not.toBe(token3); // Tokens should differ due to payload change
    expect(token2).not.toBe(token3);
  });
});