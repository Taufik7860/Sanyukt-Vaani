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
import { useLanguage } from "../context/LanguageContext";

function Sidebar({
  role,
  currentPage,
  onNavigate,
  mobileOpen,
  onClose,
  onLogout
}) {
  const { t } = useLanguage();

  const citizenMenu = [
    {
      id: "home",
      label: t.dashboard,
      icon: LayoutDashboard
    },
    {
      id: "chat",
      label: t.ask,
      icon: MessageCircle
    },
    {
      id: "sources",
      label: t.sources,
      icon: FileCheck2
    },
    {
      id: "history",
      label: t.history,
      icon: HistoryIcon
    },
    {
      id: "profile",
      label: t.profile,
      icon: UserRound
    }
  ];

  const officerMenu = [
    {
      id: "officer",
      label: t.dashboard,
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
            <strong>Sanyukt Vaani AI</strong>
            <small>Multilingual Cooperative Assistance</small>
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
            ? t.officer
            : t.citizen
          }

          <span className="live-dot" />

        </div>

        <div className="nav-label">
          {t.mainMenu}
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
            {t.trusted}
          </strong>

          <p>
            {t.trustedText}
          </p>

        </div>

        <button
          className="logout-btn"
          onClick={onLogout}
        >

          <LogOut size={17} />

          {t.logout}

        </button>

      </aside>
    </>
  );
}

export default Sidebar;