const transactions = [
  { receiver: "Lucky Reward UPI", date: "2026-08-29T10:42:00", id: "UPI982174563210", method: "UPI • HDFC Bank", amount: 50000, risk: "high", icon: "gift", color: "#d83646", reason: "Unusually high amount sent to a newly seen reward-related UPI ID." },
  { receiver: "Unknown Store", date: "2026-08-28T20:15:00", id: "UPI746291038455", method: "UPI • SBI", amount: 2000, risk: "medium", icon: "store", color: "#ef8500", reason: "The receiver is new and the merchant identity could not be fully verified." },
  { receiver: "Food Delivery", date: "2026-08-28T13:30:00", id: "UPI530918274601", method: "UPI • ICICI Bank", amount: 500, risk: "safe", icon: "utensils", color: "#299f47", reason: "Known merchant and an amount consistent with your payment history." },
  { receiver: "Rahul Sharma", date: "2026-08-27T18:05:00", id: "UPI418620975334", method: "UPI • Axis Bank", amount: 1200, risk: "safe", icon: "user", color: "#2369d8", reason: "Previously paid contact with no unusual transaction signals." },
  { receiver: "Electricity Board", date: "2026-08-26T09:20:00", id: "UPI372056419882", method: "UPI • HDFC Bank", amount: 2350, risk: "safe", icon: "bolt", color: "#edb300", reason: "Recognized biller and normal recurring payment amount." },
  { receiver: "Metro Recharge", date: "2026-08-25T19:45:00", id: "UPI206531847709", method: "UPI • SBI", amount: 300, risk: "safe", icon: "train-subway", color: "#1da9b7", reason: "Recognized transit merchant and typical recharge value." },
  { receiver: "Aman Verma", date: "2026-08-24T16:21:00", id: "UPI194830275611", method: "UPI • Axis Bank", amount: 5000, risk: "safe", icon: "user", color: "#2369d8", reason: "Previously paid contact and no suspicious pattern detected." },
  { receiver: "QuickMart", date: "2026-08-23T11:18:00", id: "UPI883620419507", method: "UPI • ICICI Bank", amount: 3200, risk: "safe", icon: "basket-shopping", color: "#9a5ddd", reason: "Verified merchant with payment behavior matching your history." },
  { receiver: "Neha Gupta", date: "2026-08-22T14:10:00", id: "UPI746502918336", method: "UPI • HDFC Bank", amount: 7600, risk: "safe", icon: "user", color: "#2369d8", reason: "Trusted contact with multiple successful past payments." },
  { receiver: "Railway Tickets", date: "2026-08-21T08:45:00", id: "UPI610294785323", method: "UPI • SBI", amount: 4500, risk: "safe", icon: "train", color: "#1d9aa6", reason: "Recognized travel merchant and normal booking pattern." },
  { receiver: "Cafe Avenue", date: "2026-08-20T18:32:00", id: "UPI509237164880", method: "UPI • Axis Bank", amount: 1100, risk: "safe", icon: "mug-hot", color: "#a8673e", reason: "Verified local merchant with a low-risk payment amount." },
  { receiver: "Mobile Recharge", date: "2026-08-19T09:11:00", id: "UPI438201976554", method: "UPI • HDFC Bank", amount: 2800, risk: "safe", icon: "mobile-screen", color: "#466bdb", reason: "Recognized service provider and recurring account activity." },
  { receiver: "Priya Mehta", date: "2026-08-17T17:50:00", id: "UPI327840159667", method: "UPI • ICICI Bank", amount: 9000, risk: "safe", icon: "user", color: "#2369d8", reason: "Known contact; amount and timing do not show risk signals." },
  { receiver: "Fresh Grocers", date: "2026-08-16T12:16:00", id: "UPI216497035821", method: "UPI • SBI", amount: 3400, risk: "safe", icon: "cart-shopping", color: "#329c57", reason: "Known grocery merchant and expected purchase amount." },
  { receiver: "Cloud Storage", date: "2026-08-15T06:05:00", id: "UPI105783624990", method: "UPI • HDFC Bank", amount: 1250, risk: "safe", icon: "cloud", color: "#4479d9", reason: "Recognized subscription charged on its usual schedule." },
  { receiver: "Vikram Singh", date: "2026-08-14T20:40:00", id: "UPI994371520486", method: "UPI • Axis Bank", amount: 6500, risk: "safe", icon: "user", color: "#2369d8", reason: "Previously paid contact with normal transaction behavior." },
  { receiver: "Pharmacy Plus", date: "2026-08-12T10:35:00", id: "UPI883260419751", method: "UPI • ICICI Bank", amount: 2200, risk: "safe", icon: "capsules", color: "#e45f80", reason: "Verified pharmacy and no suspicious payment indicators." },
  { receiver: "Movie Tickets", date: "2026-08-10T21:15:00", id: "UPI772159308644", method: "UPI • SBI", amount: 850, risk: "safe", icon: "ticket", color: "#8e5cc9", reason: "Recognized entertainment merchant and expected value." },
  { receiver: "Crypto Bonus Desk", date: "2026-08-08T23:52:00", id: "UPI661048297537", method: "UPI • HDFC Bank", amount: 9000, risk: "medium", icon: "coins", color: "#e88700", reason: "New receiver using promotional language; verify independently before paying again." },
  { receiver: "House Rent", date: "2026-08-07T09:00:00", id: "UPI550937186420", method: "UPI • Axis Bank", amount: 4700, risk: "safe", icon: "house", color: "#4874ca", reason: "Recurring payment to the same trusted receiver." },
  { receiver: "Book Store", date: "2026-08-05T15:25:00", id: "UPI449826075313", method: "UPI • ICICI Bank", amount: 1750, risk: "safe", icon: "book", color: "#7a61cb", reason: "Verified merchant and normal retail amount." },
  { receiver: "Water Board", date: "2026-08-03T10:08:00", id: "UPI338715964206", method: "UPI • SBI", amount: 700, risk: "safe", icon: "droplet", color: "#258cca", reason: "Recognized utility biller and recurring payment." },
  { receiver: "Internet Provider", date: "2026-08-02T08:44:00", id: "UPI227604853199", method: "UPI • HDFC Bank", amount: 1950, risk: "safe", icon: "wifi", color: "#2c79c7", reason: "Known service provider paid on the expected date." },
  { receiver: "Fitness Studio", date: "2026-08-01T18:20:00", id: "UPI116593742082", method: "UPI • Axis Bank", amount: 2650, risk: "safe", icon: "dumbbell", color: "#5368cb", reason: "Recognized recurring merchant with no anomalies." }
];

