import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarDays,
  CreditCard,
  Lock,
  Mail,
  Tag,
  User,
} from "lucide-react";
import {
  login,
  register,
  requestRegistrationOtp,
  verifyRegistrationOtp,
} from "../api/auth";
import logo from "../assets/logo.png";
import { authPageStyles as s } from "../assets/dummyStyles";
import { saveBusinessSession } from "../utils/customerSession";
import { CATEGORIES, DEFAULT_CATEGORY } from "../constants/categories";

const emptyForm = {
  name: "",
  businessName: "",
  category: DEFAULT_CATEGORY,
  email: "",
  emailOtp: "",
  password: "",
};

// mode: "login" or "register", decided by the address (/business/login or /business/signup).
export default function AuthPage({ mode: initialMode = "login" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "register" ? "register" : initialMode;
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const isRegister = mode === "register";

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timeout = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timeout);
  }, [otpCooldown]);

  const handleChange = async (event) => {
    const { name, value } = event.target;

    if (name === "emailOtp") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 6);
      setForm((prev) => ({ ...prev, emailOtp: digitsOnly }));
      setOtpVerified(false);

      if (digitsOnly.length === 6 && form.email) {
        try {
          await verifyRegistrationOtp({
            email: form.email,
            emailOtp: digitsOnly,
          });
          setOtpVerified(true);
          setMessage("Email verified. Choose a password to finish.");
        } catch (error) {
          setMessage(error.response?.data?.message || "Invalid OTP");
        }
      }
      return;
    }

    if (name === "email") {
      setOtpVerified(false);
      setOtpSentTo("");
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const sendOtp = async () => {
    setOtpLoading(true);
    setMessage("");

    try {
      const { data } = await requestRegistrationOtp(form.email);
      setOtpSentTo(form.email.trim().toLowerCase());
      setOtpCooldown(30);
      // devCode is only returned while email sending is not configured on the backend.
      setMessage(
        data.devCode
          ? `Email is not configured yet, so use this code: ${data.devCode}`
          : "Verification code sent to your email",
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not send verification code",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = isRegister
        ? await register(form)
        : await login({ email: form.email, password: form.password });
      saveBusinessSession(data.token);
      navigate("/business/dashboard");
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (localStorage.getItem("token")) {
    return <Navigate to="/business/dashboard" replace />;
  }

  return (
    <div className={s.pageBg}>
      <div className={s.gridContainer}>
        {/* Left: brand */}
        <section className={s.brandSection}>
          <Link to="/" className={s.logoRow}>
            <img src={logo} alt="BookMe" className={s.logoImg} />
            <span className={s.brandName}>BookMe</span>
          </Link>
          <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-brand-300">
            For businesses
          </p>
          <h1 className={s.mainHeading}>
            Bookings made
            <span className={s.gradientText}>simple.</span>
          </h1>
          <p className={s.subtitle}>
            Create services, set your availability, share one link, and get
            paid for every appointment.
          </p>

          <div className={s.featureGrid}>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapPurple}>
                <CalendarDays className={s.featureIconPurple} />
              </div>
              <div>
                <p className={s.featureTitle}>Public link</p>
                <p className={s.featureDesc}>Customers book without signup</p>
              </div>
            </div>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapEmerald}>
                <CreditCard className={s.featureIconEmerald} />
              </div>
              <div>
                <p className={s.featureTitle}>Payments</p>
                <p className={s.featureDesc}>Collect securely via Stripe</p>
              </div>
            </div>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapAmber}>
                <Bell className={s.featureIconAmber} />
              </div>
              <div>
                <p className={s.featureTitle}>Reminders</p>
                <p className={s.featureDesc}>Email and calendar updates</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: auth form */}
        <section className={s.formCard}>
          <h2 className={s.formHeading}>
            {isRegister ? "Create your business account" : "Business login"}
          </h2>
          <p className={s.formSubtitle}>
            {isRegister
              ? "Set up your business in minutes"
              : "Log in to manage your services and bookings"}
          </p>

          <form onSubmit={handleSubmit} className={s.form}>
            {isRegister && (
              <>
                <div>
                  <label className={s.inputLabel}>Name</label>
                  <div className={s.inputWrapper}>
                    <User className={s.inputIcon} />
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      className={s.inputField}
                    />
                  </div>
                </div>

                <div>
                  <label className={s.inputLabel}>Business Name</label>
                  <div className={s.inputWrapper}>
                    <Building2 className={s.inputIcon} />
                    <input
                      name="businessName"
                      value={form.businessName}
                      onChange={handleChange}
                      placeholder="Your business name"
                      className={s.inputField}
                    />
                  </div>
                </div>

                <div>
                  <label className={s.inputLabel}>Business Category</label>
                  <div className={s.inputWrapper}>
                    <Tag className={s.inputIcon} />
                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className={`${s.inputField} bg-white`}
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className={s.inputLabel}>Email</label>
              <div className={s.inputWrapper}>
                <Mail className={s.inputIcon} />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className={s.inputField}
                />
              </div>
            </div>

            {isRegister && (
              <div className={s.otpContainer}>
                <label className={s.otpLabel}>Email verification code</label>
                <div className={s.otpGrid}>
                  <input
                    name="emailOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.emailOtp}
                    onChange={handleChange}
                    className={s.otpField}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                  />
                  {otpVerified ? (
                    <button
                      type="button"
                      disabled
                      className={s.otpVerifiedButton}
                    >
                      <BadgeCheck className={s.otpVerifiedIcon} />
                      Verified
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={otpLoading || !form.email || otpCooldown > 0}
                      className={s.otpButton}
                    >
                      {otpLoading
                        ? "Sending..."
                        : otpCooldown > 0
                          ? `Resend code (${otpCooldown}s)`
                          : otpSentTo && otpSentTo === form.email.trim().toLowerCase()
                            ? "Resend code"
                            : "Send code"}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className={s.inputLabel}>Password</label>
              <div className={s.inputWrapper}>
                <Lock className={s.inputIcon} />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={s.inputField}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={s.submitBtn}>
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Log in"}
              <ArrowRight className={s.submitIcon} />
            </button>

            {message && <p className={s.message}>{message}</p>}
          </form>

          <button
            type="button"
            onClick={() => {
              navigate(isRegister ? "/business/login" : "/business/signup");
            }}
            className={s.toggleMode}
          >
            {isRegister
              ? "Already have an account? Log in"
              : "Need an account? Register"}
          </button>
        </section>
      </div>

      <div className={s.footerLinks}>
        <Link to="/" className={s.footerLink}>
          Back to marketplace
        </Link>
        <Link to="/login" className={s.footerLink}>
          Customer login
        </Link>
        <Link to="/privacy" className={s.footerLink}>
          Privacy Policy
        </Link>
        <Link to="/terms" className={s.footerLink}>
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
