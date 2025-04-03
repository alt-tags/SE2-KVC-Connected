"use client";

import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import "../css/PatientDirectory.css";

export default function MyPets() {
  const navigate = useNavigate();
  const [originalPets, setOriginalPets] = useState([]);
  const [pets, setPets] = useState([]);

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
    const fetchMyPets = async () => {
      try {
        const response = await fetch("http://localhost:5000/pets/mypets", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401) {
            console.warn("Session expired (401 Unauthorized) during password change. Logging out...");
            await logout(); // Call logout function
            return; // Stop further processing in this function
          }

        if (!response.ok) {
          throw new Error("Failed to fetch my pets");
        }

        const data = await response.json();
        console.log("Fetched my pets:", data);

        // Update state with fetched data
        setOriginalPets(data);
        setPets(data);
      } catch (error) {
        console.error("Error fetching my pets:", error);
      }
    };

    fetchMyPets();
  }, [logout]);

  const handleViewProfile = (petId) => {
    console.log("Navigating to PetProfile with petId:", petId);
    navigate(`/PetProfile/${petId}`);
  };

  return (
    <div className="patient-directory">
      <div className="directory-header">
        <h2>My Pets</h2>
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
            onChange={(e) => {
              const searchTerm = e.target.value.toLowerCase();
              const filteredPets = originalPets.filter((pet) =>
                pet.pet_name.toLowerCase().includes(searchTerm) || pet.species.toLowerCase().includes(searchTerm)
              );
              setPets(filteredPets);
            }}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Pet ID</th>
                <th>Pet Name</th>
                <th>Species</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet, index) => (
                <tr key={pet.pet_id} className={index % 2 === 0 ? "row-even" : "row-odd"}>
                  <td>{pet.pet_id}</td>
                  <td>{pet.pet_name}</td>
                  <td>{pet.species}</td>
                  <td className="actions">
                    <ArrowRight
                      size={16}
                      className="view-profile"
                      onClick={() => handleViewProfile(pet.pet_id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

