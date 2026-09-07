import React, { useState } from "react";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Sources from "./pages/Sources";
import Profile from "./pages/Profile";
import OfficerDashboard from "./pages/OfficerDashboard";

import Layout from "./components/Layout";

function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("home");

  // Login / Role Selection
  if (!role) {
    return (
      <Login
        onLogin={(selectedRole) => {
          setRole(selectedRole);

          if (selectedRole === "officer") {
            setPage("officer");
          } else {
            setPage("home");
          }
        }}
      />
    );
  }

  // Officer Portal
  if (role === "officer") {
    return (
      <Layout
        role={role}
        currentPage={page}
        onNavigate={setPage}
        onLogout={() => {
          setRole(null);
          setPage("home");
        }}
      >
        <OfficerDashboard />
      </Layout>
    );
  }

  // Citizen Portal
  const renderCitizenPage = () => {
    switch (page) {
      case "home":
        return <Home onNavigate={setPage} />;

      case "chat":
        return <Chat />;

      case "history":
        return <History />;

      case "sources":
        return <Sources />;

      case "profile":
        return <Profile />;

      default:
        return <Home onNavigate={setPage} />;
    }
  };

  return (
    <Layout
      role={role}
      currentPage={page}
      onNavigate={setPage}
      onLogout={() => {
        setRole(null);
        setPage("home");
      }}
    >
      {renderCitizenPage()}
    </Layout>
  );
}

export default App;