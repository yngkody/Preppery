import React from "react";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import Navbar from "./components/navbar/Navbar";
import Menu from "./components/menu/Menu";
import "./styles/global.scss";

// Pages (import actual functional components)
import HomePage from "./pages/home/Home";
import UsersPage from "./pages/users/Users";
import ShortlistPage from "./pages/shortlist/Shortlist";
import DataPage from "./pages/data/Data";
import EditPage from "./pages/edit/Edit";
import ManagePage from "./pages/manage/Manage";
import UploadPage from "./pages/upload/Upload";
import ProgressPage from "./pages/progress/Progress";
import LoginPage from "./pages/login/Login";

// Footer
const Footer: React.FC = () => (
  <div className="footer">
    <span>admin</span>
    <span>PrepDeck</span>
  </div>
);

// Layout
const Layout: React.FC = () => (
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
    <Footer />
  </div>
);

// Router
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "users", element: <UsersPage /> },
      { path: "shortlist", element: <ShortlistPage /> },
      { path: "data", element: <DataPage /> },
      { path: "edit", element: <EditPage /> },
      { path: "manage", element: <ManagePage /> },
      { path: "upload", element: <UploadPage /> },
      { path: "progress", element: <ProgressPage /> },
    ],
  },
  { path: "/login", element: <LoginPage /> },
]);

const App: React.FC = () => <RouterProvider router={router} />;

export default App;
