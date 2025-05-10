import React, { useState, useEffect } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import "../css/NavBar.css";
import { Button } from "./Button";

function NavBar() {
  const [click, setClick] = useState(false);
  const [button, setButton] = useState(true);
  const location = useLocation();
  const handleClick = () => setClick(!click);
  const closeMobileMenu = () => setClick(false);

  const showButton = () => {
    if (window.innerWidth <= 960) {
      setButton(false);
    } else {
      setButton(true);
    }
  };

  useEffect(() => {
    showButton();
    window.addEventListener("resize", showButton);
    return () => window.removeEventListener("resize", showButton);
  }, []);

  const isLoginPage = location.pathname === "/login";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <RouterLink to="/" className="navbar-logo" onClick={closeMobileMenu}>
          <img src="/logo.png" alt="Logo" />
        </RouterLink>
        <div className="menu-icon" onClick={handleClick}>
          <i className={click ? "fas fa-times" : "fas fa-bars"} />
        </div>
        <ul className={click ? "nav-menu active" : "nav-menu"}>
          <li className="nav-item">
            {location.pathname === "/" ? (
              <ScrollLink
                to="home"
                smooth={true}
                duration={500}
                className="nav-links"
                onClick={closeMobileMenu}
              >
                HOME
              </ScrollLink>
            ) : (
              <RouterLink
                to="/"
                className="nav-links"
                onClick={closeMobileMenu}
              >
                HOME
              </RouterLink>
            )}
          </li>
          <li className="nav-item">
            {location.pathname === "/" ? (
              <ScrollLink
                to="about"
                smooth={true}
                duration={500}
                className="nav-links"
                onClick={closeMobileMenu}
              >
                ABOUT
              </ScrollLink>
            ) : (
              <RouterLink
                to="/"
                className="nav-links"
                onClick={closeMobileMenu}
              >
                ABOUT
              </RouterLink>
            )}
          </li>
          <li className="nav-item">
            {location.pathname === "/" ? (
              <ScrollLink
                to="contact"
                smooth={true}
                duration={500}
                className="nav-links"
                onClick={closeMobileMenu}
              >
                CONTACT US
              </ScrollLink>
            ) : (
              <RouterLink
                to="/"
                className="nav-links"
                onClick={closeMobileMenu}
              >
                CONTACT US
              </RouterLink>
            )}
          </li>
          <li className="nav-item">
            <RouterLink
              to={isLoginPage ? "/signup-petowner" : "/login"}
              className="nav-links-login"
              onClick={closeMobileMenu}
            >
              {isLoginPage ? "SIGNUP" : "LOGIN"}
            </RouterLink>
          </li>
        </ul>
        {button && (
          <RouterLink to={isLoginPage ? "/signup-petowner" : "/login"}>
            <Button buttonStyle="btn--primary">
              {isLoginPage ? "SIGNUP" : "LOGIN"}
            </Button>
          </RouterLink>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
