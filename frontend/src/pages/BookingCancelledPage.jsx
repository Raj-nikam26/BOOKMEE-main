import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, XCircle } from "lucide-react";
import { cancelBookingPayment } from "../api/public";
import { bookingCancelledPageStyles as s } from "../assets/dummyStyles";

export default function BookingCancelledPage() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const token = searchParams.get("token");
  const slug = searchParams.get("slug");

  // Release the slot that was held while the customer was at checkout.
  useEffect(() => {
    if (bookingId && token) {
      cancelBookingPayment(bookingId, token).catch(() => {});
    }
  }, [bookingId, token]);

  return (
    <div className={s.container}>
      <div className={s.card}>
        <div className={s.iconCircle}>
          <XCircle className={s.icon} />
        </div>
        <p className={s.statusLabel}>Payment cancelled</p>
        <h1 className={s.heading}>No booking was created</h1>
        <p className={s.description}>
          Your payment was not completed, so the time slot has been released.
          You can pick a time and try again.
        </p>
        <Link to={slug ? `/book/${slug}` : "/"} className={s.homeLink}>
          <ArrowLeft className={s.homeLinkIcon} />
          Back to booking page
        </Link>
      </div>
    </div>
  );
}
