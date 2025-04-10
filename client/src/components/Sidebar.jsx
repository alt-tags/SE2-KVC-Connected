"use client";

import {
  UserCircle,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import "../css/Sidebar.css";

export default function Sidebar({ className = "", onMenuItemClick }) {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (path) => {
    if (onMenuItemClick) {
      onMenuItemClick();
    }
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className={`sidebar desktop-sidebar ${className} ${
          isExpanded ? "expanded" : ""
        }`}
      >
        <Link
          to="/account"
          className={`sidebar-item ${
            location.pathname === "/account" ? "active" : ""
          }`}
          onClick={() => handleClick("/account")}
        >
          <UserCircle size={30} />
          <span>My Account</span>
        </Link>
        <Link
          to="/patients"
          className={`sidebar-item ${
            location.pathname === "/patients" ? "active" : ""
          }`}
          onClick={() => handleClick("/patients")}
        >
          <Folder size={24} fill="currentColor" />
          <span>Patient Directory</span>
        </Link>

        <button className="toggle-button" onClick={toggleSidebar}>
          {isExpanded ? (
            <PanelLeftClose size={24} />
          ) : (
            <PanelLeftOpen size={24} />
          )}
        </button>
      </nav>

      {/* Mobile Menu */}
      <nav className={`sidebar mobile-sidebar ${className}`}>
        <div className="mobile-menu">
          <Link
            to="/account"
            className={`mobile-menu-item ${
              location.pathname === "/account" ? "active" : ""
            }`}
            onClick={() => handleClick("/account")}
          >
            <UserCircle size={24} />
            <span>My Account</span>
          </Link>
          <Link
            to="/patients"
            className={`mobile-menu-item ${
              location.pathname === "/patients" ? "active" : ""
            }`}
            onClick={() => handleClick("/patients")}
          >
            <Folder size={24} />
            <span>Patient Directory</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
