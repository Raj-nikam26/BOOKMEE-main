import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  IndianRupee,
  RotateCcw,
  Star,
  XCircle,
} from "lucide-react";
import {
  cancelMyBooking,
  listMyBookings,
  reviewMyBooking,
} from "../api/customer";
import { getBrandThemeStyle } from "../assets/dummyStyles";
import { bookingsStyles as s } from "../assets/marketplaceStyles";
import MarketplaceHeader from "../components/marketplace/MarketplaceHeader";
import {
  clearCustomerSession,
  getCustomerSession,
} from "../utils/customerSession";

const statusClass = {
  confirmed: s.statusConfirmed,
  cancelled: s.statusCancelled,
  pending: s.statusPending,
};

const formatAmount = (paise) =>
  paise > 0 ? `₹${(paise / 100).toLocaleString("en-IN")}` : "Free";

const parseDate = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

function ReviewForm({ onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    await onSubmit({ rating, comment });
    setSaving(false);
  };

  return (
    <div className={s.reviewBox}>
      <p className={s.reviewLabel}>How was it?</p>
      <div className={s.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            aria-pressed={rating === value}
            className={s.starButton}
          >
            <Star className={value <= rating ? s.starOn : s.starOff} />
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        maxLength={500}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Add a short comment (optional)"
        className={s.reviewInput}
      />
      <div className={s.reviewActions}>
        <button
          type="button"
          onClick={submit}
          disabled={!rating || saving}
          className={`${s.actionPrimary} disabled:opacity-50`}
        >
          {saving ? "Saving..." : "Submit review"}
        </button>
        <button type="button" onClick={onCancel} className={s.action}>
          Not now
        </button>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [customer] = useState(getCustomerSession);
  const [searchParams] = useSearchParams();
  const [when, setWhen] = useState(
    searchParams.get("tab") === "past" ? "past" : "upcoming",
  );
  const [data, setData] = useState({
    when: null, // which tab these bookings belong to
    bookings: [],
    page: 1,
    hasMore: false,
  });
  const [loadFailed, setLoadFailed] = useState(false);
  const loading = data.when !== when && !loadFailed;
  const [loadingMore, setLoadingMore] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewingId, setReviewingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const logout = () => {
    clearCustomerSession();
    navigate("/");
  };

  useEffect(() => {
    if (!customer) return undefined;
    let cancelled = false;

    listMyBookings({ when, page: 1 })
      .then(({ data: response }) => {
        if (cancelled) return;
        setData({ ...response, when });
        setLoadFailed(false);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.response?.status === 401) {
          clearCustomerSession();
          navigate("/login");
          return;
        }
        setLoadFailed(true);
        setMessage("Could not load your bookings. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [when, customer, navigate]);

  if (!customer) {
    return <Navigate to="/login" replace />;
  }

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data: response } = await listMyBookings({
        when,
        page: data.page + 1,
      });
      setData((prev) => ({
        ...response,
        when: prev.when,
        bookings: [...prev.bookings, ...response.bookings],
      }));
    } catch {
      setMessage("Could not load more bookings. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateBooking = (id, changes) => {
    setData((prev) => ({
      ...prev,
      bookings: prev.bookings.map((booking) =>
        booking.id === id ? { ...booking, ...changes } : booking,
      ),
    }));
  };

  const cancelBooking = async (id) => {
    setConfirmCancelId(null);
    try {
      await cancelMyBooking(id);
      setData((prev) => ({
        ...prev,
        bookings: prev.bookings.filter((booking) => booking.id !== id),
      }));
      setMessage("Booking cancelled. You can find it under Past.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not cancel booking");
    }
  };

  const submitReview = async (id, review) => {
    try {
      const { data: response } = await reviewMyBooking(id, review);
      updateBooking(id, { review: response.review });
      setReviewingId(null);
      setMessage("Thanks for your review.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not save review");
    }
  };

  const switchTab = (next) => {
    setWhen(next);
    setMessage("");
    setReviewingId(null);
    setConfirmCancelId(null);
  };

  return (
    <div className={s.page}>
      <MarketplaceHeader customer={customer} onLogout={logout} />

      <main className={s.main}>
        <h1 className={s.title}>My bookings</h1>
        <p className={s.subtitle}>
          Everything you have booked with your account.
        </p>

        <div className={s.tabs} role="tablist">
          {["upcoming", "past"].map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={when === tab}
              onClick={() => switchTab(tab)}
              className={when === tab ? s.tabActive : s.tab}
            >
              {tab === "upcoming" ? "Upcoming" : "Past"}
            </button>
          ))}
        </div>

        {message && <p className={s.message}>{message}</p>}

        {!loading && data.bookings.length === 0 && (
          <div className={s.empty}>
            <CalendarDays className={s.emptyIcon} />
            <p className={s.emptyTitle}>
              {when === "upcoming"
                ? "No upcoming bookings"
                : "No past bookings yet"}
            </p>
            <p className={s.emptyText}>
              Bookings you make while logged in show up here.
            </p>
            <Link to="/" className={s.emptyLink}>
              Find a service
            </Link>
          </div>
        )}

        <div className={s.list}>
          {!loading && data.bookings.map((booking) => {
            const date = parseDate(booking.date);
            const accent =
              booking.business?.brandAccent ||
              getBrandThemeStyle(booking.business?.brandTheme).accent;
            const canCancel =
              booking.status !== "cancelled" &&
              !booking.hasStarted &&
              booking.paymentStatus !== "paid";
            const canReview =
              booking.status === "confirmed" &&
              booking.hasStarted &&
              !booking.review;

            return (
              <article key={booking.id} className={s.card}>
                <div className={s.row}>
                  <div
                    className={s.dateBox}
                    style={{ backgroundColor: accent }}
                  >
                    <span className={s.dateDay}>{date.getDate()}</span>
                    <span className={s.dateMonth}>
                      {date.toLocaleString("en-IN", { month: "short" })}
                    </span>
                  </div>

                  <div className={s.info}>
                    <div className={s.topLine}>
                      {booking.business ? (
                        <Link
                          to={`/book/${booking.business.slug}`}
                          className={s.business}
                        >
                          {booking.business.name}
                        </Link>
                      ) : (
                        <span className={s.business}>Business removed</span>
                      )}
                      <span
                        className={`${s.status} ${statusClass[booking.status] || s.statusPending}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <p className={s.service}>
                      {booking.service?.name || "Appointment"}
                    </p>
                    <div className={s.meta}>
                      <span className={s.metaItem}>
                        <CalendarDays className={s.metaIcon} />
                        {date.toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className={s.metaItem}>
                        <Clock className={s.metaIcon} />
                        {booking.startTime} - {booking.endTime}
                      </span>
                      <span className={s.metaItem}>
                        <IndianRupee className={s.metaIcon} />
                        {formatAmount(booking.amount)}
                        {booking.paymentStatus === "paid" && " · paid"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={s.actions}>
                  {booking.business && (
                    <Link
                      to={`/book/${booking.business.slug}`}
                      className={s.actionPrimary}
                    >
                      <RotateCcw className={s.actionIcon} />
                      Book again
                    </Link>
                  )}
                  {booking.calendarUrl &&
                    !booking.hasStarted &&
                    booking.status !== "cancelled" && (
                    <a
                      href={booking.calendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={s.action}
                    >
                      <CalendarPlus className={s.actionIcon} />
                      Add to calendar
                    </a>
                  )}
                  {canReview && reviewingId !== booking.id && (
                    <button
                      type="button"
                      onClick={() => setReviewingId(booking.id)}
                      className={s.action}
                    >
                      <Star className={s.actionIcon} />
                      Rate this booking
                    </button>
                  )}
                  {canCancel &&
                    (confirmCancelId === booking.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => cancelBooking(booking.id)}
                          className={s.actionDanger}
                        >
                          Yes, cancel it
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(null)}
                          className={s.action}
                        >
                          Keep booking
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(booking.id)}
                        className={s.actionDanger}
                      >
                        <XCircle className={s.actionIcon} />
                        Cancel
                      </button>
                    ))}
                </div>

                {!booking.hasStarted && booking.status === "confirmed" && (
                  <p className={s.note}>
                    You can rate this booking after your appointment.
                  </p>
                )}

                {!booking.hasStarted &&
                  booking.status !== "cancelled" &&
                  booking.paymentStatus === "paid" && (
                    <p className={s.note}>
                      This booking is paid. To cancel and get a refund, contact
                      the business.
                    </p>
                  )}

                {reviewingId === booking.id && (
                  <ReviewForm
                    onSubmit={(review) => submitReview(booking.id, review)}
                    onCancel={() => setReviewingId(null)}
                  />
                )}

                {booking.review && (
                  <p className={s.given}>
                    You rated this
                    <span className="flex items-center gap-0.5 font-bold text-slate-900">
                      {booking.review.rating}
                      <Star className={s.givenStar} />
                    </span>
                    {booking.review.comment && (
                      <span>“{booking.review.comment}”</span>
                    )}
                  </p>
                )}
              </article>
            );
          })}
        </div>

        {!loading && data.hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={s.loadMore}
          >
            {loadingMore ? "Loading..." : "Show more"}
          </button>
        )}
      </main>
    </div>
  );
}
