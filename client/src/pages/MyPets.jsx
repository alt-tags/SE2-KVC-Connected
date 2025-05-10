"use client";

import { Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import "../css/PatientDirectory.css";

export default function MyPets() {
  const navigate = useNavigate();
  const [originalPets, setOriginalPets] = useState([]);
  const [pets, setPets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const recordsPerPage = 9; // Number of records per page

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
    const triggerAutoArchive = async () => {
      try {
        await fetch("http://localhost:5000/pets/auto-archive", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        console.log("Auto archive triggered.");
      } catch (error) {
        console.error("Error triggering auto archive:", error);
      }
    };

    triggerAutoArchive();
  }, []);

  useEffect(() => {
    const handleBackButton = () => {
      if (
        window.location.pathname === "/login" ||
        window.location.pathname === "/signup-petowner-petinfo" ||
        window.location.pathname === "/signup-petowner"
      ) {
        logout();
      }
    };

    window.onpopstate = handleBackButton;

    return () => {
      window.onpopstate = null;
    };
  }, [logout]);

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
          console.warn(
            "Session expired (401 Unauthorized) during password change. Logging out..."
          );
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

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = pets.slice(indexOfFirstRecord, indexOfLastRecord);

  const totalPages = Math.ceil(pets.length / recordsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

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
              const filteredPets = originalPets.filter(
                (pet) =>
                  pet.pet_name.toLowerCase().includes(searchTerm) ||
                  pet.species.toLowerCase().includes(searchTerm)
              );
              setPets(filteredPets);
              setCurrentPage(1);
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
              {currentRecords.map((pet, index) => (
                <tr
                  key={pet.pet_id}
                  className={index % 2 === 0 ? "row-even" : "row-odd"}
                >
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

      {/* Pagination Controls */}
      <div className="pagination-controls">
        <button
          className="pagination-button"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="pagination-button"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
