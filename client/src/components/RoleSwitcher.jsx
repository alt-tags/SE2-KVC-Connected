"use client";

import { useState } from "react";
import { useUserRole, ROLES } from "../contexts/UserRoleContext";
import "../css/RoleSwitcher.css";

export default function RoleSwitcher() {
  const { currentRole, setCurrentRole } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);

  const roleLabels = {
    [ROLES.DOCTOR]: "Doctor",
    [ROLES.CLINICIAN]: "Clinician",
    [ROLES.FRONT_DESK]: "Front Desk",
    [ROLES.PET_OWNER]: "Pet Owner",
  };

  const handleRoleChange = (role) => {
    setCurrentRole(role);
    setIsOpen(false);
  };

  return (
    <div className="role-switcher">
      <button className="role-button" onClick={() => setIsOpen(!isOpen)}>
        Current Role: {roleLabels[currentRole]}
      </button>

      {isOpen && (
        <div className="role-dropdown">
          {Object.values(ROLES).map((role) => (
            <button
              key={role}
              className={`role-option ${currentRole === role ? "active" : ""}`}
              onClick={() => handleRoleChange(role)}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
