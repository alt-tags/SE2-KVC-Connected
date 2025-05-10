"use client";

import { Search, Archive, Eye, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import "../css/PatientDirectory.css";
import { useConfirmDialog } from "../contexts/ConfirmDialogContext";
import FilterModal from "../components/FilterPopup";

export default function PatientDirectory() {
  const { showConfirmDialog } = useConfirmDialog();
  const navigate = useNavigate();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [originalPatients, setOriginalPatients] = useState([]);
  const [patients, setPatients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const recordsPerPage = 9; // Number of records per page

  const logout = useCallback(async () => {
    console.log("Attempting logout due to session issue...");
    try {
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error during server logout request:", error);
    } finally {
      console.log("Redirecting to /login");
      navigate("/login", { replace: true });
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
        window.location.pathname === "/signup-employee" ||
        window.location.pathname === "/signup-employee-accesscode"
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
    const fetchActivePets = async () => {
      try {
        const response = await fetch("http://localhost:5000/pets/active", {
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
          throw new Error("Failed to fetch active pets");
        }

        const data = await response.json();
        console.log("Fetched active pets:", data);

        // Update state with fetched data
        setOriginalPatients(data);
        setPatients(data);
      } catch (error) {
        console.error("Error fetching active pets:", error);
      }
    };

    fetchActivePets();
  }, [logout]);

  const handleArchive = (petId) => {
    showConfirmDialog(
      "Are you sure you want to archive this pet?",
      async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/pets/archive/${petId}`,
            {
              method: "PUT",
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
            throw new Error("Failed to archive pet.");
          }

          const data = await response.json();
          console.log(data.message);

          // Update the patients list to remove the archived pet
          setPatients((prevPatients) =>
            prevPatients.filter((patient) => patient.pet_id !== petId)
          );
          setOriginalPatients((prevPatients) =>
            prevPatients.filter((patient) => patient.pet_id !== petId)
          );
        } catch (error) {
          console.error("Error archiving pet:", error);
        }
      }
    );
  };

  const handleViewProfile = (patientId) => {
    console.log("Navigating to PetProfile with patientId:", patientId);
    navigate(`/PetProfile/${patientId}`);
  };

  const applyFilters = (filters) => {
    setActiveFilters(filters);

    // Call the search and filter function with the selected filters
    searchAndFilterPets({
      pet_id: filters.idFrom || undefined,
      min_id: filters.idFrom || undefined,
      max_id: filters.idTo || undefined,
      pet_name: filters.petName || undefined,
      owner_name: filters.ownerName || undefined,
      species: filters.species || undefined,
      sort_by: filters.sortBy
        ? filters.sortBy === "petName"
          ? "pet_name"
          : "owner_name"
        : undefined,
      sort_order: filters.sortBy
        ? filters.sortOrder === "ascending"
          ? "asc"
          : "desc"
        : undefined,
    });
  };

  const resetFilters = () => {
    setActiveFilters(null);
    setPatients(originalPatients);
  };

  const searchAndFilterPets = async (filters) => {
    try {
      const queryParams = new URLSearchParams();

      // Add filters to query parameters
      if (filters.search) queryParams.append("search", filters.search); // General search
      if (filters.pet_id) queryParams.append("pet_id", filters.pet_id);
      if (filters.pet_name) queryParams.append("pet_name", filters.pet_name);
      if (filters.owner_name)
        queryParams.append("owner_name", filters.owner_name);
      if (filters.species) queryParams.append("species", filters.species);
      if (filters.sort_by) queryParams.append("sort_by", filters.sort_by);
      if (filters.sort_order)
        queryParams.append("sort_order", filters.sort_order);
      if (filters.min_id) queryParams.append("min_id", filters.min_id);
      if (filters.max_id) queryParams.append("max_id", filters.max_id);

      const response = await fetch(
        `http://localhost:5000/pets/search-pets?${queryParams.toString()}`,
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
        throw new Error("Failed to search and filter pets");
      }

      const data = await response.json();
      console.log("Search and filter results:", data);

      // Update the patients state with the filtered data
      setPatients(data);
    } catch (error) {
      console.error("Error searching and filtering pets:", error);
    }
  };

  // Pagination logic
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = patients.slice(indexOfFirstRecord, indexOfLastRecord);

  const totalPages = Math.ceil(patients.length / recordsPerPage);

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

  return (
    <div className="patient-directory">
      <div className="directory-header">
        <h2>Patient Directory</h2>
        <div className="search-container">
          <Search className="search-icon" />
          <input
            type="text"
            placeholder="Search..."
            className="search-input"
            onChange={(e) => searchAndFilterPets({ search: e.target.value })} // Use the "search" parameter
          />
          <button
            className={`filter-button ${activeFilters ? "active" : ""}`}
            onClick={() => setIsFilterModalOpen(true)}
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Pet ID</th>
                <th>Pet Name</th>
                <th>Pet Owner</th>
                <th>Species</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((patient, index) => (
                <tr
                  key={patient.pet_id}
                  className={index % 2 === 0 ? "row-even" : "row-odd"}
                >
                  <td>{patient.pet_id}</td>
                  <td>{patient.pet_name}</td>
                  <td>{patient.owner_name || "N/A"}</td>
                  <td>{patient.species || "N/A"}</td>
                  <td className="actions">
                    <Archive
                      size={16}
                      onClick={() => handleArchive(patient.pet_id)}
                      style={{ cursor: "pointer" }}
                    />
                    <Eye
                      size={18}
                      className="view-profile"
                      onClick={() => handleViewProfile(patient.pet_id)}
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

      <FilterModal
        type="patient"
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
      />
    </div>
  );
}
