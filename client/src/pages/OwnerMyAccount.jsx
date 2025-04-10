"use client";

import { useState, useEffect, useCallback } from "react";
import AccountPage from "./AccountPage";
import "../css/AccountPage.css";
import "../css/AddNewPet.css";
import { useConfirmDialog } from "../contexts/ConfirmDialogContext";
import { useNavigate } from "react-router-dom";

const OwnerMyAccount = () => {
  const [displayData, setDisplayData] = useState(null); // Initially null
  const [editData, setEditData] = useState(null); // Initially null
  const [isEditing, setIsEditing] = useState(false); // Track edit mode
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const { showConfirmDialog } = useConfirmDialog();
  const [validationErrors, setValidationErrors] = useState({
    firstname: "",
    lastname: "",
    email: "",
    contactNumber: "",
    address: "",
    emergencyPerson1: "",
    emergencyNumber1: "",
    emergencyPerson2: "",
    emergencyNumber2: "",
  });

  // Custom function to clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors({
      firstname: "",
      lastname: "",
      email: "",
      contactNumber: "",
      address: "",
      emergencyPerson1: "",
      emergencyNumber1: "",
      emergencyPerson2: "",
      emergencyNumber2: "",
    });
  };

  // Function to handle when editing is canceled
  const handleCancelEdit = () => {
    // Reset edit data to match display data
    setEditData({
      ...displayData,
    });

    // Clear all validation errors
    clearValidationErrors();

    // Exit edit mode
    setIsEditing(false);
  };

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/user/owner/myAccount",
          {
            method: "GET",
            credentials: "include", // Include cookies for authentication
            headers: {
              "Content-Type": "application/json",
            },
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
          throw new Error("Failed to fetch owner data");
        }

        const data = await response.json();
        console.log("Fetched owner data:", data);

        // Populate the display and edit states
        setDisplayData({
          firstname: data.firstname,
          lastname: data.lastname,
          role: "Pet Owner",
          email: data.email,
          contactNumber: data.contact,
          address: data.address,
          emergencyContact1: {
            person: data.altperson || "",
            number: data.altcontact || "",
          },
          emergencyContact2: {
            person: data.altperson2 || "",
            number: data.altcontact2 || "",
          },
        });

        setEditData({
          firstname: data.firstname,
          lastname: data.lastname,
          role: "Pet Owner",
          email: data.email,
          contactNumber: data.contact,
          address: data.address,
          emergencyContact1: {
            person: data.altperson || "",
            number: data.altcontact || "",
          },
          emergencyContact2: {
            person: data.altperson2 || "",
            number: data.altcontact2 || "",
          },
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching owner data:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchOwnerData();
  }, [logout]);

  const processEmergencyContacts = (data) => {
    const processedData = { ...data };

    // If emergency contact 1 is empty but emergency contact 2 has data
    if (
      !processedData.emergencyContact1.person &&
      !processedData.emergencyContact1.number &&
      (processedData.emergencyContact2.person ||
        processedData.emergencyContact2.number)
    ) {
      // Move emergency contact 2 data to emergency contact 1
      processedData.emergencyContact1 = { ...processedData.emergencyContact2 };
      processedData.emergencyContact2 = { person: "", number: "" };
    }

    // Clean up empty emergency contacts
    if (
      !processedData.emergencyContact1.person &&
      !processedData.emergencyContact1.number
    ) {
      processedData.emergencyContact1 = { person: "", number: "" };
    }
    if (
      !processedData.emergencyContact2.person &&
      !processedData.emergencyContact2.number
    ) {
      processedData.emergencyContact2 = { person: "", number: "" };
    }

    return processedData;
  };

  const validateFields = (data) => {
    const errors = {
      firstname: "",
      lastname: "",
      email: "",
      contactNumber: "",
      address: "",
      emergencyPerson1: "",
      emergencyNumber1: "",
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

    if (!data.contactNumber || data.contactNumber.trim() === "") {
      errors.contactNumber = "Contact Number is required";
      isValid = false;
    }

    if (!data.address || data.address.trim() === "") {
      errors.address = "Address is required";
      isValid = false;
    }

    if (
      !data.emergencyContact1.person ||
      data.emergencyContact1.person.trim() === ""
    ) {
      errors.emergencyPerson1 = "Emergency Contact Person 1 is required";
      isValid = false;
    }

    if (
      !data.emergencyContact1.number ||
      data.emergencyContact1.number.trim() === ""
    ) {
      errors.emergencyNumber1 = "Emergency Contact Number 1 is required";
      isValid = false;
    }

    // Emergency Contact 2 validation
    const hasPerson2 =
      data.emergencyContact2.person &&
      data.emergencyContact2.person.trim() !== "";
    const hasNumber2 =
      data.emergencyContact2.number &&
      data.emergencyContact2.number.trim() !== "";

    if (hasPerson2 && !hasNumber2) {
      errors.emergencyNumber2 =
        "Emergency Contact Number 2 is required if Person 2 is provided";
      isValid = false;
    }

    if (!hasPerson2 && hasNumber2) {
      errors.emergencyPerson2 =
        "Emergency Contact Person 2 is required if Number 2 is provided";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSave = async (updatedData) => {
    // Validate input fields
    const processedData = processEmergencyContacts(updatedData);

    // Validate all required fields
    if (!validateFields(processedData)) {
      return; // Stop submission if validation fails
    }

    // Show confirmation dialog
    showConfirmDialog("Do you want to save your changes?", () =>
      saveChanges(processedData)
    );
  };

  const saveChanges = async (processedData) => {
    // Check for empty or whitespace-only fields (except Emergency Contact 2 and Person 2)
    const requiredFields = [
      processedData.firstname,
      processedData.lastname,
      processedData.email,
      processedData.contactNumber,
      processedData.address,
      processedData.emergencyContact1.person,
      processedData.emergencyContact1.number,
    ];

    if (requiredFields.some((field) => !field || field.trim() === "")) {
      alert(
        "All fields except Emergency Contact 2 and Person 2 are required and cannot be empty."
      );
      return;
    }

    // Validate Emergency Contact 2 and Person 2
    const { person: person2, number: contact2 } =
      processedData.emergencyContact2;

    try {
      const response = await fetch(
        "http://localhost:5000/user/update-petowner-profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies for authentication
          body: JSON.stringify({
            firstname: processedData.firstname,
            lastname: processedData.lastname,
            email: processedData.email,
            contact: processedData.contactNumber,
            address: processedData.address,
            altperson: processedData.emergencyContact1.person,
            altcontact: processedData.emergencyContact1.number,
            altperson2: person2 || null, // Set to null if empty
            altcontact2: contact2 || null, // Set to null if empty
          }),
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
        throw new Error("Failed to update profile");
      }

      const result = await response.json();
      console.log("Profile updated successfully:", result);

      // Clear validation errors
      setValidationErrors({
        firstname: "",
        lastname: "",
        email: "",
        contactNumber: "",
        address: "",
        emergencyPerson1: "",
        emergencyNumber1: "",
        emergencyPerson2: "",
        emergencyNumber2: "",
      });

      setDisplayData(processedData); // Update the display data
      setEditData(processedData); // Update the edit data
      setIsEditing(false); // Exit edit mode
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setEditData((prevData) => {
      const keys = name.split(".");
      if (keys.length > 1) {
        return {
          ...prevData,
          [keys[0]]: {
            ...prevData[keys[0]],
            [keys[1]]: value,
          },
        };
      }
      return { ...prevData, [name]: value };
    });
    // Clear validation error when field is being edited
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
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
      onCancelEdit={handleCancelEdit}
    >
      {({ isEditing, userData, handleInputChange }) => (
        <div className="info-grid">
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
              <label>
                Contact Number{isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.contactNumber && (
                  <span className="error-message-pet">
                    {validationErrors.contactNumber}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="contactNumber"
                  value={userData.contactNumber}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear validation error
                    if (validationErrors.contactNumber) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        contactNumber: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.contactNumber
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">{userData.contactNumber}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>
                Address{isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.address && (
                  <span className="error-message-pet">
                    {validationErrors.address}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="address"
                  value={userData.address}
                  onChange={(e) => {
                    handleInputChange(e);
                    // Clear validation error
                    if (validationErrors.address) {
                      setValidationErrors((prev) => ({ ...prev, address: "" }));
                    }
                  }}
                  className={
                    validationErrors.address ? "input-error-pet" : "info-input"
                  }
                />
              ) : (
                <div className="info-value">{userData.address}</div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>
                Emergency Contact Person 1
                {isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.emergencyPerson1 && (
                  <span className="error-message-pet">
                    {validationErrors.emergencyPerson1}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="emergencyContact1.person"
                  value={userData.emergencyContact1.person}
                  onChange={(e) => {
                    handleInputChange({
                      target: {
                        name: "emergencyContact1",
                        value: {
                          ...userData.emergencyContact1,
                          person: e.target.value,
                        },
                      },
                    });
                    // Clear validation error
                    if (validationErrors.emergencyPerson1) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        emergencyPerson1: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.emergencyPerson1
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">
                  {userData.emergencyContact1.person || "Not provided"}
                </div>
              )}
            </div>
            <div className="info-group">
              <label>
                Emergency Contact Number 1
                {isEditing && <span className="required">*</span>}
                {isEditing && validationErrors.emergencyNumber1 && (
                  <span className="error-message-pet">
                    {validationErrors.emergencyNumber1}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="emergencyContact1.number"
                  value={userData.emergencyContact1.number}
                  onChange={(e) => {
                    handleInputChange({
                      target: {
                        name: "emergencyContact1",
                        value: {
                          ...userData.emergencyContact1,
                          number: e.target.value,
                        },
                      },
                    });
                    // Clear validation error
                    if (validationErrors.emergencyNumber1) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        emergencyNumber1: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.emergencyNumber1
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">
                  {userData.emergencyContact1.number || "Not provided"}
                </div>
              )}
            </div>
          </div>

          <div className="info-column">
            <div className="info-group">
              <label>
                Emergency Contact Person 2
                {isEditing && validationErrors.emergencyPerson2 && (
                  <span className="error-message-pet">
                    {validationErrors.emergencyPerson2}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="emergencyContact2.person"
                  value={userData.emergencyContact2.person}
                  onChange={(e) => {
                    handleInputChange({
                      target: {
                        name: "emergencyContact2",
                        value: {
                          ...userData.emergencyContact2,
                          person: e.target.value,
                        },
                      },
                    });
                    // Clear validation error
                    if (validationErrors.emergencyPerson2) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        emergencyPerson2: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.emergencyPerson2
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">
                  {userData.emergencyContact2.person || "Not provided"}
                </div>
              )}
            </div>
            <div className="info-group">
              <label>
                Emergency Contact Number 2
                {isEditing && validationErrors.emergencyNumber2 && (
                  <span className="error-message-pet">
                    {validationErrors.emergencyNumber2}
                  </span>
                )}
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="emergencyContact2.number"
                  value={userData.emergencyContact2.number}
                  onChange={(e) => {
                    handleInputChange({
                      target: {
                        name: "emergencyContact2",
                        value: {
                          ...userData.emergencyContact2,
                          number: e.target.value,
                        },
                      },
                    });
                    // Clear validation error
                    if (validationErrors.emergencyNumber2) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        emergencyNumber2: "",
                      }));
                    }
                  }}
                  className={
                    validationErrors.emergencyNumber2
                      ? "input-error-pet"
                      : "info-input"
                  }
                />
              ) : (
                <div className="info-value">
                  {userData.emergencyContact2.number || "Not provided"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AccountPage>
  );
};

export default OwnerMyAccount;
