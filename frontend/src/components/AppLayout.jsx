import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  CalendarCheck,
  ChevronDown,
  Clock,
  ExternalLink,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { getMe } from "../api/auth";
import logo from "../assets/thumbs/logo.webp";
import { shellStyles as s } from "../assets/appShellStyles";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/services", label: "Services", icon: Layers },
  { to: "/availability", label: "Availability", icon: Clock },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/payments", label: "Payments", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserRound },
];

/**
 * The shell around every business page: top navigation, account menu, footer.
 */
export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    getMe()
      .then(({ data }) => setUser(data.user))
      .catch((error) => {
        // An expired or invalid session goes back to the login page.
        if (error.response?.status === 401 || error.response?.status === 404) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      });
  }, [navigate]);

  // Close the account menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event) => {
      if (!accountRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const displayName = user?.businessName || user?.name || "Account";
  const publicPath = user?.slug ? `/book/${user.slug}` : null;

  return (
    <div className={s.container}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <Link to="/dashboard" className={s.logoLink}>
            <img src={logo} alt="BookMe" className={s.logoImg} />
            <span className={s.logoText}>BookMe</span>
          </Link>

          <nav className={s.nav} aria-label="Main">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? s.navLinkActive : s.navLink
                }
              >
                <item.icon className={s.navIcon} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className={s.right}>
            {publicPath && (
              <a
                href={publicPath}
                target="_blank"
                rel="noreferrer"
                className={s.viewPage}
              >
                My booking page
                <ExternalLink className={s.viewPageIcon} />
              </a>
            )}

            <div className={s.account} ref={accountRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={s.accountButton}
              >
                <span className={s.avatar}>
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className={s.accountName}>{displayName}</span>
                <ChevronDown
                  className={`${s.chevron} ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className={s.menu} role="menu">
                  <div className={s.menuHeader}>
                    <p className={s.menuName}>{displayName}</p>
                    <p className={s.menuEmail}>{user?.email}</p>
                  </div>
                  {publicPath && (
                    <a
                      href={publicPath}
                      target="_blank"
                      rel="noreferrer"
                      role="menuitem"
                      className={s.menuItem}
                    >
                      <ExternalLink className={s.menuIcon} />
                      My booking page
                    </a>
                  )}
                  <Link to="/marketplace" role="menuitem" className={s.menuItem}>
                    <Store className={s.menuIcon} />
                    View marketplace
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={logout}
                    className={s.menuItemDanger}
                  >
                    <LogOut className={s.menuIcon} />
                    Log out
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className={s.mobileButton}
            >
              {mobileOpen ? (
                <X className={s.mobileIcon} />
              ) : (
                <Menu className={s.mobileIcon} />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav className={s.mobileNav} aria-label="Main">
            <div className={s.mobileNavInner}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    isActive ? s.mobileLinkActive : s.mobileLink
                  }
                >
                  <item.icon className={s.navIcon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className={s.main}>{children}</main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <span>© {new Date().getFullYear()} BookMe. All rights reserved.</span>
          <div className={s.footerLinks}>
            <Link to="/privacy" className={s.footerLink}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={s.footerLink}>
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
