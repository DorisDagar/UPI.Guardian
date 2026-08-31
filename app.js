// ======================================================
// UPI GUARDIAN — DASHBOARD APP
// ======================================================

const token =
  localStorage.getItem("upiGuardianToken");

const API_BASE_URL =
  window.location.port === "5000"
    ? ""
    : "http://localhost:5000";

const DASHBOARD_REFRESH_KEY =
  "upiGuardianDashboardNeedsRefresh";

let dashboardIsInitializing = false;
let dashboardRefreshPromise = null;


// ======================================================
// STATE
// ======================================================

const state = {
  dashboard: null,
  user: null,
  toastTimer: null,
};


// ======================================================
// DOM REFERENCES
// ======================================================

const modal =
  document.getElementById("dashboardModal");

const modalTitle =
  document.getElementById("modalTitle");

const modalBody =
  document.getElementById("modalBody");

const modalIcon =
  document.getElementById("modalIcon");

const notificationDropdown =
  document.getElementById(
    "notificationDropdown"
  );

const profileDropdown =
  document.getElementById(
    "profileDropdown"
  );


// ======================================================
// AUTH CHECK
// ======================================================

if (!token) {
  window.location.replace("login.html");
}


// ======================================================
// HELPERS
// ======================================================

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatMoney(amount) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(amount);
}


function formatTransactionTime(value) {
  const transactionDate =
    new Date(value);

  if (
    Number.isNaN(
      transactionDate.getTime()
    )
  ) {
    return "Date unavailable";
  }

  const now =
    new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const startOfTransactionDay =
    new Date(
      transactionDate.getFullYear(),
      transactionDate.getMonth(),
      transactionDate.getDate()
    );

  const daysAgo =
    Math.round(
      (
        startOfToday -
        startOfTransactionDay
      ) /
      (
        24 *
        60 *
        60 *
        1000
      )
    );

  const time =
    transactionDate.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );

  if (daysAgo === 0) {
    return `Today, ${time}`;
  }

  if (daysAgo === 1) {
    return `Yesterday, ${time}`;
  }

  return transactionDate.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",

      year:
        transactionDate.getFullYear() ===
        now.getFullYear()
          ? undefined
          : "numeric",

      hour: "numeric",
      minute: "2-digit",
    }
  );
}


// ======================================================
// API HELPER
// ======================================================

async function api(
  path,
  options = {}
) {
  const response =
    await fetch(
      `${API_BASE_URL}${path}`,
      {
        ...options,

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {}),
        },
      }
    );

  const data =
    await response
      .json()
      .catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem(
      "upiGuardianToken"
    );

    localStorage.removeItem(
      "upiGuardianUser"
    );

    window.location.replace(
      "login.html"
    );

    throw new Error(
      "Session expired"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Something went wrong."
    );
  }

  return data;
}


// ======================================================
// TOAST
// ======================================================

function showToast(message) {
  const toast =
    document.getElementById(
      "dashboardToast"
    );

  if (!toast) {
    return;
  }

  toast.textContent =
    message;

  toast.hidden =
    false;

  clearTimeout(
    state.toastTimer
  );

  state.toastTimer =
    setTimeout(
      () => {
        toast.hidden = true;
      },
      3200
    );
}


// ======================================================
// SET USER
// ======================================================

function setUser(user) {
  if (!user?.name) {
    return;
  }

  state.user =
    user;

  const firstName =
    user.name
      .trim()
      .split(/\s+/)[0];

  const initial =
    firstName
      .charAt(0)
      .toUpperCase();

  const hour =
    new Date().getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  document
    .querySelectorAll(
      "[data-user-name]"
    )
    .forEach((element) => {
      element.textContent =
        user.name;
    });

  document
    .querySelectorAll(
      "[data-user-initial]"
    )
    .forEach((element) => {
      element.textContent =
        initial;
    });

  const profileEmail =
    document.getElementById(
      "profileEmail"
    );

  if (profileEmail) {
    profileEmail.textContent =
      user.email ||
      "Personal account";
  }

  const greetingElement =
    document.getElementById(
      "greeting"
    );

  if (greetingElement) {
    greetingElement.textContent =
      `${greeting}, ${firstName} `;

    const wave =
      document.createElement(
        "span"
      );

    wave.textContent =
      "👋";

    greetingElement.appendChild(
      wave
    );
  }
}


// ======================================================
// UPDATE DATE
// ======================================================

function updateDate() {
  const todayLabel =
    document.getElementById(
      "todayLabel"
    );

  if (!todayLabel) {
    return;
  }

  todayLabel.textContent =
    new Date()
      .toLocaleDateString(
        "en-IN",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      )
      .toUpperCase();
}


