import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/navbar/Navbar";
import Menu from "./components/menu/Menu";
import { ExcelProvider } from "./context/excel/ExcelContext";
import "./styles/global.scss";

const Layout: React.FC = () => {
  return (
    <ExcelProvider>
      <div className="main">
        <Navbar />
        <div className="container">
          <div className="menuContainer">
            <Menu />
          </div>
          <div className="contentContainer">
            <Outlet />
          </div>
        </div>
      </div>
    </ExcelProvider>
  );
};

export default Layout;
