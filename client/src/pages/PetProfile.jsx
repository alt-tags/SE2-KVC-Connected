"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import "../css/PetProfile.css";
import VisitHistory from "./VisitHistory";
import { useConfirmDialog } from "../contexts/ConfirmDialogContext";
import { calculateAge } from "../components/DateCalculator";
import { useUserRole } from "../contexts/UserRoleContext";
import { useNavigate } from "react-router-dom";
import VaccinationRecord from "./VaccinationRecord";

export default function PetProfile() {
  const { pet_id } = useParams();
  const { hasPermission } = useUserRole();
  const { showConfirmDialog } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [editedPetData, setEditedPetData] = useState({});
  const [petData, setPetData] = useState(null);
  const [nameError, setNameError] = useState("");
  const [birthdayError, setBirthdayError] = useState("");

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
    if (activeTab !== "profile" && isEditing) {
      setIsEditing(false);
      setEditedPetData({});
      setNameError("");
      setBirthdayError("");
    }
  }, [activeTab, isEditing]);

  const fetchVaccinationRecords = useCallback(
    async (petId) => {
      try {
        const response = await fetch(
          `http://localhost:5000/vax/pets/${petId}/viewVaccines`,
          {
            method: "GET",
            credentials: "include",
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
          throw new Error("Failed to fetch vaccination records");
        }

        const data = await response.json();
        console.log("Fetched vaccination records:", data);
        setVaccinations(data);
      } catch (error) {
        console.error("Error fetching vaccination records:", error);
      }
    },
    [logout]
  );

  useEffect(() => {
    const fetchPetData = async () => {
      try {
        console.log("Fetching pet data for pet_id:", pet_id);
        const response = await fetch(`http://localhost:5000/pets/${pet_id}`, {
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
          throw new Error("Failed to fetch pet data");
        }

        const data = await response.json();
        console.log("Fetched pet data:", data);

        const age = calculateAge(data.birthday);
        setPetData({ ...data, age });
        setVaccinations(data.vaccinations || []);
      } catch (error) {
        console.error("Error fetching pet data:", error);
      }
    };

    fetchPetData();
    fetchVaccinationRecords(pet_id);
  }, [pet_id, logout, fetchVaccinationRecords]);

  if (!petData) {
    return <div>Loading...</div>;
  }

  const handleEdit = async () => {
    if (!hasPermission("canEditPetProfile")) return;

    let formattedBirthday = petData.birthday;

    if (petData.birthday) {
      try {
        const originalDate = new Date(petData.birthday);
        const year = originalDate.getFullYear();
        const month = String(originalDate.getMonth() + 1).padStart(2, "0");
        const day = String(originalDate.getDate()).padStart(2, "0");

        formattedBirthday = `${year}-${month}-${day}`;

        console.log("Original birthday:", petData.birthday);
        console.log("Formatted birthday for edit:", formattedBirthday);
      } catch (error) {
        console.error("Error formatting birthday:", error);
      }
    }

    setIsEditing(true);

    setEditedPetData({
      name: petData.name,
      species: petData.species,
      breed: petData.breed,
      gender: petData.gender,
      birthday: formattedBirthday,
      age: petData.age,
      color: petData.color,
      status: petData.status === 1 ? "Alive" : "Deceased",
    });
  };

  const fetchUpdatedPetData = async () => {
    try {
      console.log("Fetching updated pet data after save...");
      const response = await fetch(`http://localhost:5000/pets/${pet_id}`, {
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
        throw new Error("Failed to fetch updated pet data");
      }

      const data = await response.json();
      console.log("Fetched updated pet data:", data);
      console.log("Updated species from server:", data.species);

      // Calculate age
      const age = calculateAge(data.birthday);

      // Reset the UI with data from server
      setPetData({ ...data, age });
      setEditedPetData({});
    } catch (error) {
      console.error("Error fetching updated pet data:", error);
    }
  };

  const handleSave = async () => {
    console.log("Save button clicked");

    // Validate name field
    if (!editedPetData.name || editedPetData.name.trim() === "") {
      setNameError("Name is required");
      return;
    }

    // Check for birthday errors
    if (birthdayError) {
      return;
    }

    // Show confirmation dialog before saving
    showConfirmDialog("Do you want to save your changes?", async () => {
      try {
        const updatedData = {
          ...petData,
          ...editedPetData,
        };

        console.log("Original pet species:", petData.species);
        console.log("Edited pet species:", editedPetData.species);
        console.log("Final data to save:", updatedData);

        const age = calculateAge(updatedData.birthday);
        updatedData.age_year = age.years;
        updatedData.age_month = age.months;

        const statusValue = updatedData.status === "Alive" ? 1 : 0;

        // Map species description to spec_id
        const speciesMap = {
          "Dog (Standard)": 1,
          "Cat (Standard)": 2,
          "Snake (Exotic)": 3,
          "Turtles (Exotic)": 4,
          "Birds (Exotic)": 5,
          "Rabbit (Exotic)": 6,
          "Lab Rat (Exotic)": 7,
          Others: 8,
        };
        const specId = speciesMap[updatedData.species] || 1;
        console.log(
          "Species mapping - Description:",
          updatedData.species,
          "ID:",
          specId
        );

        const requestBody = {
          pet_name: updatedData.name,
          // Send both speciesDescription and spec_id to ensure proper updating
          speciesDescription: updatedData.species,
          spec_id: specId,
          pet_breed: updatedData.breed,
          pet_gender: updatedData.gender,
          pet_birthday: updatedData.birthday,
          pet_age_month: updatedData.age_month,
          pet_age_year: updatedData.age_year,
          pet_color: updatedData.color,
          pet_status: statusValue,
        };

        console.log("Sending request body:", requestBody);

        const response = await fetch(
          `http://localhost:5000/pets/edit/${pet_id}`,
          {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
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
          throw new Error("Failed to update pet profile");
        }

        const data = await response.json();
        console.log("Pet profile updated:", data);

        // Force a small delay to ensure DB updates are complete
        //setTimeout(() => {
        fetchUpdatedPetData();
        setIsEditing(false);
        setNameError("");
        //}, 500)
      } catch (error) {
        console.error("Error updating pet profile:", error);
      }
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedPetData({});
    setNameError("");
    setBirthdayError("");
  };

  const validateBirthday = (date) => {
    const selectedDate = new Date(date);
    const currentDate = new Date();

    // Reset the time portion to compare just the dates
    selectedDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);

    if (selectedDate > currentDate) {
      return "Future dates not allowed";
    }
    return "";
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    // Clear name error when typing in the name field
    if (name === "name") {
      if (!value || value.trim() === "") {
        setNameError("Name is required");
      } else {
        setNameError("");
      }
    }

    // Validate birthday when changed
    if (name === "birthday") {
      const error = validateBirthday(value);
      setBirthdayError(error);
    }

    setEditedPetData((prev) => {
      const updatedData = {
        ...prev,
        [name]: type === "radio" ? e.target.id : value,
      };
      if (name === "birthday") {
        const newAge = calculateAge(value);
        updatedData.age = newAge;
      }
      return updatedData;
    });
  };

  return (
    <div className="pet-profile-page">
      <div className="tabs">
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          Pet Profile
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          Visit History
        </button>
      </div>

      <div className="content-area">
        {activeTab === "profile" ? (
          <div className="profile-content">
            <div className="pet-details">
              <div className="section-header">
                <h2>Pet Profile</h2>
                {hasPermission("canEditPetProfile") && !isEditing && (
                  <button className="edit-button" onClick={handleEdit}>
                    <Pencil size={16} />
                  </button>
                )}
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <label>ID</label>
                  <span>{petData.pet_id}</span>
                </div>
                <div className="detail-item">
                  <label className={isEditing ? "required-field" : ""}>
                    Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        name="name"
                        value={editedPetData.name || ""}
                        onChange={handleInputChange}
                      />
                    </>
                  ) : (
                    <span>{petData.name}</span>
                  )}
                  {isEditing && nameError && (
                    <div className="error-message-profile">{nameError}</div>
                  )}
                </div>
                <div className="detail-item">
                  <label className={isEditing ? "required-field" : ""}>
                    Species
                  </label>
                  {isEditing ? (
                    <select
                      name="species"
                      value={editedPetData.species || ""}
                      onChange={handleInputChange}
                    >
                      <option value="Dog (Standard)">Dog (Standard)</option>
                      <option value="Cat (Standard)">Cat (Standard)</option>
                      <option value="Snake (Exotic)">Snake (Exotic)</option>
                      <option value="Turtles (Exotic)">Turtles (Exotic)</option>
                      <option value="Birds (Exotic)">Birds (Exotic)</option>
                      <option value="Rabbit (Exotic)">Rabbit (Exotic)</option>
                      <option value="Lab Rat (Exotic)">Lab Rat (Exotic)</option>
                      <option value="Others">Others</option>
                    </select>
                  ) : (
                    <span>{petData.species}</span>
                  )}
                </div>
                <div className="detail-item">
                  <label>Breed</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="breed"
                      value={editedPetData.breed || ""}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <span>{petData.breed}</span>
                  )}
                </div>
                <div className="detail-item">
                  <label className={isEditing ? "required-field" : ""}>
                    Gender
                  </label>
                  {isEditing ? (
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name="gender"
                          id="Male"
                          checked={
                            editedPetData.gender === "Male" ||
                            editedPetData.gender === "male"
                          }
                          onChange={handleInputChange}
                        />
                        Male
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="gender"
                          id="Female"
                          checked={
                            editedPetData.gender === "Female" ||
                            editedPetData.gender === "female"
                          }
                          onChange={handleInputChange}
                        />
                        Female
                      </label>
                    </div>
                  ) : (
                    <span>
                      {typeof petData.gender === "string"
                        ? petData.gender.charAt(0).toUpperCase() +
                          petData.gender.slice(1)
                        : petData.gender}
                    </span>
                  )}
                </div>
                <div className="detail-item">
                  <label>Birthday</label>
                  {isEditing ? (
                    <>
                      <input
                        type="date"
                        name="birthday"
                        value={editedPetData.birthday || ""}
                        onChange={handleInputChange}
                        className={birthdayError ? "input-error-pet" : ""}
                      />
                      {birthdayError && (
                        <div className="error-message-profile">
                          {birthdayError}
                        </div>
                      )}
                    </>
                  ) : (
                    <span>
                      {new Date(petData.birthday).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="detail-item">
                  <label>Age</label>
                  <span>
                    <span className="age-unit">Years</span>
                    <span className="age-value">
                      {isEditing ? editedPetData.age.years : petData.age.years}
                    </span>
                    <span className="age-unit">Months</span>
                    <span className="age-value">
                      {isEditing
                        ? editedPetData.age.months
                        : petData.age.months}
                    </span>
                  </span>
                </div>
                <div className="detail-item">
                  <label>Color</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="color"
                      value={editedPetData.color || ""}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <span>{petData.color}</span>
                  )}
                </div>
                <div className="detail-item">
                  <label className={isEditing ? "required-field" : ""}>
                    Status
                  </label>
                  {isEditing ? (
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          name="status"
                          id="Alive"
                          checked={editedPetData.status === "Alive"}
                          onChange={handleInputChange}
                        />
                        Alive
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="status"
                          id="Deceased"
                          checked={editedPetData.status === "Deceased"}
                          onChange={handleInputChange}
                        />
                        Deceased
                      </label>
                    </div>
                  ) : (
                    <span>
                      {petData.status === 1 || petData.status === "1"
                        ? "Alive"
                        : "Deceased"}
                    </span>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="edit-actions">
                  <button className="save-button" onClick={handleSave}>
                    Save
                  </button>
                  <button className="cancell-button" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              )}

              {hasPermission("canViewContactInfo") && (
                <>
                  <h3 className="contact-header">Contact Details</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Owner</label>
                      <span>{petData.owner_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Email</label>
                      <span>{petData.email}</span>
                    </div>
                    <div className="detail-item">
                      <label>Contact no.</label>
                      <span>{petData.contact}</span>
                    </div>
                    <div className="detail-item">
                      <label>Address</label>
                      <span>{petData.address}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="separator"></div>
            <VaccinationRecord
              pet_id={pet_id}
              hasPermission={hasPermission}
              currentSpecies={
                isEditing ? editedPetData.species : petData.species
              }
            />
          </div>
        ) : (
          <div className="history-content">
            <VisitHistory />
          </div>
        )}
      </div>
    </div>
  );
}
