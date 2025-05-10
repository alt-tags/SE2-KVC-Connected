import { useUserRole } from "../contexts/UserRoleContext";
import { Navigate } from "react-router-dom"; // Correct import

export default function ProtectedRoute({ requiredRoles, children }) {
  const { currentRole } = useUserRole();

  console.log("ProtectedRoute - Current Role:", currentRole); // Debug log
  console.log("ProtectedRoute - Required Roles:", requiredRoles); // Debug log

  // If no role (not logged in), redirect to login
  if (!currentRole) {
    return <Navigate to="/login" replace />;
  }

  // If role exists but not authorized, block access
  if (!requiredRoles.includes(currentRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
