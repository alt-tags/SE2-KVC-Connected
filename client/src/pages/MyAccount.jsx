"use client";

import { useState, useEffect, useCallback } from "react";
import AccountPage from "./AccountPage";
import "../css/AddNewPet.css"; // Import for error message styling
import { useConfirmDialog } from "../contexts/ConfirmDialogContext";
import { useNavigate } from "react-router-dom";

const MyAccount = () => {
  const [displayData, setDisplayData] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { showConfirmDialog } = useConfirmDialog();
  const [validationErrors, setValidationErrors] = useState({
    firstname: "",
    lastname: "",
    email: "",
    contact: "",
  });

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
    const fetchUserData = async () => {
      try {
        const response = await fetch("http://localhost:5000/user/myAccount", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
          console.warn(
            "Session expired (401 Unauthorized) during password change. Logging out..."
          );
          await logout(); // Call logout function
          return; // Stop further processing in this function
        }

        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        console.log("Fetched user data:", data);

        setDisplayData({
          firstname: data.firstname,
          lastname: data.lastname,
          role: data.role,
          email: data.email,
          contact: data.contact,
        });
        setEditData({
          firstname: data.firstname,
          lastname: data.lastname,
          role: data.role,
          email: data.email,
          contact: data.contact,
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [logout]);

  const validateFields = (data) => {
    const errors = {
      firstname: "",
      lastname: "",
      email: "",
      contact: "",
    };
    let isValid = true;

    if (!data.firstname || data.firstname.trim() === "") {
      errors.firstname = "First Name is required";
      isValid = false;
    }

    if (!data.lastname || data.lastname.trim() === "") {
      errors.lastname = "Last Name is required";
      isValid = false;
    }

    if (!data.email || data.email.trim() === "") {
      errors.email = "Email is required";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSave = async (updatedData) => {
    if (!validateFields(updatedData)) {
      return; // Stop submission if validation fails
    }

    showConfirmDialog("Do you want to save your changes?", async () => {
      try {
        const backendData = {
          firstname: updatedData.firstname,
          lastname: updatedData.lastname,
          email: updatedData.email,
          contact: updatedData.contact,
          role: updatedData.role,
        };

        const response = await fetch(
          "http://localhost:5000/user/update-employee-profile",
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updatedData),
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
          throw new Error("Failed to save user data");
        }

        const data = await response.json();
        console.log("Backend user data:", data);

        const frontendData = {
          firstname: data.firstname || updatedData.firstname,
          lastname: data.lastname || updatedData.lastname,
          role: data.role || updatedData.role,
          email: data.email || updatedData.email,
          contact: updatedData.contact,
        };

        setDisplayData(frontendData);
        setEditData(frontendData);
        setIsEditing(false);
        console.log("Edit mode exited");
      } catch (error) {
        console.error("Error saving user data:", error);
        alert("Failed to save user data. Please try again.");
      }
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <AccountPage
      title="My Account"
      displayData={displayData}
      initialUserData={editData}
      isEditing={isEditing}
      setIsEditing={setIsEditing}
      onSave={handleSave}
    >
      {({ isEditing, userData, displayData, handleInputChange }) => (
        <div className="info-grid clinician-grid">
          <div className="info-column">
            <div className="info-group">
              <label>
                First Name{isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.firstname && (
                  <span className="error-message-pet">
                    {validationErrors.firstname}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstname"
                  value={userData.firstname}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear validation error
                    if (validationErrors.firstname) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        firstname: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.firstname
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">{userData.firstname}</div>
              )}
            </div>
            <div className="info-group">
              <label>
                Last Name{isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.lastname && (
                  <span className="error-message-pet">
                    {validationErrors.lastname}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastname"
                  value={userData.lastname}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear validation error
                    if (validationErrors.lastname) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        lastname: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.lastname ? "input-error-pet" : "info-input"
                  }
                />
              ) : (
                <div className="info-value">{userData.lastname}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>
                Email{isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.email && (
                  <span className="error-message-pet">
                    {validationErrors.email}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={userData.email}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear validation error
                    if (validationErrors.email) {
                      setValidationErrors((prev) => ({ ...prev, email: "" }));
                    }
                  }}
                  className={
                    validationErrors.email ? "input-error-pet" : "info-input"
                  }
                />
              ) : (
                <div className="info-value">{userData.email}</div>
              )}
            </div>
            <div className="info-group">
              <label>Contact Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="contact"
                  value={userData.contact}
                  onChange={handleInputChange}
                  className="info-input"
                />
              ) : (
                <div className="info-value">{userData.contact || "N/A"}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </AccountPage>
  );
};

export default MyAccount;
