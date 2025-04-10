"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import "../css/AccountPage.css";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "../contexts/ConfirmDialogContext";

const AccountPage = ({
  title,
  displayData,
  initialUserData,
  isEditing,
  setIsEditing,
  onSave,
  onCancelEdit,
  children,
}) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [userData, setUserData] = useState(initialUserData);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const { showConfirmDialog } = useConfirmDialog();
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    console.log("Attempting logout due to session issue...");
    try {
      // Optional: Inform the backend about the logout attempt
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during server logout request:", error);
      // Proceed with client-side logout even if server request fails
    } finally {
      console.log("Redirecting to /login");
      navigate("/login", { replace: true }); // Use replace to prevent going back to the expired page
    }
  }, [navigate]);

  useEffect(() => {
    console.log("AccountPage - displayData updated:", displayData);
  }, [displayData]);

  useEffect(() => {
    console.log("AccountPage - initialUserData updated:", initialUserData);
    setUserData(initialUserData);
  }, [initialUserData]);

  const handleEdit = () => {
    console.log("AccountPage - Entering edit mode");
    setIsEditing(true);
    setUserData(initialUserData);
  };

  const handleCancel = () => {
    console.log("AccountPage - Canceling edit mode");
    setUserData(initialUserData);
    if (onCancelEdit) {
      onCancelEdit();
    } else {
      setIsEditing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`AccountPage - Input changed: ${name} = ${value}`);
    setUserData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (passwordError[name]) {
      setPasswordError((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleCancelPasswordChange = () => {
    // Reset password data
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    // Clear all password errors
    setPasswordError({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    // Exit password change mode
    setIsChangingPassword(false);
  };

  const validatePasswordFields = () => {
    const errors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    let isValid = true;

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const passwordRequirementsMessage =
      "Password must be 8+ chars with uppercase, lowercase, number, & special char (@$!%*?&).";

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current Password is required";
      isValid = false;
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New Password is required";
      isValid = false;
    } else if (!passwordRegex.test(passwordData.newPassword)) {
      // <-- The new check
      errors.newPassword = passwordRequirementsMessage; // Set the specific error
      isValid = false;
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Confirm Password is required";
      isValid = false;
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setPasswordError(errors);
    return isValid;
  };

  const handleSavePassword = async () => {
    if (!validatePasswordFields()) {
      return;
    }

    showConfirmDialog(
      "Do you want to save your password changes?",
      savePasswordChanges
    );
  };

  const savePasswordChanges = async () => {
    try {
      console.log("Password Data:", passwordData);

      const response = await fetch(
        "http://localhost:5000/user/change-password",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(passwordData),
        }
      );

      if (response.status === 401) {
        console.warn(
          "Session expired (401 Unauthorized) during password change. Logging out..."
        );
        await logout(); // Call logout function
        return; // Stop further processing in this function
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend Error:", errorData);
        // Handle specific backend errors
        if (errorData.error && errorData.error.includes("current password")) {
          setPasswordError((prev) => ({
            ...prev,
            currentPassword: "Current password is incorrect",
          }));
          return;
        }

        throw new Error(errorData.error || "Failed to change password");
      }

      const data = await response.json();
      console.log("Password changed successfully:", data);

      setIsChangingPassword(false);

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordError({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordError(
        error.message || "Failed to change password. Please try again."
      );
    }
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <h1>{title}</h1>

        <div className="profile-container">
          <div className="profile-section">
            <div className="avatar-container">
              <div className="avatar-placeholder"></div>
              <h2>{`${displayData?.firstname || ""} ${
                displayData?.lastname || ""
              }`}</h2>
              <p className="role">{displayData?.role || ""}</p>
            </div>

            <div className="info-section">
              {!isChangingPassword && (
                <>
                  <div className="info-card">
                    <div className="card-header">
                      <h3>Personal Information</h3>
                      {isEditing ? (
                        <div className="action-buttons">
                          <button
                            className="save-profile-btn"
                            onClick={() => onSave(userData)}
                          >
                            Save
                          </button>
                          <button
                            className="cancel-profile-btn"
                            onClick={handleCancel}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="edit-profile-btn"
                          onClick={handleEdit}
                        >
                          Edit Profile
                        </button>
                      )}
                    </div>

                    {children({
                      isEditing,
                      userData,
                      displayData,
                      handleInputChange,
                    })}
                  </div>

                  <div className="info-card">
                    <div className="card-header">
                      <h3>Password</h3>
                      <button
                        className={
                          isEditing ? "change-btn disabled" : "change-btn"
                        }
                        onClick={() =>
                          !isEditing && setIsChangingPassword(true)
                        }
                        disabled={isEditing}
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isChangingPassword && (
                <div className="info-card full-width">
                  <div className="card-header">
                    <h3>Change Password</h3>
                  </div>
                  <div className="password-change-section">
                    <div className="password-group">
                      <label>
                        Current Password<span className="required">*</span>
                        {passwordError.currentPassword && (
                          <span className="error-message-pet">
                            {passwordError.currentPassword}
                          </span>
                        )}
                      </label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className={
                            passwordError.currentPassword
                              ? "input-error-pet"
                              : "password-input"
                          }
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("current")}
                        >
                          {showPasswords.current ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="password-group">
                      <label>
                        New Password<span className="required">*</span>
                        {passwordError.newPassword && (
                          <span className="error-message-pet">
                            {passwordError.newPassword}
                          </span>
                        )}
                      </label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className={
                            passwordError.newPassword
                              ? "input-error-pet"
                              : "password-input"
                          }
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("new")}
                        >
                          {showPasswords.new ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="password-group">
                      <label>
                        Confirm Password<span className="required">*</span>
                        {passwordError.confirmPassword && (
                          <span className="error-message-pet">
                            {passwordError.confirmPassword}
                          </span>
                        )}
                      </label>
                      <div className="password-input-container">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={
                            passwordError.confirmPassword
                              ? "input-error-pet"
                              : "password-input"
                          }
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => togglePasswordVisibility("confirm")}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="password-actions">
                      <button
                        className="save-changes-btn"
                        onClick={handleSavePassword}
                      >
                        Save
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={handleCancelPasswordChange}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
