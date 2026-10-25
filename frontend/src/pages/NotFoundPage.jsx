import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import logo from "../assets/thumbs/logo.webp";

export default function NotFoundPage() {
  const isBusinessLoggedIn = Boolean(localStorage.getItem("token"));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center text-slate-800">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <img src={logo} alt="BookMe" className="h-9 w-auto" />
        <span className="custom-brand-font mt-1 text-[26px] tracking-tight text-slate-900">
          BookMe
        </span>
      </Link>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
        <Compass className="h-7 w-7 text-brand-600" />
      </div>
      <h1 className="mt-5 text-[28px] font-extrabold tracking-tight text-slate-900">
        This page does not exist
      </h1>
      <p className="mt-2 max-w-md text-[14px] text-slate-500">
        The link may be old or mistyped. If you were looking for a business, it
        may have changed its name.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-ink/85"
        >
          Browse the marketplace
        </Link>
        {isBusinessLoggedIn && (
          <Link
            to="/dashboard"
            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-800 hover:border-slate-400"
          >
            Go to my dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
