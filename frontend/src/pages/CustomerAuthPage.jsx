import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Lock,
  Mail,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import {
  loginCustomer,
  registerCustomer,
  requestCustomerOtp,
} from "../api/customer";
import logo from "../assets/thumbs/logo.webp";
import { authPageStyles as s } from "../assets/dummyStyles";
import { CATEGORIES } from "../constants/categories";
import {
  getCustomerSession,
  saveCustomerSession,
} from "../utils/customerSession";

const interestChipBase =
  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";
const interestChipActive = "border-brand-600 bg-brand-50 text-brand-600";
const interestChipInactive =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300";

// Only addresses inside this site are allowed as a place to return to.
const safeNext = (value) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

// mode: "login" or "register", decided by the address (/login or /signup).
export default function CustomerAuthPage({ mode: initialMode = "login" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "register" ? "register" : initialMode;
  // Where to go after logging in, e.g. back to the booking page they came from.
  const next = safeNext(searchParams.get("next"));
  const nextQuery = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
  const [form, setForm] = useState({
    name: "",
    email: "",
    emailOtp: "",
    password: "",
  });
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isRegister = mode === "register";

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const timeout = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timeout);
  }, [otpCooldown]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "emailOtp" ? value.replace(/\D/g, "").slice(0, 6) : value,
    }));
  };

  const sendOtp = async () => {
    setOtpLoading(true);
    setMessage("");

    try {
      const { data } = await requestCustomerOtp(form.email);
      setOtpSentTo(form.email.trim().toLowerCase());
      setOtpCooldown(30);
      // devCode is only returned while email sending is not configured on the server.
      setMessage(
        data.devCode
          ? `Email is not configured yet, so use this code: ${data.devCode}`
          : "We emailed you a 6-digit code. Check spam if you do not see it.",
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not send verification code",
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = isRegister
        ? await registerCustomer({ ...form, interests })
        : await loginCustomer({ email: form.email, password: form.password });
      saveCustomerSession(data.token, data.customer);
      navigate(next);
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (getCustomerSession()) {
    return <Navigate to="/" replace />;
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
          <h1 className={s.mainHeading}>
            Services picked
            <span className={s.gradientText}>for you.</span>
          </h1>
          <p className={s.subtitle}>
            Create a free account and the marketplace learns what you like, so
            the best businesses for you show up first.
          </p>

          <div className={s.featureGrid}>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapPurple}>
                <Sparkles className={s.featureIconPurple} />
              </div>
              <div>
                <p className={s.featureTitle}>Personal picks</p>
                <p className={s.featureDesc}>Based on what you view and book</p>
              </div>
            </div>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapEmerald}>
                <CalendarDays className={s.featureIconEmerald} />
              </div>
              <div>
                <p className={s.featureTitle}>Faster booking</p>
                <p className={s.featureDesc}>No email code every time</p>
              </div>
            </div>
            <div className={s.featureCard}>
              <div className={s.featureIconWrapAmber}>
                <Search className={s.featureIconAmber} />
              </div>
              <div>
                <p className={s.featureTitle}>Compare</p>
                <p className={s.featureDesc}>Prices across businesses</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: form */}
        <section className={s.formCard}>
          <h2 className={s.formHeading}>
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>
          <p className={s.formSubtitle}>
            {isRegister
              ? "Tell us what you are interested in"
              : "Log in to see your recommendations"}
          </p>

          <form onSubmit={handleSubmit} className={s.form}>
            {isRegister && (
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
                  />
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

            {isRegister && (
              <div className={s.otpContainer}>
                <p className={s.otpLabel}>What are you looking for?</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleInterest(category.id)}
                      aria-pressed={interests.includes(category.id)}
                      className={`${interestChipBase} ${
                        interests.includes(category.id)
                          ? interestChipActive
                          : interestChipInactive
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              navigate(`${isRegister ? "/login" : "/signup"}${nextQuery}`);
            }}
            className={s.toggleMode}
          >
            {isRegister
              ? "Already have an account? Log in"
              : "New here? Create an account"}
          </button>
        </section>
      </div>

      <div className={s.footerLinks}>
        <Link to="/" className={s.footerLink}>
          Back to marketplace
        </Link>
        <Link to="/business/login" className={s.footerLink}>
          I run a business
        </Link>
      </div>
    </div>
  );
}
