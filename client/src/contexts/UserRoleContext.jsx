"use client";

import { createContext, useContext, useState, useEffect } from "react";

// roles and their permissions
export const ROLES = {
  DOCTOR: "doctor",
  CLINICIAN: "clinician",
  FRONT_DESK: "staff",
  PET_OWNER: "owner",
  UNKNOWN: null,
};

// permissions for each role
export const PERMISSIONS = {
  [ROLES.DOCTOR]: {
    canEditPetProfile: true,
    canAddVaccination: true,
    canAddRecord: true,
    canUpdateRecord: true,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: true,
  },
  [ROLES.CLINICIAN]: {
    canEditPetProfile: true,
    canAddVaccination: true,
    canAddRecord: true,
    canUpdateRecord: true,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: false,
  },
  [ROLES.FRONT_DESK]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: true,
    canAlwaysEditDiagnosis: false,
  },
  [ROLES.PET_OWNER]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: false,
    canAlwaysEditDiagnosis: false,
    canAddNewPet: true,
  },
  [ROLES.UNKNOWN]: {
    canEditPetProfile: false,
    canAddVaccination: false,
    canAddRecord: false,
    canUpdateRecord: false,
    canViewContactInfo: false,
    canAlwaysEditDiagnosis: false,
    canAddNewPet: false,
  },
};

const UserRoleContext = createContext(null);

const getInitialRole = () => {
  const storedRole = localStorage.getItem("userRole");

  if (storedRole) {
    if (Object.values(ROLES).includes(storedRole)) {
      return storedRole;
    } else {
      console.warn("Invalid role found in localStorage:", storedRole);
      localStorage.removeItem("userRole");
      return ROLES.UNKNOWN;
    }
  }
  return ROLES.UNKNOWN;
};

const verifyAuthStatus = async () => {
  try {
    const response = await fetch("http://localhost:5000/auth/verify-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.role && Object.values(ROLES).includes(data.role)) {
      return data.role;
    } else {
      console.warn(
        "Verification endpoint succeeded but did not return a valid role."
      );
      return null;
    }
  } catch (error) {
    console.error("Error verifying auth status:", error);
    return null;
  }
};

export function UserRoleProvider({ children }) {
  const [currentRole, setCurrentRole] = useState(ROLES.UNKNOWN); // yung current role

  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Effect to check auth status on initial load (more robust method)
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const verifiedRole = await verifyAuthStatus();

      if (verifiedRole) {
        localStorage.setItem("userRole", verifiedRole);
        setCurrentRole(verifiedRole);
      } else {
        localStorage.removeItem("userRole");
        setCurrentRole(ROLES.UNKNOWN);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listener for storage changes
    const handleStorageChange = (event) => {
      if (event.key === "userRole") {
        const newRole = localStorage.getItem("userRole");
        if (newRole && Object.values(ROLES).includes(newRole)) {
          setCurrentRole(newRole);
        } else {
          // If role removed or invalid, logout state
          if (currentRole !== ROLES.UNKNOWN) logout();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const logout = async () => {
    localStorage.removeItem("userRole");
    setCurrentRole(ROLES.UNKNOWN);

    try {
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error calling backend logout:", error);
    }
  };

  const hasPermission = (permission) => {
    if (isLoading) return false;
    const roleToCheck = currentRole || ROLES.UNKNOWN;
    return PERMISSIONS[roleToCheck]?.[permission] ?? false;
  };

  return (
    <UserRoleContext.Provider
      value={{
        currentRole,
        setCurrentRole /*(rarely used directly)*/,
        hasPermission,
        logout,
        isLoading,
      }}
    >
      {!isLoading ? children : <div>Loading user...</div>}{" "}
      {/* Basic loading indicator */}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
}