// ======================================================
// LOG OUT
// ======================================================

function logOut() {
  localStorage.removeItem(
    "upiGuardianToken"
  );

  localStorage.removeItem(
    "upiGuardianUser"
  );

  window.location.replace(
    "login.html"
  );
}


// ======================================================
// NOTIFICATIONS
// ======================================================

function renderNotifications() {
  const notifications =
    state.dashboard
      ?.notifications || [];

  const unread =
    notifications.filter(
      (item) => item.unread
    ).length;

  const badge =
    document.querySelector(
      ".notification-badge"
    );

  if (badge) {
    badge.textContent =
      unread;

    badge.hidden =
      unread === 0;
  }

  if (!notificationDropdown) {
    return;
  }

  notificationDropdown.innerHTML =
    notifications.length
      ? notifications
          .map(
            (item) => `
              <div class="notification-item">

                <strong>
                  ${escapeHtml(
                    item.title
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    item.message
                  )}
                </span>

                <small>
                  ${escapeHtml(
                    item.time
                  )}
                </small>

              </div>
            `
          )
          .join("")
      : `
          <div class="empty-state">
            You have no notifications.
          </div>
        `;
}


// ======================================================
// TRANSACTION MARKUP
// ======================================================

function transactionMarkup(item) {
  const statusClass =
    item.status === "Safe"
      ? "safe"
      : item.status === "Blocked"
        ? "blocked"
        : item.status === "Not analyzed"
          ? "not-analyzed"
          : "review";

  const avatarClass =
    item.status === "Safe"
      ? "green"
      : item.status === "Blocked"
        ? "red"
        : "amber";

  return `
    <div class="transaction-row">

      <div class="transaction-avatar ${avatarClass}-avatar">
        <i class="fa-solid fa-${escapeHtml(
          item.icon
        )}"></i>
      </div>

      <div class="transaction-info">

        <h4>
          ${escapeHtml(
            item.name
          )}
        </h4>

        <p>
          ${escapeHtml(
            item.upiId
          )}
        </p>

      </div>

      <div class="transaction-amount">

        <strong>
          ${formatMoney(
            item.amount
          )}
        </strong>

        <small>
          ${escapeHtml(
            formatTransactionTime(
              item.transactionTime ||
              item.time
            )
          )}
        </small>

      </div>

      <span class="risk-tag ${statusClass}-tag">
        ${escapeHtml(
          item.status
        )}
      </span>

    </div>
  `;
}


// ======================================================
// RENDER TRANSACTIONS
// ======================================================

function renderTransactions() {
  const items =
    state.dashboard
      ?.transactions || [];

  const transactionList =
    document.getElementById(
      "transactionList"
    );

  if (!transactionList) {
    return;
  }

  transactionList.innerHTML =
    items.length
      ? items
          .slice(0, 3)
          .map(
            transactionMarkup
          )
          .join("")
      : `
          <div class="empty-state">
            No transactions yet.
          </div>
        `;
}


// ======================================================
// RENDER TIMELINE
// ======================================================

function renderTimeline() {
  const items =
    state.dashboard
      ?.timeline || [];

  const timelineList =
    document.getElementById(
      "timelineList"
    );

  if (!timelineList) {
    return;
  }

  timelineList.innerHTML =
    items.length
      ? items
          .map(
            (
              item,
              index
            ) => `
              <div class="timeline-item">

                <div class="timeline-marker ${
                  item.type === "success"
                    ? "success-marker"
                    : "danger-marker"
                }">

                  <i class="fa-solid fa-${escapeHtml(
                    item.icon
                  )}"></i>

                </div>

                ${
                  index <
                  items.length - 1
                    ? '<div class="timeline-line"></div>'
                    : ""
                }

                <div class="timeline-content">

                  <div class="timeline-top">

                    <h4>
                      ${escapeHtml(
                        item.title
                      )}
                    </h4>

                    <span>
                      ${escapeHtml(
                        item.time
                      )}
                    </span>

                  </div>

                  <p>
                    ${escapeHtml(
                      item.description
                    )}
                  </p>

                  <span class="timeline-risk ${
                    item.type === "success"
                      ? "protected-risk"
                      : "high-risk"
                  }">

                    ${escapeHtml(
                      item.status
                    )}

                  </span>

                </div>

              </div>
            `
          )
          .join("")
      : `
          <div class="empty-state">
            No connected scam signals yet.
          </div>
        `;
}


// ======================================================
// RENDER DASHBOARD
// ======================================================

