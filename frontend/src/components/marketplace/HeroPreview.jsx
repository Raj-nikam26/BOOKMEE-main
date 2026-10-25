import { CalendarCheck, Check, Star, TrendingDown } from "lucide-react";

const times = ["09:00", "10:00", "11:30", "14:00"];

/**
 * Decorative preview of the product for the home page hero: a booking card
 * with two floating highlights. Purely illustrative, hidden from screen readers.
 */
export default function HeroPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden h-[380px] w-full max-w-[420px] select-none lg:block"
    >
      {/* Soft brand glow behind the cards */}
      <div className="absolute inset-6 rounded-full bg-brand-300/40 blur-3xl" />

      {/* Booking card */}
      <div className="absolute left-1/2 top-1/2 w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-pop">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-[16px] font-extrabold text-white">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-ink">
              Sunrise Yoga Shala
            </p>
            <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              4.8 · Fitness & Yoga
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="text-[13px] font-semibold text-slate-800">
            Yoga Class · 60 min
          </span>
          <span className="text-[13px] font-extrabold text-ink">₹300</span>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          Tomorrow
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {times.map((time) => (
            <span
              key={time}
              className={`rounded-lg py-2 text-center text-[12px] font-bold ${
                time === "10:00"
                  ? "bg-ink text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
            >
              {time}
            </span>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-brand-600 py-3 text-center text-[13px] font-bold text-white">
          Confirm booking
        </div>
      </div>

      {/* Floating highlights */}
      <div className="absolute right-0 top-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-3.5 py-2.5 shadow-card">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
          <TrendingDown className="h-4 w-4 text-emerald-600" />
        </span>
        <span className="text-[12px] font-bold text-slate-800">
          32% below average
        </span>
      </div>

      <div className="absolute bottom-5 left-0 flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white px-3.5 py-2.5 shadow-card">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
          <Check className="h-4 w-4 text-white" />
        </span>
        <span>
          <span className="block text-[12px] font-bold text-slate-800">
            Booking confirmed
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <CalendarCheck className="h-3 w-3" />
            Added to My bookings
          </span>
        </span>
      </div>
    </div>
  );
}
