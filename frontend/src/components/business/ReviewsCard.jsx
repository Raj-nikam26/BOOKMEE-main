import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { listMyReviews } from "../../api/bookings";
import { reviewsStyles as s } from "../../assets/appShellStyles";

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/**
 * What customers said about the logged-in business, with its average rating.
 */
export default function ReviewsCard({ user }) {
  const [data, setData] = useState({ reviews: [], page: 0, hasMore: false });
  const [loading, setLoading] = useState(false);

  const loadPage = async (page) => {
    setLoading(true);
    try {
      const { data: response } = await listMyReviews(page);
      setData((prev) => ({
        ...response,
        reviews: page === 1 ? response.reviews : [...prev.reviews, ...response.reviews],
      }));
    } catch {
      // The card is optional; the dashboard still works without it.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listMyReviews(1)
      .then(({ data: response }) => setData(response))
      .catch(() => {});
  }, []);

  return (
    <section className={s.card}>
      <div className={s.header}>
        <h3 className={s.title}>Customer reviews</h3>
        {user?.ratingCount > 0 && (
          <div className={s.summary}>
            <Star className={s.star} />
            <span className={s.average}>{user.ratingAverage.toFixed(1)}</span>
            <span className={s.count}>
              from {user.ratingCount}{" "}
              {user.ratingCount === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>

      {data.page > 0 && data.reviews.length === 0 ? (
        <div className={s.empty}>
          <p className={s.emptyTitle}>No reviews yet</p>
          <p className={s.emptyText}>
            Customers with an account can rate you after their appointment.
            Ratings show on your marketplace card.
          </p>
        </div>
      ) : (
        <ul className={s.list}>
          {data.reviews.map((review) => (
            <li key={review._id} className={s.item}>
              <div className={s.itemTop}>
                <span className={s.name}>{review.customerName}</span>
                <span className={s.date}>{formatDate(review.createdAt)}</span>
              </div>
              <div
                className={s.stars}
                role="img"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={
                      value <= review.rating ? s.starSmallOn : s.starSmallOff
                    }
                  />
                ))}
              </div>
              {review.comment && <p className={s.comment}>{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}

      {data.hasMore && (
        <button
          type="button"
          onClick={() => loadPage(data.page + 1)}
          disabled={loading}
          className={s.more}
        >
          {loading ? "Loading..." : "Show more reviews"}
        </button>
      )}
    </section>
  );
}
