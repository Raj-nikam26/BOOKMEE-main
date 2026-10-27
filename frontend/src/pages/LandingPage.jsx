import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  TrendingDown,
} from "lucide-react";
import {
  getMyBookingSummary,
  getRecommendations,
  updateCustomerInterests,
} from "../api/customer";
import { listPublicBusinesses } from "../api/public";
import logo from "../assets/thumbs/logo.webp";
import { headerStyles, homeStyles as s } from "../assets/marketplaceStyles";
import BusinessCard, {
  BusinessCardSkeleton,
} from "../components/marketplace/BusinessCard";
import ExploreShelf from "../components/marketplace/ExploreShelf";
import HeroPreview from "../components/marketplace/HeroPreview";
import MarketplaceHeader from "../components/marketplace/MarketplaceHeader";
import Shelf from "../components/marketplace/Shelf";
import { CATEGORIES } from "../constants/categories";
import {
  clearCustomerSession,
  getCustomerSession,
  isBusinessLoggedIn,
  saveCustomerSession,
} from "../utils/customerSession";
import { formatPrice } from "../utils/format";

const SORT_OPTIONS = [
  { id: "recommended", label: "Most popular" },
  { id: "rating", label: "Top rated" },
  { id: "price-low", label: "Price: low to high" },
  { id: "price-high", label: "Price: high to low" },
  { id: "newest", label: "Newest" },
];

const QUICK_SEARCHES = ["Haircut", "Yoga", "Consultation", "Tax", "Cleaning"];

const steps = [
  {
    icon: Search,
    title: "Search and compare",
    text: "Search a service and see every business that offers it, with ratings and how each price compares to the average.",
  },
  {
    icon: CalendarDays,
    title: "Pick a time",
    text: "Choose a free slot from live availability. With an account you skip the email code every time.",
  },
  {
    icon: BadgeCheck,
    title: "Get confirmed",
    text: "Pay securely if the service is paid, get your confirmation, and find it later under My bookings.",
  },
];

const emptyDirectory = {
  key: null, // which search/category/sort these results belong to
  businesses: [],
  total: 0,
  page: 1,
  hasMore: false,
  priceStats: null,
};

