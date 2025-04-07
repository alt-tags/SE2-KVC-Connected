const path = require("path");
// Load env vars FIRST
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Mock dependencies
jest.mock("../../server/models/userModel");
jest.mock("../../server/config/db", () => ({ db: jest.fn(), dbConfig: {} }), { virtual: true });
jest.mock("jsonwebtoken", () => ({ sign: jest.fn().mockReturnValue("mock-token") }));
jest.mock("../../server/utils/authUtility", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token")
}));


// Dynamic Requires
let authController;
let UserModel;
let bcrypt;
let jwt;
let authUtility;

describe("AuthController", () => {
  let req, res;
  let bcryptCompareSpy;
  let jwtSignSpy;

  const mockEmail = "test@example.com";
  const mockPassword = "password";
  const mockHashedPassword = "hashedPassword";
  const mockCaptchaInput = "correctCaptcha";
  const mockUserId = 123;
  const mockUserRole = "admin";
  const mockToken = "mock-token";

  beforeEach(() => {
    jest.resetModules();

    jest.doMock("jsonwebtoken", () => ({ sign: jest.fn().mockReturnValue(mockToken) }));

    authController = require("../../server/controllers/authController");
    UserModel = require("../../server/models/userModel");
    bcrypt = require("bcryptjs");
    jwt = require("jsonwebtoken");
    authUtility = require("../../server/utils/authUtility");

    jest.clearAllMocks();

    req = { body: {}, session: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    bcryptCompareSpy = jest.spyOn(bcrypt, "compare");
    jwtSignSpy = jwt.sign;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("loginUser", () => {
    const mockUser = {
      user_id: mockUserId,
      user_role: mockUserRole,
      user_password: mockHashedPassword,
    };

    const mockUserModelFind = (userToReturn) => {
      UserModel.findByEmail.mockImplementation(async () => userToReturn);
    };

    const mockUserModelFindReject = (error) => {
      UserModel.findByEmail.mockImplementation(async () => {
        throw error;
      });
    };

    it("should login user successfully with correct credentials", async () => {
      req.body = { email: mockEmail, password: mockPassword, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser);
      bcryptCompareSpy.mockResolvedValue(true);

      const generateTokenSpy = jest.spyOn(authController, "generateToken").mockReturnValue(mockToken);

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).toHaveBeenCalledWith(mockPassword, mockHashedPassword);
      expect(res.cookie).toHaveBeenCalledWith("token", mockToken, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({
        message: "✅ Login successful!",
        role: mockUserRole,
        redirectUrl: "/patients",
      });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 401 for incorrect CAPTCHA", async () => {
      req.body = { email: mockEmail, password: mockPassword, captchaInput: "wrongCaptcha" };
      req.session.captcha = "correctCaptcha";

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).not.toHaveBeenCalled();
      expect(bcryptCompareSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "❌ Incorrect CAPTCHA",
        newCaptcha: expect.any(Object),
      });
      expect(req.session.captcha).not.toBe("correctCaptcha"); // Ensure CAPTCHA is updated
    });

    it("should return 401 for non-existent email", async () => {
      req.body = { email: "nonexistent@example.com", password: mockPassword, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(null);

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith("nonexistent@example.com");
      expect(bcryptCompareSpy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
        newCaptcha: expect.any(Object),
      });
      expect(req.session.captcha).not.toBe(mockCaptchaInput); // Ensure CAPTCHA is updated
    });

    it("should return 401 for incorrect password", async () => {
      req.body = { email: mockEmail, password: "wrongPassword", captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser);
      bcryptCompareSpy.mockResolvedValue(false);

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(bcryptCompareSpy).toHaveBeenCalledWith("wrongPassword", mockHashedPassword);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid email or password",
        newCaptcha: expect.any(Object),
      });
      expect(req.session.captcha).not.toBe(mockCaptchaInput); // Ensure CAPTCHA is updated
    });

    it("should return 500 if UserModel.findByEmail fails", async () => {
      req.body = { email: mockEmail, password: mockPassword, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFindReject(new Error("Database connection error"));

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "❌ Server error during login" });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 500 if bcrypt.compare fails", async () => {
      req.body = { email: mockEmail, password: mockPassword, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      mockUserModelFind(mockUser);
      bcryptCompareSpy.mockRejectedValue(new Error("Bcrypt error"));

      await authController.loginUser(req, res);

      expect(UserModel.findByEmail).toHaveBeenCalledWith(mockEmail);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "❌ Server error during login" });
      expect(req.session.captcha).toBeNull();
    });

    it("should return 400 when email is missing", async () => {
      req.body = { password: mockPassword, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email and password are required" });
    });

    it("should return 400 when password is missing", async () => {
      req.body = { email: mockEmail, captchaInput: mockCaptchaInput };
      req.session.captcha = mockCaptchaInput;

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Email and password are required" });
    });
  });

  describe("logoutUser", () => {
    it("should successfully logout user", async () => {
      req.session.destroy = jest.fn((cb) => cb(null)); // Mock successful session destruction

      await authController.logoutUser(req, res);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid", { path: "/" });
      expect(res.clearCookie).toHaveBeenCalledWith("token", { path: "/" });
      expect(res.json).toHaveBeenCalledWith({ message: "Logout successful" });
    });

    it("should handle logout errors gracefully", async () => {
      req.session.destroy = jest.fn((cb) => cb(new Error("Session destroy error"))); // Mock session destruction error

      await authController.logoutUser(req, res);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Logout failed" });
    });
  });

  describe("generateToken", () => {
    it("should generate valid JWT token", () => {
      const token = authUtility.generateToken(mockUserId, mockUserRole);

      expect(authUtility.generateToken).toHaveBeenCalledWith(
        mockUserId,
        mockUserRole
      );
      expect(token).toBe(mockToken);
    });
  });
});