const pageSize = 6;
let currentPage = 1;
let filteredTransactions = [...transactions];

const $ = (selector) => document.querySelector(selector);
const body = $("#transactionsBody");
const formatAmount = amount => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
const formatDate = dateString => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(dateString));
const riskLabel = risk => risk === "high" ? "HIGH RISK" : risk === "medium" ? "MEDIUM RISK" : "SAFE";
const riskIcon = risk => risk === "safe" ? "fa-shield-halved" : "fa-triangle-exclamation";

function updateSummary() {
  const flagged = transactions.filter(item => item.risk !== "safe").length;
  $("#totalTransactions").textContent = transactions.length;
  $("#totalAmount").textContent = formatAmount(transactions.reduce((sum, item) => sum + item.amount, 0));
  $("#flaggedTransactions").textContent = flagged;
  $("#safeTransactions").textContent = transactions.length - flagged;
}

function renderTransactions() {
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredTransactions.slice(start, start + pageSize);

  body.innerHTML = pageItems.map(item => `
    <tr class="${item.risk}">
      <td><div class="receiver"><span class="receiver-icon" style="--icon-bg:${item.color}"><i class="fa-solid fa-${item.icon}"></i></span><span>${item.receiver}</span></div></td>
      <td>${formatDate(item.date)}</td>
      <td>${item.id}</td>
      <td>${item.method}</td>
      <td>${formatAmount(item.amount)}</td>
      <td><span class="risk-badge ${item.risk}"><i class="fa-solid ${riskIcon(item.risk)}"></i>${riskLabel(item.risk)}</span></td>
      <td><button class="details-button" data-id="${item.id}"><i class="fa-regular fa-eye"></i>View Details</button></td>
    </tr>
  `).join("");

  $("#resultCount").textContent = `${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? "" : "s"} found`;
  $("#emptyState").hidden = filteredTransactions.length !== 0;
  $("table").hidden = filteredTransactions.length === 0;

  const shownStart = filteredTransactions.length ? start + 1 : 0;
  const shownEnd = Math.min(start + pageSize, filteredTransactions.length);
  $("#showingText").textContent = `Showing ${shownStart}–${shownEnd} of ${filteredTransactions.length} transactions`;
  renderPagination(pageCount);
}

function renderPagination(pageCount) {
  const nav = $("#pagination");
  nav.innerHTML = `
    <button class="page-button" data-page="prev" ${currentPage === 1 ? "disabled" : ""}>Previous</button>
    ${Array.from({ length: pageCount }, (_, index) => `<button class="page-button ${currentPage === index + 1 ? "active" : ""}" data-page="${index + 1}">${index + 1}</button>`).join("")}
    <button class="page-button" data-page="next" ${currentPage === pageCount ? "disabled" : ""}>Next</button>`;
}

