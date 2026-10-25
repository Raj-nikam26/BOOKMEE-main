import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Star, TrendingDown, TrendingUp } from "lucide-react";
// Small copies of the artwork: the originals are over 1000px wide.
import greenBanner from "../../assets/thumbs/green.webp";
import purpleBanner from "../../assets/thumbs/purple.webp";
import redBanner from "../../assets/thumbs/red.webp";
import whiteBanner from "../../assets/thumbs/white.webp";
import yellowBanner from "../../assets/thumbs/yellow.webp";
import C1 from "../../assets/thumbs/C1.webp";
import C2 from "../../assets/thumbs/C2.webp";
import C3 from "../../assets/thumbs/C3.webp";
import C4 from "../../assets/thumbs/C4.webp";
import C5 from "../../assets/thumbs/C5.webp";
import C6 from "../../assets/thumbs/C6.webp";
import C7 from "../../assets/thumbs/C7.webp";
import C8 from "../../assets/thumbs/C8.webp";
import { getBrandThemeStyle } from "../../assets/dummyStyles";
import { cardStyles as s } from "../../assets/marketplaceStyles";
import { formatPrice } from "../../utils/format";

const ICON_MAP = {
  "C1.png": C1,
  "C2.png": C2,
  "C3.png": C3,
  "C4.png": C4,
  "C5.png": C5,
  "C6.png": C6,
  "C7.png": C7,
  "C8.png": C8,
};

const themeBannerImages = {
  emerald: greenBanner,
  indigo: purpleBanner,
  rose: redBanner,
  amber: yellowBanner,
  slate: whiteBanner,
};

const insightStyles = {
  lowest: { className: s.insightGood, Icon: TrendingDown },
  below: { className: s.insightGood, Icon: TrendingDown },
  average: { className: s.insightNeutral, Icon: null },
  above: { className: s.insightHigh, Icon: TrendingUp },
};

export function Rating({ average, count }) {
  if (!count) return <span className={s.ratingNew}>New</span>;

  return (
    <span className={s.rating} title={`${count} reviews`}>
      <Star className={s.ratingStar} />
      {average.toFixed(1)}
      <span className={s.ratingCount}>({count})</span>
    </span>
  );
}

export function BusinessCardSkeleton() {
  return (
    <div className={s.skeleton} aria-hidden="true">
      <div className={s.skeletonBanner} />
      <div className={`${s.skeletonLine} mt-10 w-1/3`} />
      <div className={`${s.skeletonLine} w-2/3`} />
      <div className={`${s.skeletonLine} h-9`} />
      <div className={`${s.skeletonLine} h-9`} />
    </div>
  );
}

/**
 * One business in the marketplace.
 * `compact` shows two services instead of three (used on shelves).
 */
export default function BusinessCard({ business, compact = false }) {
  const theme = getBrandThemeStyle(business.brandTheme);
  const accent = business.brandAccent || theme.accent;
  const services = business.services.slice(0, compact ? 2 : 3);
  const hiddenServices = business.serviceCount - services.length;
  const matched = business.matchedService;
  const insight = business.priceInsight
    ? insightStyles[business.priceInsight.type]
    : null;

  return (
    <article className={s.card}>
      <div className={s.banner} style={{ backgroundColor: theme.panel }}>
        <img
          src={themeBannerImages[business.brandTheme] || greenBanner}
          alt=""
          loading="lazy"
          className={s.bannerImg}
        />
        {business.reason && (
          <span className={s.reason} title={business.reason}>
            <Sparkles className={s.reasonIcon} />
            <span className={s.reasonText}>{business.reason}</span>
          </span>
        )}
      </div>

      <div className="relative">
        <div className={s.avatar} style={{ backgroundColor: accent }}>
          {business.businessName.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className={s.body}>
        <div className={s.metaRow}>
          <span className={s.category}>{business.categoryLabel}</span>
          <Rating
            average={business.ratingAverage}
            count={business.ratingCount}
          />
        </div>
        <h3 className={s.title}>{business.businessName}</h3>
        <p className={s.description}>
          {business.businessDescription || "Book an appointment online."}
        </p>

        <div className={s.services}>
          {services.map((service) => (
            <div
              key={`${service.name}-${service.duration}`}
              className={
                matched?.name === service.name ? s.serviceMatched : s.service
              }
            >
              <img
                src={ICON_MAP[service.icon] || C1}
                alt=""
                loading="lazy"
                className={s.serviceIcon}
              />
              <span className={s.serviceName}>{service.name}</span>
              <span className={s.serviceDuration}>{service.duration}m</span>
              <span className={s.servicePrice}>
                {formatPrice(service.price)}
              </span>
            </div>
          ))}
        </div>

        {insight ? (
          <span className={insight.className}>
            {insight.Icon && <insight.Icon className={s.insightIcon} />}
            {business.priceInsight.label}
          </span>
        ) : (
          hiddenServices > 0 && (
            <p className={s.more}>
              +{hiddenServices} more{" "}
              {hiddenServices === 1 ? "service" : "services"}
            </p>
          )
        )}

        <div className={s.footer}>
          <div>
            <p className={s.fromLabel}>
              {matched ? matched.name : "Starting from"}
            </p>
            <p className={s.fromPrice}>
              {formatPrice(matched ? matched.price : business.startingPrice)}
            </p>
          </div>
          <Link
            to={`/book/${business.slug}`}
            className={s.book}
            style={{ backgroundColor: accent }}
          >
            Book
            <ArrowRight className={s.bookIcon} />
          </Link>
        </div>
      </div>
    </article>
  );
}
