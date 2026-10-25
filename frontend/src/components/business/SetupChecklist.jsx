import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { getAvailability } from "../../api/availability";
import { setupStyles as s } from "../../assets/appShellStyles";

/**
 * Guides a new business through what it needs before customers can book.
 * Disappears once every step is done.
 */
export default function SetupChecklist({ user, services, bookings }) {
  const [hasAvailability, setHasAvailability] = useState(null);

  useEffect(() => {
    getAvailability()
      .then(({ data }) =>
        setHasAvailability(
          (data.availability || []).some((day) => day.slots?.length > 0),
        ),
      )
      .catch(() => setHasAvailability(null));
  }, []);

  // Wait until everything is known, so the card never flashes for a finished account.
  if (!user || hasAvailability === null) return null;

  const hasActiveService = services.some((service) => service.isActive);

  const steps = [
    {
      title: "Add your first service",
      text: "What customers book: a name, duration and price.",
      done: hasActiveService,
      to: "/services",
      action: "Add service",
    },
    {
      title: "Set your opening hours",
      text: "Customers can only book inside the hours you set.",
      done: hasAvailability,
      to: "/availability",
      action: "Set hours",
    },
    {
      title: "Describe your business",
      text: "A short description and the right category help customers find you.",
      done: Boolean(user.businessDescription),
      to: "/profile",
      action: "Edit profile",
    },
    {
      title: "Add payout details",
      text: "Where your earnings from paid bookings are sent.",
      done: Boolean(user.payoutDetails?.isComplete),
      to: "/payments",
      action: "Add details",
    },
    {
      title: "Get your first booking",
      text: "Share your booking link, or wait for customers to find you in the marketplace.",
      done: bookings.length > 0,
      to: "/profile",
      action: "Get link",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;

  const isLive = hasActiveService && hasAvailability;

  return (
    <section className={s.card} aria-label="Getting started">
      <div className={s.top}>
        <div>
          <p className={s.eyebrow}>Getting started</p>
          <h2 className={s.title}>
            {isLive
              ? "You are live. A few things left to finish."
              : "Set up your business to start taking bookings"}
          </h2>
          <p className={s.text}>
            {isLive
              ? "Customers can already find and book you in the marketplace."
              : "Your business appears in the marketplace as soon as you have an active service and opening hours."}
          </p>
        </div>
        <div className={s.progressWrap}>
          <div className={s.progressLabel}>
            <span>Progress</span>
            <span>
              {doneCount} of {steps.length}
            </span>
          </div>
          <div className={s.progressTrack}>
            <div
              className={s.progressFill}
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol className={s.steps}>
        {steps.map((step, index) => (
          <li key={step.title} className={step.done ? s.stepDone : s.step}>
            {step.done ? (
              <span className={s.stepIconDone}>
                <Check className={s.stepCheck} />
              </span>
            ) : (
              <span className={s.stepIconTodo}>{index + 1}</span>
            )}
            <div className="min-w-0">
              <p className={step.done ? s.stepTitleDone : s.stepTitle}>
                {step.title}
              </p>
              {!step.done && <p className={s.stepText}>{step.text}</p>}
            </div>
            {!step.done && (
              <Link to={step.to} className={s.stepAction}>
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