function renderDashboard() {
  const {
    stats,
    paymentRequests,
  } =
    state.dashboard;

  if (!stats) {
    return;
  }

  const safetyScore =
    document.getElementById(
      "safetyScore"
    );

  const paymentsReviewed =
    document.getElementById(
      "paymentsReviewed"
    );

  const riskPrevented =
    document.getElementById(
      "riskPrevented"
    );

  const paymentsStopped =
    document.getElementById(
      "paymentsStopped"
    );

  if (safetyScore) {
    safetyScore.textContent =
      stats.safetyScore;
  }

  if (paymentsReviewed) {
    paymentsReviewed.textContent =
      stats.paymentsReviewed;
  }

  if (riskPrevented) {
    riskPrevented.textContent =
      formatMoney(
        stats.riskPrevented
      );
  }

  if (paymentsStopped) {
    paymentsStopped.textContent =
      `${stats.paymentsStopped} payments stopped`;
  }

  const pending =
    (
      paymentRequests ||
      []
    ).filter(
      (item) =>
        item.status ===
        "Pending"
    ).length;

  const requestBadge =
    document.getElementById(
      "requestBadge"
    );

  if (requestBadge) {
    requestBadge.textContent =
      pending;

    requestBadge.hidden =
      pending === 0;
  }

  renderNotifications();
  renderTransactions();
  renderTimeline();
}


// ======================================================
// MODAL
// ======================================================

function openModal(
  title,
  icon,
  html
) {
  if (
    !modal ||
    !modalTitle ||
    !modalBody ||
    !modalIcon
  ) {
    return;
  }

  modalTitle.textContent =
    title;

  modalIcon.innerHTML =
    `<i class="fa-solid fa-${icon}"></i>`;

  modalBody.innerHTML =
    html;

  modal.hidden =
    false;

  document.body.style.overflow =
    "hidden";
}


function closeModal() {
  if (!modal) {
    return;
  }

  modal.hidden =
    true;

  document.body.style.overflow =
    "";
}


// ======================================================
// PAYMENT REQUESTS
// ======================================================

function requestMarkup(request) {
  return `
    <div class="request-item">

      <div class="request-top">

        <div>

          <strong>
            ${escapeHtml(
              request.sender
            )}
          </strong>

          <small>
            ${escapeHtml(
              request.upiId
            )}
            ·
            ${escapeHtml(
              request.reason
            )}
          </small>

        </div>

        <div>

          <strong>
            ${formatMoney(
              request.amount
            )}
          </strong>

          <span class="risk-pill ${request.risk.toLowerCase()}">
            ${escapeHtml(
              request.risk
            )}
            risk
          </span>

        </div>

      </div>

      <div class="request-actions">

        ${
          request.status === "Pending"
            ? `
                <button
                  class="modal-secondary"
                  data-request-id="${request.id}"
                  data-request-action="decline"
                >
                  Decline
                </button>

                <button
                  class="modal-primary"
                  data-request-id="${request.id}"
                  data-request-action="accept"
                >
                  Accept
                </button>
              `
            : `
                <strong>
                  ${escapeHtml(
                    request.status
                  )}
                </strong>
              `
        }

      </div>

    </div>
  `;
}


function openRequests() {
  const draw =
    () => {
      if (!modalBody) {
        return;
      }

      const requests =
        state.dashboard
          ?.paymentRequests || [];

      modalBody.innerHTML = `
        <p>
          Review the sender and risk
          explanation before responding.
        </p>

        <div class="request-list">
          ${
            requests.length
              ? requests
                  .map(
                    requestMarkup
                  )
                  .join("")
              : `
                  <div class="empty-state">
                    No payment requests.
                  </div>
                `
          }
        </div>
      `;

      modalBody
        .querySelectorAll(
          "[data-request-action]"
        )
        .forEach(
          (button) => {
            button.addEventListener(
              "click",
              async () => {
                try {
                  const data =
                    await api(
                      `/api/dashboard/payment-requests/${button.dataset.requestId}/action`,
                      {
                        method: "POST",

                        body:
                          JSON.stringify({
                            action:
                              button.dataset.requestAction,
                          }),
                      }
                    );

                  const index =
                    state.dashboard
                      .paymentRequests
                      .findIndex(
                        (item) =>
                          item.id ===
                          data.request.id
                      );

                  if (index !== -1) {
                    state.dashboard
                      .paymentRequests[index] =
                      data.request;
                  }

                  renderDashboard();
                  draw();

                  showToast(
                    data.message
                  );
                } catch (error) {
                  showToast(
                    error.message
                  );
                }
              }
            );
          }
        );
    };

  openModal(
    "Payment Requests",
    "inbox",
    ""
  );

  draw();
}


