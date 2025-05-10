import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const FormGroup = ({
  label,
  type,
  name,
  value,
  onChange,
  required,
  selectOptions,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  return (
    <div className="forms-group">
      <label htmlFor={name}>
        {label} {required && <span className="required-asterisk">*</span>}
      </label>
      {type === "select" ? (
        <select id={name} name={name} value={value} onChange={onChange}>
          <option value="">Select {label.toLowerCase()}</option>
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <div
          className={`input-wrapper ${
            type === "password" ? "password-wrapper" : ""
          }`}
        >
          <input
            type={type === "password" && showPassword ? "text" : type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
          />
          {type === "password" && (
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              className="password-toggle-icon"
              onClick={togglePasswordVisibility}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default FormGroup;
