import {
  LayoutDashboard,
  MessageCircle,
  FileCheck2,
  History as HistoryIcon,
  UserRound,
  Settings,
  BarChart3,
  LogOut,
  X,
  Building2,
  ShieldCheck
} from "lucide-react";

function Sidebar({
  role,
  currentPage,
  onNavigate,
  mobileOpen,
  onClose,
  onLogout
}) {

  const citizenMenu = [
    {
      id: "home",
      label: "Dashboard",
      icon: LayoutDashboard
    },
    {
      id: "chat",
      label: "Ask Sanyukt Vaani",
      icon: MessageCircle
    },
    {
      id: "sources",
      label: "Official Sources",
      icon: FileCheck2
    },
    {
      id: "history",
      label: "Conversation History",
      icon: HistoryIcon
    },
    {
      id: "profile",
      label: "Profile & Settings",
      icon: UserRound
    }
  ];

  const officerMenu = [
    {
      id: "officer",
      label: "Officer Dashboard",
      icon: LayoutDashboard
    },
    {
      id: "officer",
      label: "Knowledge Center",
      icon: FileCheck2
    },
    {
      id: "officer",
      label: "System Analytics",
      icon: BarChart3
    }
  ];

  const menu =
    role === "officer"
      ? officerMenu
      : citizenMenu;

  return (
    <>
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen ? "open" : ""
        }`}
      >

        <div className="sidebar-brand">

          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>

          <div>
            <strong>संयुक्त वाणी</strong>
            <small>Sanyukt Vaani AI</small>
          </div>

          <button
            className="icon-btn mobile-close"
            onClick={onClose}
          >
            <X size={19} />
          </button>

        </div>

        <div className="role-pill">

          {role === "officer"
            ? <Building2 size={15} />
            : <UserRound size={15} />
          }

          {role === "officer"
            ? "Officer Portal"
            : "Citizen Portal"
          }

          <span className="live-dot" />

        </div>

        <div className="nav-label">
          MAIN MENU
        </div>

        <nav>

          {menu.map((item, index) => {

            const Icon = item.icon;

            return (
              <button
                key={`${item.id}-${index}`}
                className={`nav-item ${
                  currentPage === item.id
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
              >

                <Icon size={18} />

                <span>
                  {item.label}
                </span>

              </button>
            );
          })}

        </nav>

        <div className="sidebar-help">

          <ShieldCheck size={20} />

          <strong>
            Trusted Information
          </strong>

          <p>
            Sanyukt Vaani uses verified
            official knowledge sources.
          </p>

        </div>

        <button
          className="logout-btn"
          onClick={onLogout}
        >

          <LogOut size={17} />

          Switch / Logout

        </button>

      </aside>
    </>
  );
}

export default Sidebar;