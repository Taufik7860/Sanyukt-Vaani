import React, { useState } from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function Layout({
  children,
  role,
  currentPage,
  onNavigate,
  onLogout
}) {

  const [mobileOpen, setMobileOpen] =
    useState(false);

  return (
    <div className="app-shell">

      <Sidebar
        role={role}
        currentPage={currentPage}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onLogout={onLogout}
      />

      <div className="main-shell">

        <Topbar
          role={role}
          onMenu={() => setMobileOpen(true)}
        />

        <main className="content">

          {children}

        </main>

      </div>

    </div>
  );
}

export default Layout;