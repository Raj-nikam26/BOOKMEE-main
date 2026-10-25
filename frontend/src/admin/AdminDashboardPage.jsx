import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ExternalLink,
  IndianRupee,
  Landmark,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  XOctagon,
} from "lucide-react";
import { getAdminDashboard, updateWithdrawalStatus } from "../api/admin";
import logo from "../assets/logo.png";
import { adminDashboardPageStyles as s } from "../assets/dummyStyles";

// All amounts arrive in paise.
const formatMoney = (amount = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    (amount || 0) / 100,
  );

const formatStatusLabel = (status = "") =>
  status.charAt(0).toUpperCase() + status.slice(1);

const withdrawalActions = ["processing", "paid", "rejected"];
const terminalStatuses = ["paid", "rejected"];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [pendingWithdrawalAction, setPendingWithdrawalAction] = useState(null);
  const [updatingWithdrawalId, setUpdatingWithdrawalId] = useState("");

  useEffect(() => {
    getAdminDashboard()
      .then(({ data }) => setDashboard(data))
      .catch((error) => {
        if ([401, 403].includes(error.response?.status)) {
          localStorage.removeItem("adminToken");
          navigate("/admin/login");
          return;
        }
        setMessage(
          error.response?.data?.message || "Could not load admin dashboard",
        );
      });
  }, [navigate]);

  const openWithdrawalConfirm = (withdrawal, status) => {
    setPendingWithdrawalAction({ withdrawal, status });
  };

  const closeWithdrawalConfirm = () => setPendingWithdrawalAction(null);

  const changeWithdrawalStatus = async () => {
    if (!pendingWithdrawalAction) return;

    const { withdrawal, status } = pendingWithdrawalAction;
    setUpdatingWithdrawalId(withdrawal._id);

    try {
      const { data } = await updateWithdrawalStatus(withdrawal._id, { status });
      setDashboard((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          summary: data.summary || prev.summary,
          withdrawals: prev.withdrawals.map((withdrawal) =>
            withdrawal._id === data.withdrawal._id
              ? data.withdrawal
              : withdrawal,
          ),
        };
      });
      setMessage(data.message || `Withdrawal marked as ${status}`);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Could not update withdrawal",
      );
    } finally {
      setUpdatingWithdrawalId("");
      setPendingWithdrawalAction(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const summary = dashboard?.summary || {};
  const pendingWithdrawal = pendingWithdrawalAction?.withdrawal;
  const WithdrawalConfirmIcon =
    pendingWithdrawalAction?.status === "rejected" ? XOctagon : ShieldCheck;
  const isConfirmingWithdrawal =
    pendingWithdrawal && updatingWithdrawalId === pendingWithdrawal._id;

  // Helpers for dynamic classes from styles
  const getPayoutStatusClass = (isComplete) =>
    isComplete ? s.userPayoutReady : s.userPayoutPending;

  const getWithdrawalStatusClass = (status) =>
    s.withdrawalStatusColors[status] || s.withdrawalStatusDefault;

  const statCards = [
    {
      label: "Total Users",
      value: summary.users || 0,
      icon: Users,
      bg: s.statBg1,
      c: s.statColor1,
    },
    {
      label: "Paid Bookings",
      value: summary.paidBookings || 0,
      icon: CheckCircle,
      bg: s.statBg2,
      c: s.statColor2,
    },
    {
      label: "Gross Revenue",
      value: formatMoney(summary.grossRevenue),
      icon: TrendingUp,
      bg: s.statBg3,
      c: s.statColor3,
    },
    {
      label: "Platform Fees",
      value: formatMoney(summary.platformFees),
      icon: IndianRupee,
      bg: s.statBg4,
      c: s.statColor4,
    },
    {
      label: "Provider Payouts",
      value: formatMoney(summary.providerPayouts),
      icon: Wallet,
      bg: s.statBg5,
      c: s.statColor5,
    },
    {
      label: "Withdrawal Hold",
      value: formatMoney(summary.withdrawalHolds),
      icon: Landmark,
      bg: s.statBg6,
      c: s.statColor6,
    },
  ];



  return (
    <div className={s.pageContainer}>
      <header className={s.header}>
        <div className={s.headerInner}>
          <div className={s.logoRow}>
            <img src={logo} alt="BookMe" className={s.logoImg} />
            <span className={s.logoText}>
              BookMe <span className={s.logoAccent}>Admin</span>
            </span>
          </div>
          <div className={s.headerActions}>
            <Link to="/" className={s.clientAppLink}>
              Client app <ExternalLink className="inline h-3.5 w-3.5" />
            </Link>
            <button type="button" onClick={logout} className={s.logoutButton}>
              <LogOut className="inline h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className={s.main}>
        <section className={s.heroSection}>
          <h1 className={s.heroTitle}>
            Platform <span className={s.heroTitleAccent}>overview</span>
          </h1>
          <p className={s.heroSubtitle}>
            Providers, revenue, platform fees, and withdrawal requests.
          </p>
          {message && <div className={s.messageBanner}>{message}</div>}
        </section>

        {/* Stats */}
        <section className={s.statsGrid}>
          {statCards.map((card) => (
            <div key={card.label} className={s.statCard}>
              <div className={`${s.statIconContainer} ${card.bg}`}>
                <card.icon className={`${s.statIcon} ${card.c}`} />
              </div>
              <div>
                <p className={s.statLabel}>{card.label}</p>
                <p className={s.statValue}>{card.value}</p>
              </div>
            </div>
          ))}
        </section>

        <div className={s.tablesGrid}>
          {/* Users table */}
          <section className={s.tableCard}>
            <div className={s.tableHeader}>
              <h2 className={s.tableTitle}>
                <Users className={s.tableTitleIcon} /> Providers
              </h2>
            </div>
            <div className={s.tableScrollContainer}>
              <table className={s.table}>
                <thead>
                  <tr className={s.tableHeadRow}>
                    <th className={s.th}>Business</th>
                    <th className={s.th}>Email</th>
                    <th className={s.th}>Payout</th>
                  </tr>
                </thead>
                <tbody className={s.tbody}>
                  {(dashboard?.users || []).map((user) => (
                    <tr key={user._id} className={s.tr}>
                      <td className={s.td}>
                        <span className={s.userBusinessName}>
                          {user.businessName || user.name}
                        </span>
                      </td>
                      <td className={s.tdMuted}>{user.email}</td>
                      <td className={s.td}>
                        <span
                          className={`${s.payoutStatusBadge} ${getPayoutStatusClass(user.payoutDetails?.isComplete)}`}
                        >
                          {user.payoutDetails?.isComplete ? "Ready" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dashboard && dashboard.users?.length === 0 && (
                    <tr>
                      <td colSpan="3" className={s.emptyTableCell}>
                        No providers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Withdrawals */}
          <section className={s.withdrawalCard}>
            <h2 className={`${s.tableTitle} ${s.sectionTitleSpacing}`}>
              <Landmark className={s.tableTitleIcon} /> Withdrawal Requests
            </h2>
            <div className={s.withdrawalList}>
              {(dashboard?.withdrawals || []).map((withdrawal) => {
                const payout = withdrawal.payoutSnapshot || {};
                const isTerminal = terminalStatuses.includes(withdrawal.status);

                return (
                  <div key={withdrawal._id} className={s.withdrawalItem}>
                    <div className={s.withdrawalItemHeader}>
                      <div>
                        <p className={s.withdrawalProviderName}>
                          {withdrawal.userId?.businessName ||
                            withdrawal.userId?.name ||
                            "Provider"}
                        </p>
                        <p className={s.withdrawalProviderEmail}>
                          {withdrawal.userId?.email}
                        </p>
                      </div>
                      <div className={s.withdrawalAmountCol}>
                        <p className={s.withdrawalAmount}>
                          {formatMoney(withdrawal.amount)}
                        </p>
                        <div className={s.withdrawalStatusWrap}>
                          <span
                            className={`${s.withdrawalStatusBadge} ${getWithdrawalStatusClass(withdrawal.status)}`}
                          >
                            {withdrawal.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className={s.withdrawalAccountInfo}>
                      <Landmark className={s.withdrawalAccountIcon} />
                      {payout.upiId
                        ? `UPI ${payout.upiId}`
                        : `${payout.bankName || "Bank"} •••• ${payout.accountLast4 || "----"}`}
                    </p>
                    {!isTerminal && (
                      <div className={s.withdrawalActions}>
                        {withdrawalActions.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={
                              withdrawal.status === status ||
                              updatingWithdrawalId === withdrawal._id
                            }
                            onClick={() =>
                              openWithdrawalConfirm(withdrawal, status)
                            }
                            className={`${s.withdrawalActionBtn} ${
                              withdrawal.status === status
                                ? s.withdrawalActionBtnActive
                                : s.withdrawalActionBtnInactive
                            }`}
                          >
                            {formatStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {dashboard && dashboard.withdrawals?.length === 0 && (
                <div className={s.emptyWithdrawals}>
                  <div className={s.emptyWithdrawalsIconCircle}>
                    <Wallet className={s.emptyWithdrawalsIcon} />
                  </div>
                  <p className={s.emptyWithdrawalsText}>
                    No withdrawal requests yet.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

          {/* Recent bookings table */}
        <section className={s.recentBookingsCard}>
          <h2 className={`${s.tableTitle} ${s.sectionTitleSpacing}`}>
            <CheckCircle className={s.tableTitleIcon} /> Recent Paid Bookings
          </h2>
          <div className={s.tableScrollContainer}>
            <table className={s.table}>
              <thead>
                <tr className={s.tableHeadRow}>
                  <th className={s.th}>Provider</th>
                  <th className={s.th}>Service</th>
                  <th className={s.th}>Gross</th>
                  <th className={s.th}>Fees</th>
                  <th className={s.th}>Provider Share</th>
                  <th className={s.th}>Status</th>
                </tr>
              </thead>
              <tbody className={s.tbody}>
                {(dashboard?.recentBookings || []).map((booking) => (
                  <tr key={booking._id} className={s.tr}>
                    <td className={s.tdBold}>
                      {booking.userId?.businessName || booking.userId?.name}
                    </td>
                    <td className={s.tdMuted}>
                      {booking.serviceId?.name || "Service"}
                    </td>
                    <td className={s.tdBold}>{formatMoney(booking.amount)}</td>
                    <td className={s.tdFees}>
                      {formatMoney(booking.platformFeeAmount)}
                    </td>
                    <td className={s.tdEarnings}>
                      {formatMoney(booking.providerPayoutAmount)}
                    </td>
                    <td className={s.td}>
                      <span className={s.bookingPayoutBadge}>
                        {booking.payoutStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {dashboard && dashboard.recentBookings?.length === 0 && (
                  <tr>
                    <td colSpan="6" className={s.emptyTableCell}>
                      No recent transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {pendingWithdrawalAction && (
        <div className={s.confirmModalOverlay}>
          <div
            className={s.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-confirm-title"
          >
            <div className={s.confirmModalIconRow}>
              <span className={s.confirmModalIconWrap}>
                <WithdrawalConfirmIcon className={s.confirmModalIcon} />
              </span>
              <span
                className={`${s.withdrawalStatusBadge} ${getWithdrawalStatusClass(pendingWithdrawalAction.status)}`}
              >
                {pendingWithdrawalAction.status}
              </span>
            </div>
            <h3 id="withdrawal-confirm-title" className={s.confirmModalTitle}>
              Confirm withdrawal status
            </h3>
            <p className={s.confirmModalText}>
              Are you sure you want to mark this withdrawal as{" "}
              {formatStatusLabel(pendingWithdrawalAction.status)}?
            </p>
            <div className={s.confirmModalMeta}>
              <span>
                {pendingWithdrawal?.userId?.businessName ||
                  pendingWithdrawal?.userId?.name ||
                  "Provider"}
              </span>
              <strong>{formatMoney(pendingWithdrawal?.amount)}</strong>
            </div>
            <div className={s.confirmModalActions}>
              <button
                type="button"
                onClick={closeWithdrawalConfirm}
                disabled={isConfirmingWithdrawal}
                className={s.confirmModalCancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={changeWithdrawalStatus}
                disabled={isConfirmingWithdrawal}
                className={s.confirmModalConfirmBtn}
              >
                {isConfirmingWithdrawal
                  ? "Confirming..."
                  : `Confirm ${formatStatusLabel(pendingWithdrawalAction.status)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
