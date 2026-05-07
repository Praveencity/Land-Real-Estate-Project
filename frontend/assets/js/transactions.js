const transactionsList = document.getElementById("transactions-list");
const transactionsLoading = document.getElementById("transactions-loading");
const noTransactions = document.getElementById("no-transactions");

const renderTransactions = (transactions) => {
  transactionsLoading.style.display = "none";
  
  if (!transactions || transactions.length === 0) {
    noTransactions.style.display = "block";
    transactionsList.innerHTML = "";
    return;
  }

  noTransactions.style.display = "none";
  
  const user = getUser();
  const isAdmin = user?.role === "Admin" || user?.role === "Government Officer";

  transactionsList.innerHTML = transactions
    .map((txn) => {
      const isFromMe = txn.fromOwner?._id === user?.id;
      const isToMe = txn.toOwner?._id === user?.id;
      
      let directionLabel = "";
      let directionClass = "";
      
      if (isFromMe && isToMe) {
        directionLabel = "Self";
        directionClass = "info";
      } else if (isFromMe) {
        directionLabel = "Outgoing";
        directionClass = "warning";
      } else if (isToMe) {
        directionLabel = "Incoming";
        directionClass = "success";
      } else {
        directionLabel = "System";
        directionClass = "info";
      }

      const status = txn.status || "Pending";
      const statusClass = status.toLowerCase();
      
      const amount = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(txn.amount || 0);

      const date = new Date(txn.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <div class="request-item">
          <div class="request-main">
            <div class="request-info">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <h3 style="margin: 0;">${txn.property?.title || "Property"}</h3>
                <span class="badge badge-${directionClass}" style="font-size: 0.7rem;">${directionLabel}</span>
              </div>
              <p class="request-meta">
                <span>ID: <strong>${txn.transactionId}</strong></span>
                <span>•</span>
                <span>${date}</span>
              </p>
              <div class="txn-parties" style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--muted);">
                <span>From: ${txn.fromOwner?.fullName || "N/A"}</span>
                <span style="margin: 0 0.5rem;">→</span>
                <span>To: ${txn.toOwner?.fullName || "N/A"}</span>
              </div>
            </div>
            <div class="request-status-box">
              <div class="txn-amount" style="font-size: 1.1rem; font-weight: 700; color: var(--gov-blue); margin-bottom: 0.5rem; text-align: right;">
                ${amount}
              </div>
              <span class="badge ${statusClass}" style="width: 100%; text-align: center;">${status}</span>
            </div>
          </div>
          ${txn.note ? `<div class="request-footer" style="background: #f8fafc; border-top: 1px solid #edf2f7; padding: 0.5rem 1rem; font-size: 0.85rem; color: #64748b;">
            <strong>Note:</strong> ${txn.note}
          </div>` : ""}
        </div>
      `;
    })
    .join("");
};

const loadTransactions = async () => {
  try {
    const data = await apiRequest("/transactions");
    renderTransactions(data.transactions || []);
  } catch (error) {
    console.error("Failed to load transactions:", error);
    transactionsLoading.innerHTML = `<p class="error-text">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", loadTransactions);
