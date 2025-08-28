import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ExcelProvider } from "./context/excel/ExcelContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ExcelProvider>
      <App />
    </ExcelProvider>
  </React.StrictMode>
);
