import {
  Search,
  Bell,
  Menu,
  UserRound
} from "lucide-react";

function Topbar({
  role,
  onMenu
}) {

  return (
    <header className="topbar">

      <button
        className="icon-btn mobile-menu"
        onClick={onMenu}
      >
        <Menu size={21} />
      </button>

      <div className="top-search">

        <Search size={17} />

        <input
          placeholder={
            role === "officer"
              ? "Search documents, policies, updates..."
              : "Search schemes, loans, services..."
          }
        />

      </div>

      <div className="top-actions">

        <button className="icon-btn notification">

          <Bell size={19} />

          <span />

        </button>

        <div className="top-user">

          <div className="avatar">

            {role === "officer"
              ? <Building2Icon />
              : <UserRound size={16} />
            }

          </div>

          <div>

            <strong>
              {role === "officer"
                ? "Authorized Officer"
                : "Farmer / Citizen"
              }
            </strong>

            <small>
              {role === "officer"
                ? "Knowledge Authority"
                : "Sanyukt Vaani User"
              }
            </small>

          </div>

        </div>

      </div>

    </header>
  );
}

function Building2Icon() {

  return (
    <span style={{
      fontSize: "12px",
      fontWeight: "800"
    }}>
      O
    </span>
  );
}

export default Topbar;