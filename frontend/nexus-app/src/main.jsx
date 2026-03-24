import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { UserProvider } from "./UserContext.jsx";
import { I18nProvider } from "./I18nContext.jsx";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <UserProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
