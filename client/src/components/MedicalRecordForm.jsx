"use client";

import { useEffect } from "react";
import "../css/MedicalRecordForm.css";
import { Eye, Trash2 } from "lucide-react";

// Helper function to format dates as MM/DD/YYYY
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

const MedicalRecordForm = ({
  formData,
  isEditing,
  isDiagnosisLocked,
  onInputChange,
  onUnlockDiagnosis,
  isAddRecord,
  errors,
}) => {
  const renderField = (label, name, type = "text", options = {}) => {
    const value = formData[name];
    const { isFullWidth, isRequired, selectOptions } = options;

    let input;
    if (type === "select") {
      input = (
        <select
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          disabled={!isEditing}
          className={isEditing ? "editable-value" : ""}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    } else if (type === "radio") {
      input = (
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              id={`${name}-true`}
              name={name}
              value="true"
              checked={value === true}
              onChange={() => onInputChange({ target: { name, value: true } })}
              disabled={!isEditing}
            />
            Yes
          </label>
          <label className="radio-label">
            <input
              type="radio"
              id={`${name}-false`}
              name={name}
              value="false"
              checked={value === false}
              onChange={() => onInputChange({ target: { name, value: false } })}
              disabled={!isEditing}
            />
            No
          </label>
        </div>
      );
    } else if (type === "file") {
      input = (
        <div className="file-upload-container">
          {isEditing && (
            <div className="custom-file-input">
              <input
                type="file"
                id={name}
                name={name}
                onChange={onInputChange}
                className="file-input hidden-file-input"
                accept="image/png, image/jpeg, image/jpg"
              />
              <div className="file-input-ui">
                <button
                  type="button"
                  className="file-select-button"
                  onClick={() => document.getElementById(name).click()}
                >
                  Choose File
                </button>
                <span className="file-name-display">
                  {value instanceof File
                    ? value.name
                    : "Supported formats: png, jpg, jpeg"}
                </span>
              </div>
            </div>
          )}
          {/* Show previous file if it exists */}
          {value instanceof File ? (
            <div className="file-preview">
              <img src={URL.createObjectURL(value)} alt={`${name} uploaded`} />
              <div className="file-actions">
                <a
                  href={URL.createObjectURL(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-file-icon"
                >
                  <Eye size={20} />
                </a>
                {isEditing && (
                  <button
                    type="button"
                    className="remove-file-icon"
                    onClick={() =>
                      onInputChange({ target: { name, value: null } })
                    }
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ) : typeof value === "string" && value.trim() !== "" ? (
            <div className="file-preview">
              <img src={value} alt={`${name} uploaded`} />
              <div className="file-actions">
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-file-icon"
                >
                  <Eye size={20} />
                </a>
                {isEditing && (
                  <button
                    type="button"
                    className="remove-file-icon"
                    onClick={() =>
                      onInputChange({ target: { name, value: null } })
                    }
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <span>
              {!isEditing ? (
                <em>{`No ${label.toLowerCase()} provided`}</em>
              ) : (
                ""
              )}
            </span>
          )}
        </div>
      );
    } else if (type === "date") {
      const displayValue = isEditing ? value : formatDateForDisplay(value);
      input = (
        <div className="date-input">
          <input
            type="date"
            id={name}
            name={name}
            value={value || ""}
            onChange={onInputChange}
            disabled={!isEditing}
            className={isEditing ? "editable-value" : ""}
          />
        </div>
      );
    } else if (type === "textarea") {
      input = (
        <textarea
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          rows={2}
          disabled={
            !isEditing || (name === "latestDiagnosis" && isDiagnosisLocked)
          }
          className={isEditing ? "editable-value" : ""}
        />
      );
    } else if (name === "weight") {
      // "kg" text
      input = (
        <div className="input-with-unit">
          <input
            type={type}
            id={name}
            name={name}
            value={value || ""}
            onChange={onInputChange}
            disabled={!isEditing}
            className={isEditing ? "editable-value" : ""}
          />
          <span className="unit-text">kg</span>
        </div>
      );
    } else if (name === "temperature") {
      //"°C" text
      input = (
        <div className="input-with-unit">
          <input
            type={type}
            id={name}
            name={name}
            value={value || ""}
            onChange={onInputChange}
            disabled={!isEditing}
            className={isEditing ? "editable-value" : ""}
          />
          <span className="unit-text">°C</span>
        </div>
      );
    } else {
      input = (
        <input
          type={type}
          id={name}
          name={name}
          value={value || ""}
          onChange={onInputChange}
          disabled={!isEditing}
          className={isEditing ? "editable-value" : ""}
        />
      );
    }

    return (
      <div className={`form-field ${isFullWidth ? "full-width" : ""}`}>
        <div className="input-container">
          <label htmlFor={name}>
            {label}
            {isRequired && (isEditing || isAddRecord) && (
              <span className="required">*</span>
            )}
          </label>
          {isEditing || type === "file" ? (
            input
          ) : (
            <span className="value-text">
              {type === "radio" ? (
                value === true ? (
                  "Yes"
                ) : (
                  "No"
                )
              ) : !value || value === "" ? (
                <em>{`No ${label.toLowerCase()} provided`}</em>
              ) : // added this two below sumama beside
              name === "weight" ? (
                `${value} kg`
              ) : name === "temperature" ? (
                `${value} °C`
              ) : (
                value
              )}
            </span>
          )}
        </div>
        {errors && errors[name] && (
          <span className="error-message-record">{errors[name]}</span>
        )}
        {name === "latestDiagnosis" &&
          isDiagnosisLocked &&
          isEditing &&
          !isAddRecord && (
            <button
              type="button"
              className="unlock-diagnosis-btn"
              onClick={onUnlockDiagnosis}
            >
              Unlock Diagnosis
            </button>
          )}
      </div>
    );
  };

  return (
    <div className="medical-record-form">
      <section className="medical-info">
        <h2>Medical Information</h2>
        <div className="form-row">
          {renderField("Weight", "weight", "text", { isRequired: true })}
          {renderField("Temperature", "temperature", "text", {
            isRequired: true,
          })}
        </div>
        <div className="form-row">
          {renderField("Conditions", "conditions", "text", {
            isRequired: true,
          })}
          {renderField("Symptoms", "symptoms", "text", { isRequired: true })}
        </div>
        <div className="form-row">
          {renderField("Laboratories", "laboratories", "select", {
            selectOptions: [
              "CBC",
              "Ultrasound",
              "ECG",
              "X-ray",
              "Blood Chem",
              "Microscopy",
              "Progesterone Test",
            ],
          })}
          {renderField("File", "file", "file")}
        </div>
        <div className="form-row">
          {renderField("Had past surgeries", "hadSurgery", "radio")}
          {formData.hadSurgery &&
            renderField("Date of Surgery", "surgeryDate", "date", {
              isRequired: true,
            })}
        </div>
        {formData.hadSurgery && (
          <div className="form-row">
            {renderField("Type of Surgery", "surgeryType", "text", {
              isFullWidth: true,
              isRequired: true,
            })}
          </div>
        )}
        <div className="form-row">
          {renderField("Latest Diagnosis", "latestDiagnosis", "textarea", {
            isFullWidth: true,
          })}
        </div>
      </section>
      <section className="visit-details">
        <h2>Visit Details</h2>
        <div className="form-row">
          {renderField("Recent Visit", "recentVisit", "date", {
            isRequired: true,
          })}
          {renderField("Recent Purchase", "recentPurchase", "text", {
            isRequired: true,
          })}
        </div>
        <div className="form-row">
          {renderField("Purpose of Visit", "purposeOfVisit", "text", {
            isFullWidth: true,
            isRequired: true,
          })}
        </div>
      </section>
    </div>
  );
};

export default MedicalRecordForm;
