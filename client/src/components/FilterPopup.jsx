"use client";

import { useState } from "react";
import { X } from "lucide-react";
import "../css/FilterModal.css";
import React from "react";
import ReactDOM from "react-dom";

const FilterModal = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  type = "patient",
}) => {
  const [filters, setFilters] = useState(
    type === "patient"
      ? {
          idFrom: "",
          idTo: "",
          sortBy: "",
          sortOrder: "ascending",
          species: "",
        }
      : {
          sortOrder: "newest",
          dateFrom: "",
          dateTo: "",
        }
  );

  const handleReset = () => {
    setFilters(
      type === "patient"
        ? {
            idFrom: "",
            idTo: "",
            sortBy: "",
            sortOrder: "ascending",
            species: "",
          }
        : {
            sortOrder: "newest",
            dateFrom: "",
            dateTo: "",
          }
    );
    onReset?.();
    onClose();
  };

  const handleApply = () => {
    const updatedFilters = { ...filters };

    if (filters.sortBy) {
      if (!filters.sortOrder) {
        updatedFilters.sortOrder = "ASC";
      }
    } else {
      if (updatedFilters.sortOrder) {
        if (updatedFilters.sortOrder === "oldest") {
          updatedFilters.sortOrder = "ASC";
        } else if (updatedFilters.sortOrder === "newest") {
          updatedFilters.sortOrder = "DESC";
        }
      } else {
        delete updatedFilters.sortOrder;
        delete updatedFilters.sortBy;
      }
    }

    onApply(updatedFilters);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="filter-modal-overlay">
      <div className={`filter-modal ${type}-filter`}>
        <button className="close-button" onClick={onClose} aria-label="close">
          <X size={20} />
        </button>
        <h2>Filters</h2>

        {type === "patient" ? (
          <>
            <div className="filter-section">
              <label>ID from</label>
              <div className="id-range">
                <input
                  type="text"
                  placeholder="From"
                  value={filters.idFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, idFrom: e.target.value })
                  }
                />
                <span>-</span>
                <input
                  type="text"
                  placeholder="To"
                  value={filters.idTo}
                  onChange={(e) =>
                    setFilters({ ...filters, idTo: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="filter-section">
              <div className="sort-options">
                <div className="sort-option">
                  <label>Pet Name</label>
                  <div className="sort-order">
                    <label>
                      <input
                        type="radio"
                        name="sortBy"
                        value="petName"
                        checked={
                          filters.sortBy === "petName" &&
                          filters.sortOrder === "ascending"
                        }
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            sortBy: "petName",
                            sortOrder: "ascending",
                          })
                        }
                      />
                      Ascending
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sortBy"
                        value="petName"
                        checked={
                          filters.sortBy === "petName" &&
                          filters.sortOrder === "descending"
                        }
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            sortBy: "petName",
                            sortOrder: "descending",
                          })
                        }
                      />
                      Descending
                    </label>
                  </div>
                </div>

                <div className="sort-option">
                  <label>Pet Owner</label>
                  <div className="sort-order">
                    <label>
                      <input
                        type="radio"
                        name="sortBy"
                        value="petOwner"
                        checked={
                          filters.sortBy === "petOwner" &&
                          filters.sortOrder === "ascending"
                        }
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            sortBy: "petOwner",
                            sortOrder: "ascending",
                          })
                        }
                      />
                      Ascending
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="sortBy"
                        value="petOwner"
                        checked={
                          filters.sortBy === "petOwner" &&
                          filters.sortOrder === "descending"
                        }
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            sortBy: "petOwner",
                            sortOrder: "descending",
                          })
                        }
                      />
                      Descending
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-section">
              <label>Species</label>
              <select
                value={filters.species}
                onChange={(e) =>
                  setFilters({ ...filters, species: e.target.value })
                }
              >
                <option value="">All Species</option>
                <option value="Dog">Dog (Standard)</option>
                <option value="Cat">Cat (Standard)</option>
                <option value="Snake">Snake (Exotic)</option>
                <option value="Turtle">Turtle (Exotic)</option>
                <option value="Bird">Bird (Exotic)</option>
                <option value="Rabbit">Rabbit (Exotic)</option>
                <option value="Lab Rat">Lab Rat (Exotic)</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="filter-section">
              <h3>Sort by</h3>
              <div className="sort-options">
                <label>
                  <input
                    type="radio"
                    name="sortOrder"
                    value="oldest"
                    checked={filters.sortOrder === "oldest"}
                    onChange={(e) =>
                      setFilters({ ...filters, sortOrder: e.target.value })
                    }
                  />
                  Oldest
                </label>
                <label>
                  <input
                    type="radio"
                    name="sortOrder"
                    value="newest"
                    checked={filters.sortOrder === "newest"}
                    onChange={(e) =>
                      setFilters({ ...filters, sortOrder: e.target.value })
                    }
                  />
                  Newest
                </label>
              </div>
            </div>

            <div className="filter-section">
              <h3>Date Range</h3>
              <div className="date-range">
                <div className="date-input-container">
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                    placeholder="From"
                    className="date-input"
                  />
                  <span className="date-placeholder">From</span>
                </div>
                <span>-</span>
                <div className="date-input-container">
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                    placeholder="To"
                    className="date-input"
                  />
                  <span className="date-placeholder">To</span>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="filter-actions">
          <button className="reset-button" onClick={handleReset}>
            Reset
          </button>
          <button className="apply-button" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default FilterModal;
