import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, CalendarDays, Check } from "lucide-react";
import { getBookingStatus } from "../api/public";
import { bookingSuccessPageStyles as s } from "../assets/dummyStyles";

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("Confirming your payment...");

  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");
  const token = searchParams.get("token");
  const slug = searchParams.get("slug");

  useEffect(() => {
    const loadBooking = async () => {
      try {
        const { data } = await getBookingStatus(
          sessionId
            ? { session_id: sessionId }
            : { booking_id: bookingId, token },
        );
        setBooking(data.booking);
        setMessage("");
      } catch (error) {
        setMessage(
          error.response?.data?.message || "Could not confirm this booking",
        );
      }
    };

    loadBooking();
  }, [sessionId, bookingId, token]);

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.iconCircle}>
          <Check className={s.checkIcon} />
        </div>
        <p className={s.statusLabel}>
          {booking ? "Booking confirmed" : "Booking status"}
        </p>
        <h1 className={s.heading}>
          {booking ? "You're all set!" : message}
        </h1>

        {booking && (
          <div className={s.bookingDetails}>
            <div className={s.serviceRow}>
              <CalendarDays className={s.calendarDaysIcon} />
              <span className={s.serviceName}>
                {booking.serviceId?.name || "Appointment"}
              </span>
            </div>
            <p className={s.detailText}>
              {booking.date} • {booking.startTime} - {booking.endTime}
            </p>
            <p className={s.statusText}>
              Status: {booking.status.replace("_", " ")} • Payment:{" "}
              {booking.paymentStatus.replace("_", " ")}
            </p>
          </div>
        )}

        {booking?.customerCalendarUrl && (
          <a
            href={booking.customerCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className={s.addToCalendarLink}
          >
            <Calendar className={s.calendarIcon} />
            Add to Google Calendar
          </a>
        )}

        {slug && (
          <Link to={`/book/${slug}`} className={s.backLink}>
            <ArrowLeft className={s.backIcon} />
            Back to booking page
          </Link>
        )}
      </div>
    </div>
  );
}