export default function LandingPage() {
  const [customer, setCustomer] = useState(getCustomerSession);
  const [recommendations, setRecommendations] = useState(null);
  const [editingInterests, setEditingInterests] = useState(false);
  const [toReview, setToReview] = useState(0);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recommended");
  const [directory, setDirectory] = useState(emptyDirectory);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const directoryRef = useRef(null);
  const scrollPending = useRef(false);

  const isFiltering = Boolean(search || category);
  // Results on screen are stale until they match what is currently selected.
  const requestKey = `${search}|${category}|${sort}`;
  const loading = directory.key !== requestKey && !error;
  const categoryLabel = CATEGORIES.find((item) => item.id === category)?.label;

  const loadRecommendations = useCallback(() => {
    getRecommendations()
      .then(({ data }) => setRecommendations(data))
      .catch(() => setRecommendations(null));
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations, customer?.id]);

  // Finished appointments the customer has not rated yet.
  useEffect(() => {
    if (!customer) return;
    getMyBookingSummary()
      .then(({ data }) => setToReview(data.toReview || 0))
      .catch(() => {});
  }, [customer]);

  // Search as the customer types, after a short pause.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // First page, whenever the search, category or sort order changes.
  useEffect(() => {
    let cancelled = false;
    const key = `${search}|${category}|${sort}`;

    listPublicBusinesses({ search, category, sort, page: 1 })
      .then(({ data }) => {
        if (cancelled) return;
        setDirectory({ ...data, key });
        setError("");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load businesses. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [search, category, sort]);

  const loadMore = async () => {
    setLoadingMore(true);

    try {
      const { data } = await listPublicBusinesses({
        search,
        category,
        sort,
        page: directory.page + 1,
      });
      setDirectory((prev) => ({
        ...data,
        key: prev.key,
        businesses: [...prev.businesses, ...data.businesses],
      }));
    } catch {
      setError("Could not load more businesses. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  // Starting a search hides the shelves above the results, which changes the
  // page height. So scroll only after that render, not before it.
  useEffect(() => {
    if (!scrollPending.current) return;
    scrollPending.current = false;
    directoryRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [search]);

  const goToResults = (text) => {
    if (text === search) {
      directoryRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    scrollPending.current = true;
    setSearch(text);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    goToResults(query.trim());
  };

  const runQuickSearch = (text) => {
    setQuery(text);
    goToResults(text);
  };

  const clearFilters = () => {
    setQuery("");
    setSearch("");
    setCategory("");
  };

  const logoutCustomer = () => {
    clearCustomerSession();
    setCustomer(null);
    setEditingInterests(false);
    setToReview(0);
  };

  // Changing an interest re-ranks the recommendations straight away.
  const toggleInterest = async (categoryId) => {
    const current = customer.interests || [];
    const interests = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];

    try {
      const { data } = await updateCustomerInterests(interests);
      saveCustomerSession(null, data.customer);
      setCustomer(data.customer);
      loadRecommendations();
    } catch (requestError) {
      if (requestError.response?.status === 401) logoutCustomer();
    }
  };

  // Personal rows get a row each; the general lists share one tabbed row so
  // the page stays short.
  const shelves = recommendations?.shelves || [];
  const mainShelves = shelves.filter((shelf) => !shelf.tab);
  const exploreShelves = shelves.filter((shelf) => shelf.tab);

  return (
    <div className={s.page}>
      <MarketplaceHeader customer={customer} onLogout={logoutCustomer} />

      {/* Hero + search */}
      <section className={s.hero}>
        <div className={s.heroGlow} />
        <div className={s.heroInner}>
          <div>
            <span className={s.eyebrow}>
              <Sparkles className={s.eyebrowIcon} />
              Recommendations that learn what you like
            </span>
            <h1 className={s.title}>
              Find, compare and book{" "}
              <span className={s.titleAccent}>trusted services.</span>
            </h1>
            <p className={s.subtitle}>
              Search a service, compare prices and ratings across businesses,
              and book a slot in under a minute.
            </p>

            <form onSubmit={handleSearch} className={s.searchForm}>
              <Search className={s.searchIcon} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What do you need? Try 'haircut' or 'tax filing'"
                className={s.searchInput}
                aria-label="Search services or businesses"
              />
              <button type="submit" className={s.searchButton}>
                Search
              </button>
            </form>

            <div className={s.quickRow}>
              <span className={s.quickLabel}>Popular:</span>
              {QUICK_SEARCHES.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => runQuickSearch(text)}
                  className={s.quickChip}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Shelves are hidden while searching so results come first. */}
      {!isFiltering && (
        <>
          {!customer && !isBusinessLoggedIn() && (
            <div className={s.prompt}>
              <div className={s.promptCard}>
                <div className="flex items-center gap-4">
                  <div className={s.promptIconBox}>
                    <Sparkles className={s.promptIcon} />
                  </div>
                  <div>
                    <p className={s.promptTitle}>
                      Get recommendations made for you
                    </p>
                    <p className={s.promptText}>
                      Sign up, tell us what you like, and keep all your
                      bookings in one place.
                    </p>
                  </div>
                </div>
                <Link to="/signup" className={s.promptButton}>
                  Create free account
                </Link>
              </div>
            </div>
          )}

          {customer && toReview > 0 && (
            <div className={s.prompt}>
              <div className={s.promptCard}>
                <div className="flex items-center gap-4">
                  <div className={s.promptIconBox}>
                    <Star className={s.promptIcon} />
                  </div>
                  <div>
                    <p className={s.promptTitle}>
                      {toReview === 1
                        ? "How was your last appointment?"
                        : `You have ${toReview} appointments to rate`}
                    </p>
                    <p className={s.promptText}>
                      Your rating helps other customers choose and improves
                      your recommendations.
                    </p>
                  </div>
                </div>
                <Link to="/my-bookings?tab=past" className={s.promptButton}>
                  Rate now
                </Link>
              </div>
            </div>
          )}

          {mainShelves.map((shelf) => {
            const isTopPicks = shelf.id === "top-picks";

            return (
              <Shelf
                key={shelf.id}
                title={shelf.title}
                subtitle={shelf.subtitle}
                items={shelf.items}
                action={
                  isTopPicks && (
                    <button
                      type="button"
                      onClick={() => setEditingInterests((open) => !open)}
                      aria-expanded={editingInterests}
                      className={s.editInterests}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Interests
                    </button>
                  )
                }
              >
                {isTopPicks && editingInterests && (
                  <div className={s.interests}>
                    <p className={s.interestsLabel}>Your interests</p>
                    <p className={s.interestsHint}>
                      Tap to add or remove. Your picks update straight away.
                    </p>
                    <div className={`${s.chips} mt-3`}>
                      {CATEGORIES.map((item) => {
                        const isActive = customer.interests?.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleInterest(item.id)}
                            aria-pressed={isActive}
                            className={`${s.chip} ${isActive ? s.chipSoftActive : s.chipInactive}`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Shelf>
            );
          })}

          <ExploreShelf shelves={exploreShelves} />
        </>
      )}

      {/* Directory: searchable, filterable, one page at a time */}
      <section ref={directoryRef} className={s.directory}>
        <h2 className={s.directoryTitle}>
          {search
            ? `Results for "${search}"`
            : categoryLabel || "Browse all businesses"}
        </h2>
        <p className={s.directoryCount}>
          {loading
            ? "Loading..."
            : `${directory.total.toLocaleString("en-IN")} ${directory.total === 1 ? "business" : "businesses"}`}
          {isFiltering && (
            <>
              {" · "}
              <button type="button" onClick={clearFilters} className={s.clear}>
                Clear filters
              </button>
            </>
          )}
        </p>

        <div className={s.toolbar}>
          <div className={s.chips}>
            <button
              type="button"
              onClick={() => setCategory("")}
              aria-pressed={!category}
              className={`${s.chip} ${category ? s.chipInactive : s.chipActive}`}
            >
              All
            </button>
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                aria-pressed={category === item.id}
                className={`${s.chip} ${category === item.id ? s.chipActive : s.chipInactive}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className={s.sortWrap}>
            Sort by
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className={s.sortSelect}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Price comparison for the searched service */}
        {search && directory.priceStats && !loading && (
          <div className={s.compareBar}>
            <span className="flex items-center gap-2">
              <TrendingDown className={s.compareIcon} />
              Comparing{" "}
              <span className={s.compareStrong}>
                {directory.priceStats.count}
              </span>{" "}
              matching services
            </span>
            <span>
              Average{" "}
              <span className={s.compareStrong}>
                {formatPrice(directory.priceStats.average)}
              </span>
            </span>
            <span>
              Lowest{" "}
              <span className={s.compareStrong}>
                {formatPrice(directory.priceStats.lowest)}
              </span>
            </span>
            {sort !== "price-low" && (
              <button
                type="button"
                onClick={() => setSort("price-low")}
                className={s.clear}
              >
                Show cheapest first
              </button>
            )}
          </div>
        )}

        {error && (
          <div className={s.empty}>
            <SearchX className={s.emptyIcon} />
            <p className={s.emptyTitle}>{error}</p>
          </div>
        )}

        {!error && !loading && directory.businesses.length === 0 && (
          <div className={s.empty}>
            <SearchX className={s.emptyIcon} />
            <p className={s.emptyTitle}>
              {isFiltering
                ? "No business matches that yet"
                : "No businesses are listed yet"}
            </p>
            <p className={s.emptyText}>
              {isFiltering
                ? "Try a different service name or category."
                : "Be the first: list your business and add a service."}
            </p>
          </div>
        )}

        <div className={s.grid}>
          {loading
            ? Array.from({ length: 8 }, (_, index) => (
                <BusinessCardSkeleton key={index} />
              ))
            : directory.businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
        </div>

        {!loading && directory.hasMore && (
          <div className={s.loadMoreWrap}>
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className={s.loadMore}
            >
              {loadingMore ? "Loading..." : "Show more businesses"}
            </button>
            <p className={s.loadMoreNote}>
              Showing {directory.businesses.length} of{" "}
              {directory.total.toLocaleString("en-IN")}
            </p>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className={s.section}>
        <h2 className={s.sectionTitle}>How it works</h2>
        <div className={s.steps}>
          {steps.map((step) => (
            <div key={step.title} className={s.step}>
              <div className={s.stepIconBox}>
                <step.icon className={s.stepIcon} />
              </div>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepText}>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For businesses */}
      <section className={s.section}>
        <div className={s.cta}>
          <div>
            <h2 className={s.ctaTitle}>
              <Store className="mr-2 inline h-7 w-7 text-brand-300" />
              Run a business? Get listed here.
            </h2>
            <p className={s.ctaText}>
              Add your services and availability, and customers searching this
              marketplace can book and pay you directly.
            </p>
          </div>
          <div className={s.ctaActions}>
            <Link to="/business/signup" className={s.ctaPrimary}>
              List your business
            </Link>
            <Link to="/business/login" className={s.ctaSecondary}>
              Business login
            </Link>
          </div>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div>
            <div className={s.footerBrand}>
              <img src={logo} alt="" className={headerStyles.logoImg} />
              <span className={headerStyles.logoText}>BookMe</span>
            </div>
            <p className={s.footerText}>
              One place to find, compare and book local services, with
              recommendations that get better the more you use it.
            </p>
          </div>
          <div>
            <p className={s.footerHeading}>Customers</p>
            <ul className={s.footerList}>
              <li>
                <Link to="/login" className={s.footerLink}>
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/my-bookings" className={s.footerLink}>
                  My bookings
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className={s.footerHeading}>Company</p>
            <ul className={s.footerList}>
              <li>
                <Link to="/business/login" className={s.footerLink}>
                  For business
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={s.footerLink}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className={s.footerLink}>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className={s.footerBottom}>
          © {new Date().getFullYear()} BookMe. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