// ======================================================
// ALL TRANSACTIONS
// ======================================================

function openTransactions() {
  const items =
    state.dashboard
      ?.transactions || [];

  openModal(
    "All Transactions",
    "clock-rotate-left",
    `
      <div class="all-transactions">

        ${
          items.length
            ? items
                .map(
                  (item) => `
                    <div class="modal-transaction">

                      <div>

                        <strong>
                          ${escapeHtml(
                            item.name
                          )}
                        </strong>

                        <small>
                          ${escapeHtml(
                            item.upiId
                          )}
                          ·
                          ${escapeHtml(
                            formatTransactionTime(
                              item.transactionTime ||
                              item.time
                            )
                          )}
                        </small>

                      </div>

                      <div>

                        <strong>
                          ${formatMoney(
                            item.amount
                          )}
                        </strong>

                        <small>
                          ${escapeHtml(
                            item.status
                          )}
                        </small>

                      </div>

                    </div>
                  `
                )
                .join("")
            : `
                <div class="empty-state">
                  No transactions yet.
                </div>
              `
        }

      </div>
    `
  );
}


// ======================================================
// SETTINGS
// ======================================================

function openSettings() {
  const alertsEnabled =
    localStorage.getItem(
      "guardianAlerts"
    ) !== "false";

  openModal(
    "Protection Settings",
    "gear",
    `
      <div class="modal-form">

        <label>

          <input
            id="alertSetting"
            type="checkbox"
            ${
              alertsEnabled
                ? "checked"
                : ""
            }
          >

          Show Guardian safety alerts

        </label>

        <p>
          Protection checks remain active.
          This setting controls dashboard
          alert visibility on this browser.
        </p>

        <button
          class="modal-primary"
          id="saveSettings"
          type="button"
        >
          Save settings
        </button>

      </div>
    `
  );

  document
    .getElementById(
      "saveSettings"
    )
    ?.addEventListener(
      "click",
      () => {
        localStorage.setItem(
          "guardianAlerts",
          document.getElementById(
            "alertSetting"
          ).checked
        );

        closeModal();

        showToast(
          "Settings saved."
        );
      }
    );
}


// ======================================================
// HELP
// ======================================================

function openHelp() {
  openModal(
    "Help & Support",
    "circle-question",
    `
      <p>
        <strong>
          Suspect an active financial scam?
        </strong>
      </p>

      <p>
        Call India's cyber-fraud helpline
        <strong>1930</strong>
        immediately and report the incident at
        <strong>cybercrime.gov.in</strong>.
      </p>

      <div class="result-panel low">

        <strong>
          UPI safety reminder
        </strong>

        <p>
          Never share your UPI PIN, OTP, CVV
          or screen access. A UPI PIN is entered
          only to send money—not to receive it.
        </p>

      </div>
    `
  );
}


// ======================================================
// HANDLE DASHBOARD ACTIONS
// ======================================================

function handleAction(action) {
  const handlers = {

    dashboard: () =>
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      }),

    "new-payment": () => {
      window.location.href =
        "send%20money.html";
    },

    requests:
      openRequests,

    timeline: () => {
      const timelineSection =
        document.getElementById(
          "timelineSection"
        );

      if (timelineSection) {
        timelineSection.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },

    transactions:
      openTransactions,

    settings:
      openSettings,

    help:
      openHelp,
  };

  handlers[action]?.();
}


// ======================================================
// INITIALIZE DASHBOARD
// ======================================================

async function initializeDashboard() {
  dashboardIsInitializing = true;

  updateDate();

  let cachedUser = null;

  try {
    cachedUser =
      JSON.parse(
        localStorage.getItem(
          "upiGuardianUser"
        ) ||
        "null"
      );
  } catch {
    cachedUser = null;
  }

  setUser(
    cachedUser
  );

  try {
    const [
      profile,
      dashboard,
    ] =
      await Promise.all([
        api(
          "/api/auth/me"
        ),

        api(
          "/api/dashboard/summary",
          {
            cache: "no-store",
          }
        ),
      ]);

    localStorage.setItem(
      "upiGuardianUser",
      JSON.stringify(
        profile.user
      )
    );

    setUser(
      profile.user
    );

    state.dashboard =
      dashboard;

    renderDashboard();

    localStorage.removeItem(
      DASHBOARD_REFRESH_KEY
    );
  } catch (error) {
    if (
      error.message !==
      "Session expired"
    ) {
      showToast(
        error.message
      );
    }
  } finally {
    dashboardIsInitializing = false;
  }
}


