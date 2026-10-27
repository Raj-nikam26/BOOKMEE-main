import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminDashboardPage from "./admin/AdminDashboardPage";
import AdminLoginPage from "./admin/AdminLoginPage";
import AuthPage from "./pages/AuthPage";
import AvailabilityPage from "./pages/AvailabilityPage";
import CustomerAuthPage from "./pages/CustomerAuthPage";
import BookingCancelledPage from "./pages/BookingCancelledPage";
import BookingsPage from "./pages/BookingsPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import PaymentsPage from "./pages/PaymentsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import ProfilePage from "./pages/ProfilePage";
import PublicBookingPage from "./pages/PublicBookingPage";
import ServicesPage from "./pages/ServicesPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import {
  enforceSingleAccount,
  isBusinessLoggedIn,
} from "./utils/customerSession";

enforceSingleAccount();

const ProviderRoute = ({ children }) =>
  localStorage.getItem("token") ? children : <Navigate to="/business/login" replace />;

// The home page is the marketplace for customers and visitors.
// A logged-in business is sent to its dashboard instead; it can still open the
// marketplace from its account menu (/marketplace).
const HomeRoute = () =>
  isBusinessLoggedIn() ? (
    <Navigate to="/business/dashboard" replace />
  ) : (
    <LandingPage />
  );

const AdminRoute = ({ children }) =>
  localStorage.getItem("adminToken") ? (
    children
  ) : (
    <Navigate to="/admin/login" replace />
  );

const providerPages = [
  { path: "/business/dashboard", element: <DashboardPage /> },
  { path: "/business/services", element: <ServicesPage /> },
  { path: "/business/availability", element: <AvailabilityPage /> },
  { path: "/business/bookings", element: <BookingsPage /> },
  { path: "/business/payments", element: <PaymentsPage /> },
  { path: "/business/profile", element: <ProfilePage /> },
];

const legacyRedirects = [
  ["/account", "/login"],
  ["/account/bookings", "/my-bookings"],
  ...["dashboard", "services", "availability", "bookings", "payments", "profile"].map(
    (page) => [`/${page}`, `/business/${page}`],
  ),
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {providerPages.map((page) => (
          <Route
            key={page.path}
            path={page.path}
            element={<ProviderRoute>{page.element}</ProviderRoute>}
          />
        ))}

        {/* Customers */}
        <Route path="/" element={<HomeRoute />} />
        <Route path="/marketplace" element={<LandingPage />} />
        <Route path="/login" element={<CustomerAuthPage key="login" mode="login" />} />
        <Route path="/signup" element={<CustomerAuthPage key="signup" mode="register" />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />

        {/* Businesses (their other pages are listed in providerPages above) */}
        <Route path="/business" element={<Navigate to="/business/dashboard" replace />} />
        <Route path="/business/login" element={<AuthPage key="login" mode="login" />} />
        <Route path="/business/signup" element={<AuthPage key="signup" mode="register" />} />

        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Old addresses, so links shared earlier still work */}
        {legacyRedirects.map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}

        {/* Customer-facing pages */}
        <Route path="/book/:slug" element={<PublicBookingPage />} />
        <Route path="/booking/success" element={<BookingSuccessPage />} />
        <Route path="/booking/cancelled" element={<BookingCancelledPage />} />

        {/* Platform admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
