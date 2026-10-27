import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CalendarX, X } from "lucide-react";
import { getBookingUpdates } from "../../api/bookings";
import {
  BOOKINGS_CHANGED_EVENT,
  bookingAlertState,
} from "../../utils/bookingAlertState";

const POLL_INTERVAL_MS = 15 * 1000;
const TOAST_LIFETIME_MS = 10 * 1000;

const formatAmount = (paise) =>
  paise > 0 ? ` · ₹${(paise / 100).toLocaleString("en-IN")}` : "";

/**
 * Checks for new bookings and customer cancellations every few seconds while the
 * business app is open, shows a pop-up for each one, and tells the open page to
 * refresh. `onNew(unseen)` gets the number of new bookings not yet seen.
 */
export default function BookingAlerts({ onNew }) {
  const [toasts, setToasts] = useState([]);
  const onNewRef = useRef(onNew);

  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  useEffect(() => {
    let stopped = false;

    const check = async () => {
      // No point checking while the tab is in the background.
      if (document.hidden) return;

      try {
        const { data } = await getBookingUpdates(bookingAlertState.since);
        if (stopped) return;
        bookingAlertState.since = data.now;

        if (data.updates.length > 0) {
          setToasts((prev) => [...prev, ...data.updates].slice(-4));
          bookingAlertState.unseen += data.updates.filter((u) => u.type === "booked").length;
          onNewRef.current?.(bookingAlertState.unseen);
          window.dispatchEvent(new Event(BOOKINGS_CHANGED_EVENT));
        }
      } catch {
        // A missed check is fine; the next one catches up.
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    // Coming back to the tab checks straight away.
    const onVisible = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Each pop-up disappears on its own after a while.
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timeout = setTimeout(() => setToasts((prev) => prev.slice(1)), TOAST_LIFETIME_MS);
    return () => clearTimeout(timeout);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex w-[340px] max-w-[calc(100vw-2.5rem)] flex-col gap-3"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const isBooked = toast.type === "booked";
        const Icon = isBooked ? CalendarCheck : CalendarX;

        return (
          <div
            key={`${toast.type}-${toast.id}`}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-pop"
          >
            <span
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                isBooked ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink">
                {isBooked ? "New booking" : "Booking cancelled by customer"}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-slate-600">
                {toast.customerName} · {toast.serviceName}
              </p>
              <p className="text-[12px] text-slate-500">
                {toast.date} at {toast.startTime}
                {isBooked && formatAmount(toast.amount)}
              </p>
              <Link
                to="/business/bookings"
                className="mt-1.5 inline-block text-[12px] font-semibold text-brand-600 hover:underline"
              >
                View bookings
              </Link>
            </div>
            <button
              type="button"
              onClick={() =>
                setToasts((prev) => prev.filter((item) => item !== toast))
              }
              aria-label="Dismiss"
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