// ======================================================
// REFRESH DASHBOARD AFTER A PAYMENT
// ======================================================

async function refreshDashboardIfNeeded() {
  if (
    dashboardIsInitializing ||
    document.visibilityState === "hidden" ||
    localStorage.getItem(
      DASHBOARD_REFRESH_KEY
    ) !== "true"
  ) {
    return;
  }

  if (dashboardRefreshPromise) {
    return dashboardRefreshPromise;
  }

  dashboardRefreshPromise =
    (async () => {
      try {
        const dashboard =
          await api(
            "/api/dashboard/summary",
            {
              cache: "no-store",
            }
          );

        state.dashboard =
          dashboard;

        renderDashboard();

        localStorage.removeItem(
          DASHBOARD_REFRESH_KEY
        );
      } catch (error) {
        if (
          error.message !==
          "Session expired"
        ) {
          showToast(
            error.message
          );
        }
      } finally {
        dashboardRefreshPromise =
          null;
      }
    })();

  return dashboardRefreshPromise;
}


window.addEventListener(
  "pageshow",
  refreshDashboardIfNeeded
);


document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      refreshDashboardIfNeeded();
    }
  }
);


window.addEventListener(
  "focus",
  refreshDashboardIfNeeded
);


// ======================================================
// DASHBOARD ACTION LISTENERS
// ======================================================
//
// IMPORTANT:
//
// If an element has a REAL href such as:
//
// href="message-analyzer.html"
// href="recovery.html"
// href="send money.html"
// href="scan and pay.html"
//
// app.js will NOT prevent the browser from
// navigating to that page.
//
// Only href="#" dashboard actions are handled
// by JavaScript.
// ======================================================

document
  .querySelectorAll(
    "[data-action]"
  )
  .forEach(
    (element) => {

      element.addEventListener(
        "click",
        (event) => {

          const action =
            element.dataset.action;

          const href =
            element.getAttribute(
              "href"
            );

          // ------------------------------------------------
          // IMPORTANT:
          // Allow real page links to work normally.
          // This fixes Message Analyzer and Recovery Mode.
          // ------------------------------------------------

          if (
            href &&
            href !== "#" &&
            !href.startsWith("javascript:")
          ) {
            return;
          }

          // ------------------------------------------------
          // Dashboard-only actions
          // ------------------------------------------------

          event.preventDefault();

          if (
            !state.dashboard &&
            ![
              "dashboard",
              "new-payment",
            ].includes(action)
          ) {
            showToast(
              "Dashboard data is still loading."
            );

            return;
          }

          handleAction(
            action
          );
        }
      );
    }
  );


// ======================================================
// CLOSE MODAL
// ======================================================

document
  .querySelectorAll(
    "[data-close-modal]"
  )
  .forEach(
    (element) =>
      element.addEventListener(
        "click",
        closeModal
      )
  );


// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  }
);


// ======================================================
// NOTIFICATION BUTTON
// ======================================================

document
  .getElementById(
    "notificationButton"
  )
  ?.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      if (profileDropdown) {
        profileDropdown.hidden =
          true;
      }

      if (notificationDropdown) {
        notificationDropdown.hidden =
          !notificationDropdown.hidden;

        event.currentTarget.setAttribute(
          "aria-expanded",
          String(
            !notificationDropdown.hidden
          )
        );
      }
    }
  );


// ======================================================
// TOP PROFILE
// ======================================================

document
  .getElementById(
    "topProfile"
  )
  ?.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();

      if (notificationDropdown) {
        notificationDropdown.hidden =
          true;
      }

      if (profileDropdown) {
        profileDropdown.hidden =
          !profileDropdown.hidden;
      }
    }
  );


// ======================================================
// SIDEBAR PROFILE
// ======================================================

document
  .getElementById(
    "sidebarProfile"
  )
  ?.addEventListener(
    "click",
    () => {
      if (
        confirm(
          "Do you want to log out of UPI Guardian?"
        )
      ) {
        logOut();
      }
    }
  );


// ======================================================
// LOGOUT BUTTON
// ======================================================

document
  .getElementById(
    "logoutButton"
  )
  ?.addEventListener(
    "click",
    logOut
  );


// ======================================================
// CLOSE DROPDOWNS
// ======================================================

document.addEventListener(
  "click",
  () => {

    if (notificationDropdown) {
      notificationDropdown.hidden =
        true;
    }

    if (profileDropdown) {
      profileDropdown.hidden =
        true;
    }
  }
);


// ======================================================
// START DASHBOARD
// ======================================================

initializeDashboard();
