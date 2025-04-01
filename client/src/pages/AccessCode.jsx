import React, { useState } from "react";
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import FormGroup from '../components/FormGroup';
import "../css/Forms.css";

const AccessCode = () => {
  const [formData, setFormData] = useState({
    accessCode: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Access code entered:", formData.accessCode);
    try {
      const response = await fetch("http://localhost:5000/auth/signup/employee-verify", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");

      const userRole = data.role;

      if (userRole) {
        console.log("Role received from backend:", userRole);
        // ***** REMOVE localStorage.setItem("jwt", token); *****
        localStorage.setItem("userRole", userRole); // <-- STORE ONLY THE ROLE
        console.log("User role saved to localStorage.");
      } else {
        console.error("Verification successful, but role missing in backend response:", data);
        throw new Error("Login failed after verification (missing role). Please contact support.");
      }

      // // ✅ Get token from headers or body
      // const token = response.headers.get("Authorization")?.split(" ")[1] || data.token;
      // if (token) {
      //   localStorage.setItem("jwt", token);
      // }

      setMessage(data.message);
      
      if (data.redirectUrl) {
        console.log("Redirecting to:", data.redirectUrl);
        window.location.replace(data.redirectUrl); // Perform the redirect
      } else {
        console.error("No redirect URL received from backend after verification.");
        setMessage("Verification successful, but failed to redirect.");
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <>
    <Navbar />
    <div className="accesscode-container">
      <div className="left-section">
        <h1>KHO<br /> VETERINARY<br /> CLINIC</h1>
        <div className="alternate-links">
          <Link to="/signup-petowner">
            <Button buttonStyle="btn--primary" className="form-btn-2">Sign up as Pet Owner</Button>
          </Link>
          <p>Not an Employee?</p>
        </div>
      </div>
      <div className="right-section">
        <h2 className="code-h2">Access Code <br /> Verification</h2>
        <form onSubmit={handleSubmit} className="code-formgroup">
          <FormGroup 
            label="Please enter the access code sent to your email by the doctor to confirm your role."
            type="text" 
             name="accessCode" 
             value={formData.accessCode}  
            onChange={handleChange} 
            required 
          />
          <Button buttonStyle='btn--primary' type='submit' className="form-btn-1">SUBMIT</Button>
        </form>
      </div>
    </div>
    </>
  );
};

export default AccessCode;
