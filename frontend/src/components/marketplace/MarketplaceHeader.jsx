import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/thumbs/logo.webp";
import { headerStyles as s } from "../../assets/marketplaceStyles";
import { isBusinessLoggedIn } from "../../utils/customerSession";

/**
 * Top bar of the customer-facing pages.
 * `customer` is the logged-in customer (or null) and `onLogout` logs them out.
 * `returnTo` is the page to come back to after logging in (e.g. a booking page).
 */
export default function MarketplaceHeader({ customer, onLogout, returnTo }) {
  const nextQuery = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
  // A business looking at the marketplace sees it as a visitor would, with a
  // way back to its dashboard instead of the customer login buttons.
  const isBusiness = isBusinessLoggedIn();

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <Link to="/" className={s.logoLink}>
          <img src={logo} alt="BookMe" className={s.logoImg} />
          <span className={s.logoText}>BookMe</span>
        </Link>

        <nav className={s.actions}>
          {customer ? (
            <>
              <NavLink
                to="/my-bookings"
                className={({ isActive }) => (isActive ? s.linkActive : s.link)}
              >
                My bookings
              </NavLink>
              <span className={s.greeting}>
                <span className={s.avatar}>
                  {customer.name.slice(0, 1).toUpperCase()}
                </span>
                {customer.name.split(" ")[0]}
              </span>
              <button type="button" onClick={onLogout} className={s.link}>
                Log out
              </button>
            </>
          ) : isBusiness ? (
            <Link to="/business/dashboard" className={s.primary}>
              Back to dashboard
            </Link>
          ) : (
            <>
              <Link to={`/login${nextQuery}`} className={s.link}>
                Log in
              </Link>
              <Link to={`/signup${nextQuery}`} className={s.primary}>
                Sign up
              </Link>
              <span className={s.divider} />
              <Link to="/business/login" className={s.business}>
                For business
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
