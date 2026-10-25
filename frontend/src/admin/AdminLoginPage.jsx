import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../api/admin";
import logo from "../assets/logo.png";
import { adminLoginPageStyles as s } from "../assets/dummyStyles";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { data } = await adminLogin(form);
      localStorage.setItem("adminToken", data.token);
      navigate("/admin");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={s.pageContainer}>
      <div className={s.card}>
        <section className={s.leftPanel}>
          <div className={s.leftContent}>
            <p className={s.leftEyebrow}>Admin panel</p>
            <div className={s.leftLogoRow}>
              <img src={logo} alt="BookMe" className={s.leftLogoImg} />
            </div>
            <h1 className={s.leftHeading}>
              Run the <span className={s.leftHeadingAccent}>platform</span>
            </h1>
            <p className={s.leftDescription}>
              Track providers, revenue, platform fees, and withdrawal requests
              from one place.
            </p>
          </div>
        </section>

        <section className={s.rightPanel}>
          <h2 className={s.formTitle}>Admin login</h2>
          <p className={s.formSubtitle}>
            Sign in with the platform admin credentials.
          </p>

          {message && <div className={s.messageBox}>{message}</div>}

          <form onSubmit={handleSubmit} className={s.form}>
            <div>
              <label className={s.inputLabel}>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={s.textInput}
              />
            </div>
            <div>
              <label className={s.inputLabel}>Password</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={s.textInput}
              />
            </div>
            <button type="submit" disabled={loading} className={s.submitButton}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
