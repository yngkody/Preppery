import React from "react";
import "./navbar.scss";
import { Search, Grid, Maximize2, Bell, Settings } from "lucide-react";

const Navbar: React.FC = () => (
  <div className="navbar" role="navigation" aria-label="Top">
    <div className="logo">
      <span>PrepDeck</span>
    </div>

    <div className="icons" aria-label="Actions">
      <Search className="icon" aria-label="Search" />
      <Grid className="icon" aria-label="Apps" />
      <Maximize2 className="icon" aria-label="Expand" />

      <div className="notification" aria-live="polite">
        <Bell className="icon" aria-label="Notifications" />
        <span>1</span>
      </div>

      <div className="user">
        <img
          src="https://images.pexels.com/photos/11038549/pexels-photo-11038549.jpeg"
          alt="User avatar"
          loading="lazy"
        />
      </div>

      <Settings className="icon" aria-label="Settings" />
    </div>
  </div>
);

export default Navbar;