function applyFilters() {
  const query = $("#searchInput").value.trim().toLowerCase();
  const risk = $("#riskFilter").value;
  const days = $("#dateFilter").value;
  const minimum = Number($("#minAmount").value || 0);
  const bank = $("#bankFilter").value;
  const newestDate = Math.max(...transactions.map(item => new Date(item.date).getTime()));

  filteredTransactions = transactions.filter(item => {
    const matchesQuery = item.receiver.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
    const matchesRisk = risk === "all" || item.risk === risk;
    const age = (newestDate - new Date(item.date).getTime()) / 86400000;
    const matchesDate = days === "all" || age <= Number(days);
    const matchesAmount = item.amount >= minimum;
    const matchesBank = bank === "all" || item.method.endsWith(bank);
    return matchesQuery && matchesRisk && matchesDate && matchesAmount && matchesBank;
  });
  currentPage = 1;
  renderTransactions();
}

function populateBanks() {
  const banks = [...new Set(transactions.map(item => item.method.split("•")[1].trim()))].sort();
  $("#bankFilter").insertAdjacentHTML("beforeend", banks.map(bank => `<option value="${bank}">${bank}</option>`).join(""));
}

function showDetails(id) {
  const item = transactions.find(transaction => transaction.id === id);
  if (!item) return;
  $("#modalTitle").textContent = item.receiver;
  $("#modalAmount").textContent = formatAmount(item.amount);
  $("#modalIcon").style.background = item.color;
  $("#modalIcon").innerHTML = `<i class="fa-solid fa-${item.icon}"></i>`;
  $("#modalDetails").innerHTML = `
    <dt>Date & Time</dt><dd>${formatDate(item.date)}</dd>
    <dt>Transaction ID</dt><dd>${item.id}</dd>
    <dt>Payment Method</dt><dd>${item.method}</dd>
    <dt>Risk Level</dt><dd><span class="risk-badge ${item.risk}">${riskLabel(item.risk)}</span></dd>`;
  $("#riskExplanation").innerHTML = `<strong>Why this rating:</strong> ${item.reason}`;
  $("#detailsModal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  $("#detailsModal").hidden = true;
  document.body.style.overflow = "";
}

function downloadCSV(items, filename) {
  const rows = [["Receiver", "Date & Time", "Transaction ID", "Payment Method", "Amount (INR)", "Risk Level"], ...items.map(item => [item.receiver, formatDate(item.date), item.id, item.method, item.amount, riskLabel(item.risk)])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

$("#searchInput").addEventListener("input", applyFilters);
$("#riskFilter").addEventListener("change", applyFilters);
$("#dateFilter").addEventListener("change", applyFilters);
$("#minAmount").addEventListener("input", applyFilters);
$("#bankFilter").addEventListener("change", applyFilters);

$("#filterButton").addEventListener("click", () => {
  const panel = $("#advancedFilters");
  panel.hidden = !panel.hidden;
});

$("#clearFilters").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#riskFilter").value = "all";
  $("#dateFilter").value = "30";
  $("#minAmount").value = "";
  $("#bankFilter").value = "all";
  applyFilters();
});

$("#pagination").addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (!button || button.disabled) return;
  const value = button.dataset.page;
  if (value === "prev") currentPage--;
  else if (value === "next") currentPage++;
  else currentPage = Number(value);
  renderTransactions();
  $(".transactions-card").scrollIntoView({ behavior: "smooth", block: "start" });
});

body.addEventListener("click", event => {
  const button = event.target.closest(".details-button");
  if (button) showDetails(button.dataset.id);
});

$("#modalClose").addEventListener("click", closeModal);
$("#detailsModal").addEventListener("click", event => { if (event.target === $("#detailsModal")) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

$("#exportButton").addEventListener("click", () => {
  downloadCSV(filteredTransactions, "upi-guardian-filtered-transactions.csv");
  showToast("Filtered transactions exported successfully.");
});

$("#downloadStatement").addEventListener("click", () => {
  downloadCSV(transactions, "upi-guardian-transaction-statement.csv");
  showToast("Your transaction statement is downloading.");
});

$("#mobileMenu").addEventListener("click", () => {
  const nav = $("#mainNav");
  const open = nav.classList.toggle("open");
  $("#mobileMenu").setAttribute("aria-expanded", String(open));
});

updateSummary();
populateBanks();
applyFilters();
