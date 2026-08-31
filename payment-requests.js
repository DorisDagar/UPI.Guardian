// ======================================================
// UPI GUARDIAN — DATABASE-BACKED PAYMENT REQUESTS
// ======================================================

const paymentRequestsToken =
  localStorage.getItem("upiGuardianToken");

const PAYMENT_REQUESTS_API_BASE_URL =
  window.location.port === "5000"
    ? ""
    : "http://localhost:5000";

const paymentRequestsState = {
  requests: new Map(),
};

const requestGrid =
  document.getElementById("requestGrid");

const requestHistoryGrid =
  document.getElementById("requestHistoryGrid");

// ======================================================
// AUTH CHECK
// ======================================================

if (!paymentRequestsToken) {
  window.location.replace("login.html");
}


// ======================================================
// HELPERS
// ======================================================

function escapeRequestHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatRequestMoney(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatRequestTime(value) {
  const requestDate = new Date(value);

  if (Number.isNaN(requestDate.getTime())) {
    return "Time unavailable";
  }

  const minutes = Math.max(
    0,
    Math.floor(
      (Date.now() - requestDate.getTime()) /
      60000
    )
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  return requestDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

function getRequesterInitials(name = "") {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "UP";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function formatHistoryDateTime(value) {
  const historyDate = new Date(value);

  if (Number.isNaN(historyDate.getTime())) {
    return "Time unavailable";
  }

  return historyDate.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}


// ======================================================
// API HELPER
// ======================================================

async function paymentRequestsApi(
  path,
  options = {}
) {
  const response = await fetch(
    `${PAYMENT_REQUESTS_API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization:
          `Bearer ${paymentRequestsToken}`,
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("upiGuardianToken");
    localStorage.removeItem("upiGuardianUser");
    window.location.replace("login.html");
    throw new Error("Your session has expired.");
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Something went wrong. Please try again."
    );
  }

  return data;
}


// ======================================================
// PAGE STATES
// ======================================================

function showLoadingState() {
  requestGrid.innerHTML = `
    <div class="request-page-state loading-state">
      <div class="state-icon">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <h3>Loading payment requests</h3>
      <p>Finding unresolved requests for your account...</p>
    </div>
  `;
}

function showErrorState(message) {
  requestGrid.innerHTML = `
    <div class="request-page-state error-state">
      <div class="state-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3>Unable to load requests</h3>
      <p>${escapeRequestHtml(message)}</p>
      <button class="retry-requests-button" type="button">
        <i class="fa-solid fa-rotate-right"></i>
        Try again
      </button>
    </div>
  `;
}

function showEmptyState() {
  requestGrid.innerHTML = `
    <div class="request-page-state empty-state">
      <div class="state-icon">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <h3>No pending requests</h3>
      <p>You have accepted or declined every available demo payment request.</p>
    </div>
  `;
}

function removeHandledRequest(requestId) {
  paymentRequestsState.requests.delete(
    String(requestId)
  );

  document
    .querySelector(
      `[data-request-id="${requestId}"]`
    )
    ?.remove();

  if (paymentRequestsState.requests.size === 0) {
    requestGrid.innerHTML = `
      <div class="request-page-state empty-state">
        <div class="state-icon">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3>Requests handled</h3>
        <p>Refresh this page whenever you want to check for new payment requests.</p>
      </div>
    `;
  }
}


// ======================================================
// REQUEST CARDS
// ======================================================

function createRequestCard(request) {
  const requestId = Number(request.id);

  return `
    <article class="request-card" data-request-id="${requestId}">
      <div class="card-topline">
        <span class="request-label">
          <i class="fa-regular fa-envelope-open"></i>
          Payment request
        </span>
        <time datetime="${escapeRequestHtml(request.requestTime)}">
          ${escapeRequestHtml(formatRequestTime(request.requestTime))}
        </time>
      </div>

      <div class="requester-row">
        <div class="requester-avatar">
          ${escapeRequestHtml(getRequesterInitials(request.requesterName))}
        </div>

        <div class="requester-details">
          <h3>${escapeRequestHtml(request.requesterName)}</h3>
          <p>
            <i class="fa-solid fa-at"></i>
            ${escapeRequestHtml(request.requesterUpiId)}
          </p>
        </div>

        <div class="amount-block">
          <small>Requests</small>
          <strong>${escapeRequestHtml(formatRequestMoney(request.amount))}</strong>
        </div>
      </div>

      <div class="payment-note">
        <span>
          <i class="fa-regular fa-message"></i>
          Payment note
        </span>
        <p>${escapeRequestHtml(request.paymentNote)}</p>
      </div>

      <div class="card-actions">
        <button class="decline-button" type="button" data-request-action="decline">
          <i class="fa-solid fa-xmark"></i> Decline
        </button>
        <button class="analyze-button" type="button" data-request-action="analyze">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Analyze Request
        </button>
        <button class="accept-button" type="button" data-request-action="accept">
          <i class="fa-solid fa-check"></i> Accept
        </button>
      </div>
    </article>
  `;
}

function renderRequests(requests) {
  paymentRequestsState.requests = new Map(
    requests.map((request) => [
      String(request.id),
      request,
    ])
  );

  if (requests.length === 0) {
    showEmptyState();
    return;
  }

  requestGrid.innerHTML = requests
    .map(createRequestCard)
    .join("");
}

async function loadPaymentRequests() {
  showLoadingState();

  try {
    const data = await paymentRequestsApi(
      "/api/payment-requests"
    );

    const requests =
      Array.isArray(data.requests)
        ? data.requests
        : [];

    renderRequests(requests);
  } catch (error) {
    if (
      !error.message.includes(
        "session has expired"
      )
    ) {
      showErrorState(error.message);
    }
  }
}


// ======================================================
// PAYMENT REQUEST HISTORY
// ======================================================

function showHistoryLoadingState() {
  requestHistoryGrid.innerHTML = `
    <div class="request-page-state loading-state">
      <div class="state-icon">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
      <h3>Loading request history</h3>
      <p>Finding your previous payment request decisions...</p>
    </div>
  `;
}

function showHistoryErrorState(message) {
  requestHistoryGrid.innerHTML = `
    <div class="request-page-state error-state">
      <div class="state-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3>Unable to load history</h3>
      <p>${escapeRequestHtml(message)}</p>
      <button class="retry-history-button" type="button">
        <i class="fa-solid fa-rotate-right"></i>
        Try again
      </button>
    </div>
  `;
}

function showHistoryEmptyState() {
  requestHistoryGrid.innerHTML = `
    <div class="request-page-state empty-state">
      <div class="state-icon">
        <i class="fa-solid fa-clock-rotate-left"></i>
      </div>
      <h3>No request history yet</h3>
      <p>Requests you accept or decline will appear here.</p>
    </div>
  `;
}

function createHistoryCard(item) {
  const wasAccepted =
    item.status === "accepted";

  const statusClass =
    wasAccepted ? "accepted" : "declined";

  const statusIcon =
    wasAccepted ? "fa-check" : "fa-xmark";

  const statusLabel =
    wasAccepted ? "Accepted" : "Declined";

  const paymentResult = wasAccepted
    ? `Payment made to ${item.requesterName}`
    : "No payment was made";

  const transactionMarkup = wasAccepted
    ? `
        <div class="history-detail transaction-detail">
          <span>Transaction ID</span>
          <strong>${escapeRequestHtml(item.transactionReference || "Unavailable")}</strong>
        </div>
      `
    : `
        <div class="history-detail">
          <span>Transaction</span>
          <strong>Not created</strong>
        </div>
      `;

  return `
    <article class="history-card ${statusClass}">
      <div class="history-card-topline">
        <span class="history-status ${statusClass}">
          <i class="fa-solid ${statusIcon}"></i>
          ${statusLabel}
        </span>
        <time datetime="${escapeRequestHtml(item.actedAt)}">
          ${escapeRequestHtml(formatHistoryDateTime(item.actedAt))}
        </time>
      </div>

      <div class="history-main-row">
        <div class="requester-avatar">
          ${escapeRequestHtml(getRequesterInitials(item.requesterName))}
        </div>
        <div class="history-requester">
          <h3>${escapeRequestHtml(item.requesterName)}</h3>
          <p><i class="fa-solid fa-at"></i> ${escapeRequestHtml(item.requesterUpiId)}</p>
        </div>
        <strong class="history-amount">${escapeRequestHtml(formatRequestMoney(item.amount))}</strong>
      </div>

      <div class="history-note">
        <span>Payment note</span>
        <p>${escapeRequestHtml(item.paymentNote)}</p>
      </div>

      <div class="history-details">
        <div class="history-detail">
          <span>Result</span>
          <strong>${escapeRequestHtml(paymentResult)}</strong>
        </div>
        ${transactionMarkup}
      </div>
    </article>
  `;
}

function renderRequestHistory(history) {
  if (history.length === 0) {
    showHistoryEmptyState();
    return;
  }

  requestHistoryGrid.innerHTML = history
    .map(createHistoryCard)
    .join("");
}

async function loadRequestHistory() {
  showHistoryLoadingState();

  try {
    const data = await paymentRequestsApi(
      "/api/payment-requests/history"
    );

    const history =
      Array.isArray(data.history)
        ? data.history
        : [];

    renderRequestHistory(history);
  } catch (error) {
    if (
      !error.message.includes(
        "session has expired"
      )
    ) {
      showHistoryErrorState(error.message);
    }
  }
}


// ======================================================
// CENTRED POPUP
// ======================================================

function closeRequestPopup(overlay) {
  overlay.classList.add("closing");
  window.setTimeout(() => overlay.remove(), 180);
}

function showRequestPopup({
  type = "confirm",
  label,
  title,
  message,
  confirmText,
  onConfirm,
}) {
  document
    .getElementById("requestPopupOverlay")
    ?.remove();

  const overlay = document.createElement("div");
  overlay.id = "requestPopupOverlay";
  overlay.className =
    `request-popup-overlay ${type}`;

  const popupIcons = {
    confirm: "fa-ban",
    payment: "fa-arrow-up-from-bracket",
    success: "fa-check",
    error: "fa-triangle-exclamation",
    info: "fa-wand-magic-sparkles",
  };

  const showCancel =
    type === "confirm" ||
    type === "payment";

  overlay.innerHTML = `
    <section class="request-popup" role="dialog" aria-modal="true" aria-labelledby="requestPopupTitle">
      <div class="request-popup-icon">
        <i class="fa-solid ${popupIcons[type] || popupIcons.confirm}"></i>
      </div>
      <p class="request-popup-label"></p>
      <h2 id="requestPopupTitle"></h2>
      <p class="request-popup-message"></p>
      <div class="request-popup-actions">
        ${showCancel ? '<button class="request-popup-cancel" type="button">Go back</button>' : ""}
        <button class="request-popup-confirm" type="button">${escapeRequestHtml(confirmText)}</button>
      </div>
    </section>
  `;

  overlay.querySelector(
    ".request-popup-label"
  ).textContent = label;

  overlay.querySelector(
    "#requestPopupTitle"
  ).textContent = title;

  overlay.querySelector(
    ".request-popup-message"
  ).textContent = message;

  const cancelButton =
    overlay.querySelector(
      ".request-popup-cancel"
    );

  const confirmButton =
    overlay.querySelector(
      ".request-popup-confirm"
    );

  cancelButton?.addEventListener(
    "click",
    () => closeRequestPopup(overlay)
  );

  confirmButton.addEventListener(
    "click",
    () => {
      closeRequestPopup(overlay);

      if (typeof onConfirm === "function") {
        onConfirm();
      }
    }
  );

  overlay.addEventListener(
    "click",
    (event) => {
      if (
        event.target === overlay &&
        showCancel
      ) {
        closeRequestPopup(overlay);
      }
    }
  );

  document.body.appendChild(overlay);
  confirmButton.focus();
}


// ======================================================
// CARD ACTIONS
// ======================================================

function setCardButtonsDisabled(
  requestId,
  disabled
) {
  document
    .querySelector(
      `[data-request-id="${requestId}"]`
    )
    ?.querySelectorAll("button")
    .forEach((button) => {
      button.disabled = disabled;
    });
}

async function completeDecline(request) {
  setCardButtonsDisabled(request.id, true);

  try {
    await paymentRequestsApi(
      `/api/payment-requests/${request.id}/decline`,
      { method: "POST" }
    );

    removeHandledRequest(request.id);
    loadRequestHistory();

    showRequestPopup({
      type: "success",
      label: "Request updated",
      title: "Request declined",
      message:
        `${request.requesterName}'s request was declined. ` +
        "No payment was made and no transaction was recorded.",
      confirmText: "Done",
    });
  } catch (error) {
    setCardButtonsDisabled(request.id, false);

    showRequestPopup({
      type: "error",
      label: "Request not updated",
      title: "Unable to decline",
      message: error.message,
      confirmText: "Try again",
    });
  }
}

function declinePaymentRequest(request) {
  showRequestPopup({
    type: "confirm",
    label: "Decline payment request",
    title: "Decline this request?",
    message:
      `${request.requesterName}'s request for ` +
      `${formatRequestMoney(request.amount)} will be marked as declined. ` +
      "No payment will be made.",
    confirmText: "Yes, decline",
    onConfirm: () => completeDecline(request),
  });
}

async function completeAccept(
  request,
  analysisId = null
) {
  setCardButtonsDisabled(request.id, true);

  try {
    const data = await paymentRequestsApi(
      `/api/payment-requests/${request.id}/accept`,
      {
        method: "POST",
        body: JSON.stringify({
          analysisId,
        }),
      }
    );

    const transactionReference =
      data.transaction?.transactionReference;

    if (!transactionReference) {
      throw new Error(
        "The server did not return a transaction ID."
      );
    }

    localStorage.setItem(
      "upiGuardianDashboardNeedsRefresh",
      "true"
    );

    removeHandledRequest(request.id);
    loadRequestHistory();

    showRequestPopup({
      type: "success",
      label: data.analysisUsed
        ? "Gemini-analyzed payment completed"
        : "Outgoing payment completed",
      title: "Payment successfully made",
      message:
        `${formatRequestMoney(request.amount)} was paid to ` +
        `${request.requesterName}. No money was received from the requester. ` +
        `${data.analysisUsed ? `Gemini risk level: ${data.transaction.riskLevel}. ` : ""}` +
        `Transaction ID: ${transactionReference}`,
      confirmText: "Done",
    });
  } catch (error) {
    setCardButtonsDisabled(request.id, false);

    showRequestPopup({
      type: "error",
      label: "Payment not completed",
      title: "Payment failed",
      message: error.message,
      confirmText: "Try again",
    });
  }
}

function acceptPaymentRequest(
  request,
  analysis = null
) {
  showRequestPopup({
    type: "payment",
    label: analysis
      ? "Gemini analysis completed — money will leave your account"
      : "Money will leave your account",
    title:
      `Pay ${formatRequestMoney(request.amount)} to ${request.requesterName}?`,
    message:
      `Accepting this request will debit ${formatRequestMoney(request.amount)} ` +
      `from your account and send it to ${request.requesterUpiId}. ` +
      "You are paying the requester; you are not receiving money." +
      (analysis
        ? ` Gemini classified this request as ${analysis.riskLevel} risk with a score of ${analysis.overallScore}/100.`
        : ""),
    confirmText:
      `Confirm & Pay ${formatRequestMoney(request.amount)}`,
    onConfirm: () =>
      completeAccept(
        request,
        analysis?.id || null
      ),
  });
}

function closeAnalysisOverlay(overlay) {
  overlay?.classList.add("closing");
  window.setTimeout(
    () => overlay?.remove(),
    180
  );
}

function showAnalysisLoading(request) {
  document
    .getElementById("requestAnalysisOverlay")
    ?.remove();

  const overlay = document.createElement("div");
  overlay.id = "requestAnalysisOverlay";
  overlay.className =
    "analysis-overlay analysis-loading-overlay";

  overlay.innerHTML = `
    <section class="analysis-loading-card" role="dialog" aria-modal="true" aria-label="Analyzing payment request">
      <div class="analysis-loading-icon">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div class="analysis-loading-dots"><span></span><span></span><span></span></div>
      <h2>Gemini is analyzing this request</h2>
      <p>Checking payment direction, requester familiarity, amount patterns and the payment note for risk indicators.</p>
      <strong>${escapeRequestHtml(request.requesterName)} · ${escapeRequestHtml(formatRequestMoney(request.amount))}</strong>
    </section>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

function createAnalysisList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="analysis-empty-copy">${escapeRequestHtml(emptyText)}</p>`;
  }

  return items
    .map((item) => `
      <div class="analysis-list-item">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          ${item.title ? `<strong>${escapeRequestHtml(item.title)}</strong>` : ""}
          <p>${escapeRequestHtml(item.description || item)}</p>
        </div>
      </div>
    `)
    .join("");
}

function showRequestAnalysis(request, analysis) {
  document
    .getElementById("requestAnalysisOverlay")
    ?.remove();

  const riskLevel = ["safe", "medium", "high"]
    .includes(analysis.riskLevel)
      ? analysis.riskLevel
      : "medium";

  const riskLabels = {
    safe: "Low risk",
    medium: "Medium risk",
    high: "High risk",
  };

  const riskIcons = {
    safe: "fa-shield-halved",
    medium: "fa-triangle-exclamation",
    high: "fa-shield-virus",
  };

  const score = Math.min(
    100,
    Math.max(0, Number(analysis.overallScore) || 0)
  );

  const familiarity =
    analysis.requesterFamiliarity || {};

  const amountComparison =
    analysis.amountComparison || {};

  const noteAnalysis =
    analysis.noteAnalysis || {};

  const suspiciousSignals =
    Array.isArray(noteAnalysis.suspiciousSignals)
      ? noteAnalysis.suspiciousSignals
      : [];

  const signalMarkup = suspiciousSignals.length > 0
    ? suspiciousSignals
        .map((signal) =>
          `<span>${escapeRequestHtml(signal)}</span>`
        )
        .join("")
    : "<span class=\"no-signal\">No strong suspicious phrase detected</span>";

  const riskFactors = Array.isArray(analysis.riskFactors)
    ? analysis.riskFactors.filter(
        (factor) =>
          factor.key !== "payment_direction"
      )
    : [];

  const overlay = document.createElement("div");
  overlay.id = "requestAnalysisOverlay";
  overlay.className =
    `analysis-overlay risk-${riskLevel}`;

  overlay.innerHTML = `
    <section class="analysis-modal" role="dialog" aria-modal="true" aria-labelledby="analysisModalTitle">
      <header class="analysis-modal-header">
        <div>
          <span class="ai-powered-label"><i class="fa-solid fa-wand-magic-sparkles"></i> Gemini-powered analysis</span>
          <h2 id="analysisModalTitle">Payment Request Risk Analysis</h2>
          <p>${escapeRequestHtml(request.requesterName)} · ${escapeRequestHtml(request.requesterUpiId)}</p>
        </div>
        <button class="analysis-close" type="button" aria-label="Return to requests"><i class="fa-solid fa-xmark"></i></button>
      </header>

      <div class="analysis-modal-body">
        <section class="analysis-overview">
          <div class="risk-score-ring" style="--risk-score: ${score * 3.6}deg">
            <strong>${Math.round(score)}</strong>
            <span>/ 100</span>
          </div>
          <div class="risk-summary">
            <span class="risk-level-badge"><i class="fa-solid ${riskIcons[riskLevel]}"></i> ${riskLabels[riskLevel]}</span>
            <h3>${escapeRequestHtml(formatRequestMoney(request.amount))} request</h3>
            <p>${escapeRequestHtml(analysis.summary || "Review this request carefully before continuing.")}</p>
          </div>
        </section>

        <section class="direction-result">
          <div class="direction-result-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div>
          <div>
            <span>Payment direction identified</span>
            <h3>Accepting means you are paying</h3>
            <p>${escapeRequestHtml(analysis.paymentDirection?.explanation || `Accepting sends ${formatRequestMoney(request.amount)} from your account to ${request.requesterName}.`)}</p>
          </div>
        </section>

        <div class="analysis-fact-grid">
          <section class="analysis-fact-card">
            <span><i class="fa-solid fa-user-check"></i> Requester familiarity</span>
            <h3>${familiarity.familiar ? "Familiar requester" : "Unfamiliar requester"}</h3>
            <p>${escapeRequestHtml(familiarity.explanation || "Familiarity information is unavailable.")}</p>
          </section>

          <section class="analysis-fact-card">
            <span><i class="fa-solid fa-chart-line"></i> Amount comparison</span>
            <h3>${escapeRequestHtml(String(amountComparison.rangeStatus || "No history").replaceAll("_", " "))}</h3>
            <p>${escapeRequestHtml(amountComparison.explanation || "Amount comparison is unavailable.")}</p>
          </section>
        </div>

        <section class="note-analysis-card ${noteAnalysis.misleadingLanguageDetected ? "misleading" : ""}">
          <div class="note-analysis-heading">
            <span><i class="fa-regular fa-message"></i> Gemini payment-note analysis</span>
            ${noteAnalysis.misleadingLanguageDetected ? '<strong><i class="fa-solid fa-triangle-exclamation"></i> Misleading language detected</strong>' : '<strong class="clear-note"><i class="fa-solid fa-check"></i> No direction conflict detected</strong>'}
          </div>
          <blockquote>“${escapeRequestHtml(request.paymentNote)}”</blockquote>
          <p>${escapeRequestHtml(noteAnalysis.explanation || analysis.ai?.explanation || "No explanation was returned.")}</p>
          <div class="signal-list">${signalMarkup}</div>
        </section>

        <div class="analysis-detail-grid">
          <section class="analysis-detail-card">
            <h3><i class="fa-solid fa-magnifying-glass-chart"></i> Reasons</h3>
            <div class="analysis-list">${createAnalysisList(riskFactors, "No additional risk factors were detected.")}</div>
          </section>

          <section class="analysis-detail-card">
            <h3><i class="fa-solid fa-lightbulb"></i> Recommendation</h3>
            <div class="analysis-list">${createAnalysisList(analysis.recommendations, "Verify the requester before accepting.")}</div>
          </section>
        </div>
      </div>

      <footer class="analysis-actions">
        <button class="analysis-return-button" type="button"><i class="fa-solid fa-arrow-left"></i> Return</button>
        <button class="analysis-decline-button" type="button"><i class="fa-solid fa-xmark"></i> Decline</button>
        <button class="analysis-accept-button" type="button"><i class="fa-solid fa-check"></i> Accept</button>
      </footer>
    </section>
  `;

  const closeAndReturn = () =>
    closeAnalysisOverlay(overlay);

  overlay
    .querySelector(".analysis-close")
    .addEventListener("click", closeAndReturn);

  overlay
    .querySelector(".analysis-return-button")
    .addEventListener("click", closeAndReturn);

  overlay
    .querySelector(".analysis-decline-button")
    .addEventListener("click", () => {
      closeAnalysisOverlay(overlay);
      window.setTimeout(
        () => declinePaymentRequest(request),
        190
      );
    });

  overlay
    .querySelector(".analysis-accept-button")
    .addEventListener("click", () => {
      closeAnalysisOverlay(overlay);
      window.setTimeout(
        () => acceptPaymentRequest(request, analysis),
        190
      );
    });

  document.body.appendChild(overlay);
  overlay
    .querySelector(".analysis-return-button")
    .focus();
}

async function analyzePaymentRequest(request) {
  setCardButtonsDisabled(request.id, true);
  const loadingOverlay =
    showAnalysisLoading(request);

  try {
    const data = await paymentRequestsApi(
      `/api/payment-requests/${request.id}/analyze`,
      { method: "POST" }
    );

    if (
      !data.analysis ||
      data.analysis.ai?.used !== true ||
      data.analysis.ai?.provider !== "gemini"
    ) {
      throw new Error(
        "Gemini did not complete this analysis. Please try again."
      );
    }

    loadingOverlay.remove();
    showRequestAnalysis(request, data.analysis);
  } catch (error) {
    loadingOverlay.remove();

    showRequestPopup({
      type: "error",
      label: "AI analysis unavailable",
      title: "Unable to analyze request",
      message: error.message,
      confirmText: "Return to requests",
    });
  } finally {
    setCardButtonsDisabled(request.id, false);
  }
}


// ======================================================
// EVENT DELEGATION
// ======================================================

requestGrid.addEventListener(
  "click",
  (event) => {
    const retryButton =
      event.target.closest(
        ".retry-requests-button"
      );

    if (retryButton) {
      loadPaymentRequests();
      return;
    }

    const actionButton =
      event.target.closest(
        "[data-request-action]"
      );

    if (!actionButton) {
      return;
    }

    const card =
      actionButton.closest(
        "[data-request-id]"
      );

    const request =
      paymentRequestsState.requests.get(
        card?.dataset.requestId
      );

    if (!request) {
      return;
    }

    const action =
      actionButton.dataset.requestAction;

    if (action === "decline") {
      declinePaymentRequest(request);
    } else if (action === "accept") {
      acceptPaymentRequest(request);
    } else if (action === "analyze") {
      analyzePaymentRequest(request);
    }
  }
);

requestHistoryGrid.addEventListener(
  "click",
  (event) => {
    if (
      event.target.closest(
        ".retry-history-button"
      )
    ) {
      loadRequestHistory();
    }
  }
);


// ======================================================
// INITIAL LOAD
// ======================================================

loadPaymentRequests();
loadRequestHistory();
