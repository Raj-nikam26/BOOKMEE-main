// Styles for the business app: the shell around every business page and the
// panels added to the dashboard.

export const shellStyles = {
  container: "flex min-h-screen flex-col bg-canvas text-slate-800",

  header: "sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md",
  headerInner: "mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6",
  logoLink: "flex flex-shrink-0 items-center gap-2",
  logoImg: "h-8 w-auto md:h-9",
  logoText: "custom-brand-font mt-1 text-[22px] tracking-tight text-slate-900 md:text-[26px]",

  nav: "hidden items-center gap-1 lg:flex",
  navLink: "flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  navLinkActive: "flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-2 text-[13px] font-semibold text-brand-600",
  navIcon: "h-4 w-4",

  right: "flex flex-shrink-0 items-center gap-2",
  viewPage: "hidden items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 sm:flex",
  viewPageIcon: "h-3.5 w-3.5",
  account: "relative",
  accountButton: "flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100",
  avatar: "flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white",
  accountName: "hidden max-w-[140px] truncate text-[13px] font-semibold text-slate-700 md:block",
  chevron: "hidden h-4 w-4 text-slate-400 transition-transform md:block",
  menu: "absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-pop",
  menuHeader: "border-b border-slate-100 px-4 py-3",
  menuName: "truncate text-[14px] font-bold text-slate-900",
  menuEmail: "truncate text-[12px] text-slate-500",
  menuItem: "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50",
  menuItemDanger: "flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-[13px] font-semibold text-rose-600 hover:bg-rose-50",
  menuIcon: "h-4 w-4",

  mobileButton: "rounded-full p-2 text-slate-600 hover:bg-slate-100 lg:hidden",
  mobileIcon: "h-5 w-5",
  mobileNav: "border-t border-slate-200 bg-white lg:hidden",
  mobileNavInner: "mx-auto grid max-w-7xl gap-1 px-4 py-3",
  mobileLink: "flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold text-slate-600 hover:bg-slate-50",
  mobileLinkActive: "flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-3 text-[14px] font-semibold text-brand-600",

  main: "mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8",

  footer: "border-t border-slate-200 bg-white",
  footerInner: "mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-[12px] font-medium text-slate-400 sm:flex-row md:px-6",
  footerLinks: "flex flex-wrap items-center justify-center gap-x-4 gap-y-1",
  footerLink: "hover:text-brand-600",
  footerCredit: "font-semibold text-slate-500 hover:text-brand-600",
};

export const setupStyles = {
  card: "rounded-3xl border border-brand-200 bg-gradient-to-br from-white to-brand-50 p-6 md:p-8",
  top: "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
  eyebrow: "text-[12px] font-bold uppercase tracking-[0.15em] text-brand-600",
  title: "mt-1 text-[22px] font-extrabold tracking-tight text-slate-900",
  text: "mt-1 max-w-xl text-[14px] text-slate-500",
  progressWrap: "w-full flex-shrink-0 md:w-56",
  progressLabel: "flex justify-between text-[12px] font-bold text-slate-600",
  progressTrack: "mt-2 h-2 overflow-hidden rounded-full bg-brand-100",
  progressFill: "h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500",
  steps: "mt-6 grid gap-3 md:grid-cols-2",
  step: "flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4",
  stepDone: "flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4",
  stepIconTodo: "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-slate-300 text-[11px] font-bold text-slate-400",
  stepIconDone: "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white",
  stepCheck: "h-3.5 w-3.5",
  stepTitle: "text-[14px] font-bold text-slate-900",
  stepTitleDone: "text-[14px] font-bold text-slate-500 line-through",
  stepText: "mt-0.5 text-[13px] text-slate-500",
  stepAction: "ml-auto flex-shrink-0 self-center rounded-full bg-ink px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-ink/85",
};

export const reviewsStyles = {
  card: "rounded-2xl border border-slate-100 bg-white p-8 shadow-card",
  header: "flex flex-wrap items-center justify-between gap-4",
  title: "text-[16px] font-bold text-slate-900",
  summary: "flex items-center gap-2",
  average: "text-[28px] font-extrabold tracking-tight text-slate-900",
  star: "h-5 w-5 fill-amber-400 text-amber-400",
  count: "text-[13px] font-medium text-slate-500",
  list: "mt-6 divide-y divide-slate-100",
  item: "py-4 first:pt-0 last:pb-0",
  itemTop: "flex items-center justify-between gap-3",
  name: "truncate text-[14px] font-bold text-slate-900",
  date: "text-[12px] text-slate-400",
  stars: "mt-1 flex gap-0.5",
  starSmallOn: "h-3.5 w-3.5 fill-amber-400 text-amber-400",
  starSmallOff: "h-3.5 w-3.5 text-slate-200",
  comment: "mt-1.5 text-[13px] leading-relaxed text-slate-600",
  empty: "mt-6 rounded-2xl bg-slate-50 px-6 py-8 text-center",
  emptyTitle: "text-[14px] font-bold text-slate-700",
  emptyText: "mt-1 text-[13px] text-slate-500",
  more: "mt-5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-60",
};

// Honest integration status pills, used on the dashboard and the profile page.
export const statusStyles = {
  on: "inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-600",
  off: "inline-flex items-center gap-1.5 text-[13px] font-bold text-slate-400",
  warn: "inline-flex items-center gap-1.5 text-[13px] font-bold text-amber-600",
  icon: "h-4 w-4",
};
