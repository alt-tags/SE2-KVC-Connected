"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import "../css/UnlockDiagnosis.css";
import { Key } from "lucide-react";

const UnlockModal = ({ isOpen, onClose, onUnlock, generatedAccessCode }) => {
  const [formData, setFormData] = useState({ accessCode: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedAccessCode = formData.accessCode.trim();
    console.log("Access code being entered:", trimmedAccessCode);

    if (trimmedAccessCode !== generatedAccessCode) {
      setError("Invalid access code. Please try again.");
      return;
    }

    // If the access code matches, unlock the diagnosis
    console.log("Access code verified successfully!");
    onUnlock(trimmedAccessCode);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modify Diagnosis</h2>
        <p>Enter the access code provided by the clinic owner:</p>
        <form onSubmit={handleSubmit}>
          <div className="access-code-input-container">
            <div className="access-code-icon">
              <Key size={20} />
            </div>
            <input
              type="text"
              name="accessCode"
              placeholder="Enter access code"
              value={formData.accessCode}
              onChange={handleChange}
              className="access-code-input"
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-buttons">
            <button
              type="button"
              onClick={onClose}
              className="cancel-diagnosis-button"
            >
              Cancel
            </button>
            <button type="submit" className="unlock-button">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default UnlockModal;
