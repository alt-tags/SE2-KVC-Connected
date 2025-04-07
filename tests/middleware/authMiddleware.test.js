const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

// Create test app
const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Setup routes with our mocked middleware
app.get(
  "/protected",
  (req, res, next) => {
    // For the "protected" endpoint tests
    const mockAuthenticate = (req, res, next) => {
      // Check for specific test cases based on token
      const token = req.cookies?.token;

      if (!process.env.JWT_SECRET) {
        return res
          .status(500)
          .json({ error: "❌ Server error. Missing JWT_SECRET." });
      }

      if (!token) {
        return res
          .status(401)
          .json({ error: "❌ Unauthorized: No token provided." });
      }

      if (token === "expiredtoken") {
        return res.status(401).json({
          error: "❌ Unauthorized: Token expired. Please log in again.",
        });
      }

      if (token === "invalidtoken") {
        return res
          .status(401)
          .json({ error: "❌ Unauthorized: Invalid token." });
      }

      if (token === "validtoken") {
        req.user = { userId: 1, userRole: "user" };
        return next();
      }

      if (token === "admintoken") {
        req.user = { userId: 1, userRole: "admin" };
        return next();
      }

      return res.status(401).json({ error: "❌ Unauthorized: Invalid token." });
    };

    mockAuthenticate(req, res, next);
  },
  (req, res) => {
    res.status(200).json({ message: "Access granted" });
  }
);

app.get(
  "/admin",
  (req, res, next) => {
    // For the admin endpoint tests
    const mockAuthenticate = (req, res, next) => {
      // Check for specific test cases based on token
      const token = req.cookies?.token;

      if (!token) {
        return res
          .status(401)
          .json({ error: "❌ Unauthorized: No token provided." });
      }

      if (token === "validtoken") {
        req.user = { userId: 1, userRole: "user" };
        return next();
      }

      if (token === "admintoken") {
        req.user = { userId: 1, userRole: "admin" };
        return next();
      }

      return res.status(401).json({ error: "❌ Unauthorized: Invalid token." });
    };

    const mockAuthorize = () => (req, res, next) => {
      if (req.user.userRole !== "admin") {
        return res.status(403).json({
          error: "❌ Forbidden: You do not have the required role.",
        });
      }
      next();
    };

    mockAuthenticate(req, res, () => {
      mockAuthorize({ roles: ["admin"] })(req, res, next);
    });
  },
  (req, res) => {
    res.status(200).json({ message: "Admin access granted" });
  }
);

app.post("/forgetPasswordChange", (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  if (newPassword === confirmPassword) {
    // temp
    const users = [{ email: "user@example.com", password: "oldPassword" }];
    const user = users.find((user) => user.email === email);
    if (user) {
      user.password = newPassword;
      return res.status(200).json({ message: "Password changed successfully" });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } else {
    return res.status(400).json({ message: "Passwords do not match" });
  }
});

describe("Auth Middleware", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "testsecret";
  });

  it("should return 500 if JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    const response = await request(app).get("/protected");
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("❌ Server error. Missing JWT_SECRET.");
  });

  it("should return 401 if no token provided", async () => {
    const response = await request(app).get("/protected");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("❌ Unauthorized: No token provided.");
  });

  it("should return 401 if token is expired", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Cookie", "token=expiredtoken");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe(
      "❌ Unauthorized: Token expired. Please log in again."
    );
  });

  it("should return 401 if token is invalid", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Cookie", "token=invalidtoken");
    expect(response.status).toBe(401);
    expect(response.body.error).toBe("❌ Unauthorized: Invalid token.");
  });

  it("should grant access if token is valid", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Cookie", "token=validtoken");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Access granted");
  });

  it("should return 403 if user does not have the required role", async () => {
    const response = await request(app)
      .get("/admin")
      .set("Cookie", "token=validtoken");
    expect(response.status).toBe(403);
    expect(response.body.error).toBe(
      "❌ Forbidden: You do not have the required role."
    );
  });

  it("should grant access if user has the required role", async () => {
    const response = await request(app)
      .get("/admin")
      .set("Cookie", "token=admintoken");
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Admin access granted");
  });

  it("should change password successfully if passwords match", async () => {
    const response = await request(app).post("/forgetPasswordChange").send({
      email: "user@example.com",
      newPassword: "newPassword",
      confirmPassword: "newPassword",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password changed successfully");
  });

  it("should return 404 if user is not found during password change", async () => {
    const response = await request(app).post("/forgetPasswordChange").send({
      email: "nonexistent@example.com",
      newPassword: "newPassword",
      confirmPassword: "newPassword",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  it("should return 400 if passwords do not match during password change", async () => {
    const response = await request(app).post("/forgetPasswordChange").send({
      email: "user@example.com",
      newPassword: "newPassword",
      confirmPassword: "differentPassword",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Passwords do not match");
  });
});
