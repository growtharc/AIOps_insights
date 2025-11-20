import React from "react";
import { NavLink } from "react-router";
import "./Header.scss";
import Content from "../../ui/Content";

import UserDropdown from "../UserDropdown/UserDropdown";
import { IncidentsIcon } from "../../icons/IncidentsIcon";
import { AnalysisIcon } from "../../icons/AnalysisIcon";
import { InsightsIcon } from "../../icons/InsightsIcon";

const Header: React.FC = () => {
  const user = {
    firstName: "",
    lastName: "",
    email: "",
  };

  const onSettingsClick = () => {
    console.log("setting click");
  };

  const onLogout = () => {
    console.log("logout click");
  };
  return (
    <header className="header">
      <Content>
        <div className="header-content">
          <div className="header-left">
            <div className="logo-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 26 26"
                fill="none"
              >
                <path
                  d="M0 0.339661V4.27069H19.001L22.913 0.339661H0Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M0 6.51762V10.4487H12.7933L16.7656 6.51762H0Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M0 12.4135V16.3445H6.98567L10.8976 12.4135H0Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M25.4279 25.6106H21.5159L21.5159 6.51701L25.4279 2.58598L25.4279 25.6106Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M19.2806 25.6106H15.3686L15.3686 12.755L19.2806 8.76331L19.2806 25.6106Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M13.4123 25.6106H9.5003L9.5003 18.5909L13.4123 14.6598L13.4123 25.6106Z"
                  fill="#1E3C53"
                ></path>
                <path
                  d="M0 18.8722V22.6629H3.20771L3.21341 25.6111H6.71195L6.84596 18.8722H0Z"
                  fill="#1E3C53"
                ></path>
              </svg>
              <div className="ping-circle ping-brand"></div>
              <div className="ping-circle ping-contrast"></div>
            </div>
            <div className="app-name">AIOps Insights</div>
          </div>

          <div className="header-center">
            <nav className="nav">
              <a
                href="https://solutions.growtharc.com/aiops/"
                target="_blank"
                rel="noopener noreferrer"
                className={`nav-link`}
              >
                <AnalysisIcon width="1.2rem" height="1.2em" />
                Analysis
              </a>
              <a
                href="https://solutions.growtharc.com/aiops/resolver"
                target="_blank"
                rel="noopener noreferrer"
                className={`nav-link`}
              >
                <IncidentsIcon width="1.2rem" height="1.2em" />
                Incident
              </a>

              <NavLink
                to="/"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <InsightsIcon width="1.2rem" height="1.2em" />
                Insights
              </NavLink>
            </nav>
          </div>
          <div className="header-right">
            <UserDropdown
              user={user}
              onSettingsClick={onSettingsClick}
              onLogout={onLogout}
            />
          </div>
        </div>
      </Content>
    </header>
  );
};

export default Header;
