import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shelfStyles as s } from "../../assets/marketplaceStyles";
import BusinessCard from "./BusinessCard";

/**
 * A titled row of business cards that scrolls sideways.
 * `action` is an optional element shown next to the arrows.
 */
export default function Shelf({ title, subtitle, items, action, children }) {
  const trackRef = useRef(null);

  const scroll = (direction) => {
    const track = trackRef.current;
    track?.scrollBy({ left: direction * track.clientWidth * 0.85 });
  };

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div className="min-w-0">
          <h2 className={s.title}>{title}</h2>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {action}
          <div className={s.arrows}>
            <button
              type="button"
              onClick={() => scroll(-1)}
              className={s.arrow}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft className={s.arrowIcon} />
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className={s.arrow}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight className={s.arrowIcon} />
            </button>
          </div>
        </div>
      </div>

      {children}

      <div ref={trackRef} className={s.track}>
        {items.map((business) => (
          <div key={business.id} className={s.item}>
            <BusinessCard business={business} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
