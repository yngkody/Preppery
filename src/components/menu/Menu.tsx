import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./menu.scss";

// Simple 15px white SVG icons
const icons = {
  home: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1V9.75z" />
    </svg>
  ),
  list: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  progress: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M4 12h4v4H4v-4zm6-6h4v10h-4V6zm6 4h4v6h-4v-6z"/>
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M3 21v-3l12-12 3 3-12 12H3z" />
    </svg>
  ),
  upload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  data: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <path d="M3 3v18h18" />
      <path d="M9 3v12h12" />
    </svg>
  ),
  manage: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  ),
};

const Menu: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      title: "MAIN",
      items: [{ name: "Home", path: "/", icon: icons.home }],
    },
    {
      title: "Quick Start",
      items: [
        { name: "View Shortlist", path: "/shortlist", icon: icons.list },
        { name: "View Progress by Station", path: "/progress", icon: icons.progress },
        { name: "Edit", path: "/edit", icon: icons.edit },
        { name: "Upload", path: "/upload", icon: icons.upload },
      ],
    },
    {
      title: "Data",
      items: [{ name: "Data & Analytics", path: "/data", icon: icons.data }],
    },
    {
      title: "Portal",
      items: [{ name: "Manage", path: "/manage", icon: icons.manage }],
    },
  ];

  return (
    <div className="menu">
      {menuItems.map((section) => (
        <div className="section" key={section.title}>
          <span className="title">{section.title}</span>
          {section.items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`menuItem ${location.pathname === item.path ? "active" : ""}`}
            >
              <span className="menuIcon">{item.icon}</span>
              <span className="menuItemTitle">{item.name}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Menu;
