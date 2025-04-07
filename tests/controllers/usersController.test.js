const request = require("supertest");
const express = require("express");
// const session = require("express-session");
const usersController = require("../../server/controllers/usersController");
const UserModel = require("../../server/models/userModel");
const {
  hashPassword,
  comparePassword,
} = require("../../server/utils/passwordUtility");
const db = require("../../server/config/db"); // <--- Added import for db connection

// --- Mock Middleware ---
// Mock the entire module containing the authenticate middleware
jest.mock("../../server/middleware/authMiddleware", () => ({
  authenticate: jest.fn((req, res, next) => {
    if (req.headers['x-test-authenticated-user-id']) {
      req.user = { userId: parseInt(req.headers['x-test-authenticated-user-id'], 10) };
    }
    next(); // Proceed to the next middleware or route handler
  }),
}));
// --- End Mock Middleware ---

jest.mock("../../server/models/userModel");
jest.mock("../../server/utils/passwordUtility");

const app = express();
app.use(express.json());
// Remove session if not needed by auth middleware being tested
// app.use(
//   session({
//     secret: "testsecret",
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// Mount routes *after* mocking middleware if needed, although usually order doesn't matter for mocks like this
app.put("/users/employee/profile", usersController.updateEmployeeProfile);
app.put("/users/owner/profile", usersController.updateOwnerProfile);
app.post("/users/change-password", usersController.changePassword);

describe("Users Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock function's call history etc. if needed
    require('../../server/middleware/authMiddleware').authenticate.mockClear();
  });

  // **** Added afterAll Hook ****
  afterAll(async () => {
    // Close the database connection pool
    if (db && db.end) { // Check if db object and end method exist
      await db.end();
      console.log("Database pool closed for tests."); // Optional: confirm closure
    }
  });
  // **** End afterAll Hook ****

  // --- Employee Profile Tests ---
  it("should update employee profile successfully", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John",
      user_lastname: "Doe",
      user_email: "john.doe@example.com",
      user_contact: "1234567890",
    });

    UserModel.updateEmployeeProfile.mockResolvedValue({
      user_firstname: "Jane",
      user_lastname: "Doe",
      user_email: "jane.doe@example.com",
      user_contact: "0987654321",
      user_role: "employee", // Assuming a role exists
    });

    const response = await request(app)
      .put("/users/employee/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane",
        lastname: "Doe",
        email: "jane.doe@example.com",
        contact: "0987654321",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      firstname: "Jane",
      lastname: "Doe",
      email: "jane.doe@example.com",
      contact: "0987654321",
      role: "employee", // Adjust if role isn't returned or needed
    });

    expect(UserModel.updateEmployeeProfile).toHaveBeenCalledWith(
      1,
      "Jane",
      "Doe",
      "jane.doe@example.com",
      "0987654321"
    );
  });

  it("should return error if server error occurs while updating employee profile", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John", // ... other fields
    });
    UserModel.updateEmployeeProfile.mockRejectedValue(
      new Error("Database connection failed") // Simulate DB error
    );

    const response = await request(app)
      .put("/users/employee/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane", // ... other fields (make sure enough valid fields are sent if controller has validation)
        lastname: "Doe",
        email: "jane.error@example.com",
        contact: "111222333",
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("❌ Server error while updating profile.");
  });

  // --- Owner Profile Tests ---
  it("should update owner profile successfully", async () => {
    UserModel.getUserById.mockResolvedValue({
      user_id: 1,
      user_firstname: "John", // ... other fields
    });
    UserModel.getOwnerByUserId.mockResolvedValue({
      owner_address: "123 Main St", // ... other fields
    });
    UserModel.updateOwnerProfile.mockResolvedValue();

    const response = await request(app)
      .put("/users/owner/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        firstname: "Jane",
        lastname: "Doe",
        email: "jane.doe@example.com",
        contact: "0987654321",
        address: "456 Elm St",
        altperson: "John Smith",
        altcontact: "1122334455",
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
      "✅ Pet owner profile updated successfully!"
    );
    expect(UserModel.updateOwnerProfile).toHaveBeenCalledWith(
      1,
      "Jane",
      "Doe",
      "jane.doe@example.com",
      "0987654321",
      "456 Elm St",
      "John Smith",
      "1122334455",
      null,
      null
    );
  });

  it("should return error if server error occurs while updating owner profile", async () => {
    UserModel.getUserById.mockResolvedValue({ user_id: 1 });
    UserModel.getOwnerByUserId.mockResolvedValue({ owner_address: "123 Main St" });
    UserModel.updateOwnerProfile.mockRejectedValue(new Error("Server error")); // Simulate server error

    const response = await request(app)
      .put("/users/owner/profile")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({ // Ensure valid data is sent to pass controller validation first
        firstname: "Jane",
        lastname: "Doe",
        email: "jane.doe.server.error@example.com",
        contact: "0987654321",
        address: "456 Elm St",
        altperson: "John Smith",
        altcontact: "1122334455",
      });

    expect(response.status).toBe(500); // Ensure the status code is 500
    expect(response.body.error).toBe("❌ Server error while updating profile."); // Ensure the error message matches
  });

  // --- Change Password Tests ---
  // Inside the "should change password successfully" test (around line 203)
  it("should change password successfully", async () => {
    UserModel.getPasswordById.mockResolvedValue("hashedpassword");
    comparePassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("newhashedpassword");
    UserModel.updatePassword.mockResolvedValue();

    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1")
      .send({
        currentPassword: "oldpassword",
        // --- FIX: Use a password that meets complexity rules ---
        newPassword: "ValidNewPass1!",
        confirmPassword: "ValidNewPass1!",
        // --- End FIX ---
      });

    expect(response.status).toBe(200); // Should now pass
    expect(response.body.message).toBe("✅ Password changed successfully!");
    expect(UserModel.getPasswordById).toHaveBeenCalledWith(1);
    expect(comparePassword).toHaveBeenCalledWith("oldpassword", "hashedpassword");
    // --- FIX: Expect hashPassword to be called with the valid password ---
    expect(hashPassword).toHaveBeenCalledWith("ValidNewPass1!");
    // --- End FIX ---
    expect(UserModel.updatePassword).toHaveBeenCalledWith(1, "newhashedpassword"); // Mock returns this, actual hash might differ
  });

  // Inside the "should return error if current password is incorrect" test (around line 224)
