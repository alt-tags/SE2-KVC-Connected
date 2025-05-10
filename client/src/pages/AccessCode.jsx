import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import FormGroup from "../components/FormGroup";
import "../css/Forms.css";

const AccessCode = () => {
  const [formData, setFormData] = useState({
    accessCode: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate access code
    if (!formData.accessCode.trim()) {
      setError("Access code is required");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/auth/signup/employee-verify",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Invalid access code");
        throw new Error(data.error || "Invalid access code");
      }

      const userRole = data.role;

      if (userRole) {
        localStorage.setItem("userRole", userRole);
      } else {
        setError(
          "Verification successful, but role missing. Please contact support."
        );
        throw new Error(
          "Login failed after verification (missing role). Please contact support."
        );
      }

      setMessage(data.message);

      if (data.redirectUrl) {
        window.location.replace(data.redirectUrl);
      } else {
        setError("Verification successful, but failed to redirect.");
        console.error(
          "No redirect URL received from backend after verification."
        );
      }
    } catch (error) {
      console.error("Error:", error.message);
      setError(error.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="accesscode-container">
        <div className="left-section">
          <h1>
            KHO
            <br /> VETERINARY
            <br /> CLINIC
          </h1>
          <div className="alternate-links">
            <Link to="/signup-petowner">
              <Button buttonStyle="btn--primary" className="form-btn-2">
                Sign up as Pet Owner
              </Button>
            </Link>
            <p>Not an Employee?</p>
          </div>
        </div>
        <div className="right-section">
          <h2 className="code-h2">
            Access Code <br /> Verification
          </h2>
          {error && <div className="auth-error-message">{error}</div>}
          <form onSubmit={handleSubmit} className="code-formgroup">
            <FormGroup
              label="Please enter the access code sent to your email by the doctor to confirm your role"
              type="text"
              name="accessCode"
              value={formData.accessCode}
              onChange={handleChange}
              required
            />
            <Button
              buttonStyle="btn--primary"
              type="submit"
              className="form-btn-1"
            >
              SUBMIT
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default AccessCode;
