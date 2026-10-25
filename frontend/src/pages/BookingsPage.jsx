import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  ExternalLink,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import AppLayout from "../components/AppLayout";
import {
  listBookings,
  rescheduleBooking,
  updateBookingStatus,
} from "../api/bookings";
import p7Image from "../assets/P7.png";
import A1 from "../assets/avatars/A1.png";
import A2 from "../assets/avatars/A2.png";
import A3 from "../assets/avatars/A3.png";
import A4 from "../assets/avatars/A4.png";
import A5 from "../assets/avatars/A5.png";
import A6 from "../assets/avatars/A6.png";
import A7 from "../assets/avatars/A7.png";
import A8 from "../assets/avatars/A8.png";
import A9 from "../assets/avatars/A9.png";
import A10 from "../assets/avatars/A10.png";
import A11 from "../assets/avatars/A11.png";
import A12 from "../assets/avatars/A12.png";
import A13 from "../assets/avatars/A13.png";
import A15 from "../assets/avatars/A15.png";
import A16 from "../assets/avatars/A16.png";
import { bookingsPageStyles as s } from "../assets/dummyStyles";

const AVATAR_MAP = {
  "A1.png": A1,
  "A2.png": A2,
  "A3.png": A3,
  "A4.png": A4,
  "A5.png": A5,
  "A6.png": A6,
  "A7.png": A7,
  "A8.png": A8,
  "A9.png": A9,
  "A10.png": A10,
  "A11.png": A11,
  "A12.png": A12,
  "A13.png": A13,
  "A15.png": A15,
  "A16.png": A16,
};

const statusFilters = ["all", "confirmed", "pending", "rescheduled", "cancelled"];

const formatTimestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [paging, setPaging] = useState({ page: 1, hasMore: false, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState({ date: "", status: "all" });
  const [message, setMessage] = useState("");
  const [cancelModalBookingId, setCancelModalBookingId] = useState(null);
  const [rescheduleModalBooking, setRescheduleModalBooking] = useState(null);
  const [reschedules, setReschedules] = useState({});

  const buildParams = (page) => {
    const params = { page };
    if (filters.date) params.date = filters.date;
    if (filters.status !== "all") params.status = filters.status;
    return params;
  };

  // First page, whenever a filter changes.
  useEffect(() => {
    const params = { page: 1 };
    if (filters.date) params.date = filters.date;
    if (filters.status !== "all") params.status = filters.status;

    listBookings(params)
      .then(({ data }) => {
        setBookings(data.bookings || []);
        setPaging({ page: 1, hasMore: data.hasMore, total: data.total });
      })
      .catch((error) =>
        setMessage(error.response?.data?.message || "Could not load bookings"),
      );
  }, [filters]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data } = await listBookings(buildParams(paging.page + 1));
      setBookings((prev) => [...prev, ...(data.bookings || [])]);
      setPaging({ page: data.page, hasMore: data.hasMore, total: data.total });
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load bookings");
    } finally {
      setLoadingMore(false);
    }
  };

  const cancelModalBooking = bookings.find(
    (booking) => booking._id === cancelModalBookingId,
  );

  const replaceBooking = (updated) => {
    setBookings((prev) =>
      prev.map((booking) => (booking._id === updated._id ? updated : booking)),
    );
  };

  const setStatus = async (booking, status) => {
    setMessage("");

    try {
      const { data } = await updateBookingStatus(booking._id, status);
      replaceBooking(data.booking);
      setMessage(`Booking ${status} successfully`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not update booking");
    }
  };

  const updateRescheduleDraft = (booking, field, value) => {
    setReschedules((prev) => ({
      ...prev,
      [booking._id]: {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        ...prev[booking._id],
        [field]: value,
      },
    }));
  };

  const submitReschedule = async (booking) => {
    const draft = reschedules[booking._id];
    if (!draft) return;

    if (draft.startTime >= draft.endTime) {
      setMessage("End time must be after the start time");
      return;
    }

    setMessage("");

    try {
      const { data } = await rescheduleBooking(booking._id, draft);
      replaceBooking(data.booking);
      setReschedules((prev) => ({ ...prev, [booking._id]: undefined }));
      setMessage("Booking rescheduled successfully");
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not reschedule booking",
      );
    }
  };

  return (
    <AppLayout>
      {/* Header + filters */}
      <section className={s.headerSection}>
        <div className={s.headerLeftArea}>
          <div>
            <p className={s.bookingLabel}>Bookings</p>
            <h1 className={s.mainHeading}>
              Every appointment in{" "}
              <span className={s.mainHeadingGradient}>one place.</span>
            </h1>
            <p className={s.subText}>
              Filter, reschedule, or cancel bookings. Customers are notified
              automatically.
            </p>
          </div>
          <div className={s.illustrationContainer}>
            <img
              src={p7Image}
              alt="Illustration"
              className={s.illustrationImg}
            />
          </div>
        </div>

        <div className={s.filterRow}>
          <div className={s.filterDateContainer}>
            <CalendarDays className={s.filterIcon} />
            <input
              type="date"
              value={filters.date}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, date: event.target.value }))
              }
              className={s.filterDateInput}
            />
          </div>
          <div className={s.filterStatusContainer}>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className={s.filterStatusSelect}
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className={s.filterSelectIcon} />
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`${s.messageBanner} ${
            message.includes("successfully")
              ? s.messageBannerSuccess
              : s.messageBannerInfo
          }`}
        >
          {message}
        </div>
      )}

      {/* Booking cards */}
      <section className={s.bookingListSection}>
        {bookings.length === 0 && (
          <div className={s.emptyStateContainer}>
            <CalendarDays className={s.emptyStateIcon} />
            <p className={s.emptyStateText}>
              {filters.date || filters.status !== "all"
                ? "No bookings match these filters."
                : "No bookings yet. Share your booking link from the Profile page to get your first one."}
            </p>
          </div>
        )}

        {bookings.map((booking) => (
          <article key={booking._id} className={s.cardContainer}>
            <div className={s.cardInnerLayout}>
              {/* Left: booking info */}
              <div className={s.cardLeftBlock}>
                <div className={s.badgesContainer}>
                  <span
                    className={`${s.statusBadgeBase} ${s.statusBadgeClassMap[booking.status] || s.statusBadgeClassMap.default}`}
                  >
                    <Check className={s.badgeIcon} />
                    {booking.status.replace("_", " ")}
                  </span>
                  <span
                    className={`${s.paymentBadgeBase} ${s.paymentBadgeClassMap[booking.paymentStatus] || s.paymentBadgeClassMap.default}`}
                  >
                    <CreditCard className={s.badgeIcon} />
                    Payment:{" "}
                    {booking.paymentStatus?.replace("_", " ") || "Not Required"}
                  </span>
                  {booking.rescheduleCount > 0 && (
                    <span
                      className={`${s.paymentBadgeBase} bg-orange-100 text-orange-700 ml-2`}
                    >
                      <RefreshCcw className={s.badgeIcon} />
                      Rescheduled ({booking.rescheduleCount})
                    </span>
                  )}
                </div>

                <div className={s.customerInfoRow}>
                  <div className={s.customerAvatarContainer}>
                    <img
                      src={AVATAR_MAP[booking.customerAvatar || "A1.png"]}
                      alt={booking.customerName}
                      className={s.customerAvatarImg}
                    />
                  </div>
                  <div>
                    <h2 className={s.customerName}>{booking.customerName}</h2>
                    <p className={s.customerEmail}>{booking.customerEmail}</p>
                  </div>
                </div>

                <div className={s.bookingDetailsRow}>
                  <div className={s.bookingDetailsIconContainer}>
                    <CalendarDays className={s.bookingDetailsIcon} />
                  </div>
                  <div className={s.bookingDetailsTextContainer}>
                    <p className={s.bookingDateTimeText}>
                      {booking.date} • {booking.startTime} - {booking.endTime}
                    </p>
                    <div className={s.bookingServiceRow}>
                      <div className={s.bookingServiceDot}></div>
                      <p className={s.bookingServiceText}>
                        {booking.serviceId?.name || "Meeting"}
                        {booking.notes ? ` • ${booking.notes}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={s.timestampsContainer}>
                  <span className={s.timestampSpan}>
                    <Clock className={s.timestampIcon} />
                    Created: {formatTimestamp(booking.createdAt)}
                  </span>
                  <span className={s.timestampSpan}>
                    <RefreshCcw className={s.timestampIcon} />
                    Last updated: {formatTimestamp(booking.updatedAt)}
                  </span>
                </div>

                <div className={s.calendarSyncRow}>
                  <Calendar className={s.timestampIcon} />
                  Calendar:{" "}
                  {booking.googleEventId ? "Synced to Google" : "Not synced"}
                </div>

                {booking.customerCalendarUrl ? (
                  <a
                    href={booking.customerCalendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={s.calendarLinkButton}
                  >
                    Customer calendar link
                    <ExternalLink className={s.calendarLinkIcon} />
                  </a>
                ) : (
                  <span className={s.calendarLinkUnavailable}>
                    Calendar link unavailable
                    <ExternalLink className={s.calendarLinkIcon} />
                  </span>
                )}
              </div>

              {/* Right: action buttons */}
              <div className={s.cardRightBlock}>
                <div className={s.actionButtonsContainer}>
                  {booking.status !== "cancelled" &&
                    booking.status !== "payment_failed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setRescheduleModalBooking(booking)}
                          className={s.rescheduleButton}
                        >
                          <CalendarDays className={s.actionIcon} />
                          Reschedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelModalBookingId(booking._id)}
                          className={s.cancelButton}
                        >
                          <XCircle className={s.actionIcon} />
                          Cancel
                        </button>
                      </>
                    )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {paging.hasMore && (
        <div className="-mt-6 flex flex-col items-center gap-2 pb-12">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-[14px] font-semibold text-slate-800 shadow-sm hover:border-slate-400 disabled:opacity-60"
          >
            {loadingMore ? "Loading..." : "Show more bookings"}
          </button>
          <p className="text-[12px] text-slate-400">
            Showing {bookings.length} of {paging.total}
          </p>
        </div>
      )}

      {/* Modals */}
      {cancelModalBookingId && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Cancel Booking</h2>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <p className={s.modalMessage}>
                Are you sure you want to cancel this booking? This action cannot
                be undone, and the customer will be notified.
              </p>
              {cancelModalBooking?.paymentStatus === "paid" && (
                <p className="-mt-3 mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-800">
                  This booking is paid. Cancelling here does not refund the
                  customer. Please arrange the refund with them yourself.
                </p>
              )}
            </div>
            <div className={s.modalFooter}>
              <button
                onClick={() => setCancelModalBookingId(null)}
                className={s.modalButtonSecondary}
              >
                Keep Booking
              </button>
              <button
                onClick={() => {
                  setStatus({ _id: cancelModalBookingId }, "cancelled");
                  setCancelModalBookingId(null);
                }}
                className={s.modalButtonDanger}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rescheduleModalBooking && (
        <div className={s.modalOverlay}>
          <div className={s.modalContent}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Reschedule Booking</h2>
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalCloseBtn}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.rescheduleGrid}>
                <div className={s.rescheduleInputContainer}>
                  <CalendarDays className={s.rescheduleInputIcon} />
                  <input
                    type="date"
                    value={
                      reschedules[rescheduleModalBooking._id]?.date ??
                      rescheduleModalBooking.date
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "date",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.startTime ??
                      rescheduleModalBooking.startTime
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "startTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
                <div className={s.rescheduleInputContainer}>
                  <Clock className={s.rescheduleInputIcon} />
                  <input
                    type="time"
                    value={
                      reschedules[rescheduleModalBooking._id]?.endTime ??
                      rescheduleModalBooking.endTime
                    }
                    onChange={(event) =>
                      updateRescheduleDraft(
                        rescheduleModalBooking,
                        "endTime",
                        event.target.value,
                      )
                    }
                    className={s.rescheduleInputField}
                  />
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <button
                onClick={() => {
                  setRescheduleModalBooking(null);
                  setReschedules((prev) => ({
                    ...prev,
                    [rescheduleModalBooking._id]: undefined,
                  }));
                }}
                className={s.modalButtonSecondary}
              >
                Discard
              </button>
              <button
                onClick={() => {
                  submitReschedule(rescheduleModalBooking);
                  setRescheduleModalBooking(null);
                }}
                className={s.modalButtonPrimary}
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