it("should return error if current password is incorrect", async () => {
  UserModel.getPasswordById.mockResolvedValue("hashedpassword");
  comparePassword.mockResolvedValue(false); // Simulate incorrect password

  const response = await request(app)
    .post("/users/change-password")
    .set("x-test-authenticated-user-id", "1")
    .send({
      currentPassword: "wrongpassword", // This is intended to be wrong
      // --- FIX: Use a password that meets complexity rules ---
      newPassword: "ValidNewPass1!",
      confirmPassword: "ValidNewPass1!",
      // --- End FIX ---
    });

  // --- FIX: Expect 401 as intended, now that validation passes ---
  expect(response.status).toBe(401);
  // --- End FIX ---
  expect(response.body.error).toBe("❌ Incorrect current password.");
  expect(UserModel.updatePassword).not.toHaveBeenCalled();
});

  it("should return error if new passwords do not match", async () => {
    // Mock necessary calls that happen before the mismatch check, if any
    UserModel.getPasswordById.mockResolvedValue("hashedpassword"); // Needed if check happens after DB call
    comparePassword.mockResolvedValue(true); // Assume current password check passes

    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "oldpassword",
        newPassword: "newpassword",
        confirmPassword: "differentpassword", // <--- FIX: Changed key name
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("❌ New passwords do not match!");
  });

  it("should return error if required fields are missing when changing password", async () => {
    const response = await request(app)
      .post("/users/change-password")
      .set("x-test-authenticated-user-id", "1") // Signal mock to add req.user
      .send({
        currentPassword: "oldpassword",
        newPassword: "newpassword", // Missing confirmPassword
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("❌ All fields are required!");
  });

}); // End describe block