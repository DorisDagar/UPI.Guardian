const actions = {
  dashboard: "You are already on the dashboard.",
  send: "Send Money is the next frontend screen.",
  scan: "Scan & Pay is coming in the next milestone.",
  requests: "Payment Requests is coming in the next milestone.",
  messages: "Message Analyzer is coming in the next milestone.",
  timeline: "Scam Timeline is coming in the next milestone.",
  recovery: "Recovery Mode is coming in the next milestone.",
  settings: "Settings is coming in the next milestone.",
  help: "Help & Support is coming in the next milestone.",
};

const toast = document.querySelector("#toast");
const toastText = toast.querySelector("span");
let toastTimer;

function showToast(message) {
  toastText.textContent = message;
  toast.hidden = false;

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function setActivePage(page) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });
}

function updateDateAndGreeting() {
  const now = new Date();

  const date = now
    .toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const hour = now.getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  document.querySelector("#todayLabel").textContent = date;

  document.querySelector("#greeting").innerHTML =
    `${greeting}, Arjun <span>👋</span>`;
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const page = link.dataset.page;

    setActivePage(page);
    showToast(actions[page]);
  });
});

document.querySelectorAll("[data-action]").forEach((element) => {
  element.addEventListener("click", () => {
    const action = element.dataset.action;

    if (action === "notifications") {
      const menu = document.querySelector("#notificationMenu");

      menu.hidden = !menu.hidden;
      return;
    }

    if (action === "account") {
      showToast(
        "Account menu will be connected after authentication is added.",
      );
      return;
    }

    const message = {
      "new-payment": "The Send Money flow will open here.",
      "review-payment":
        "The payment review experience is our next frontend milestone.",
      amount: "Unusual amount detection will open in the risk review.",
      receiver: "Receiver history will be checked before payment.",
      message: "The AI-assisted Message Analyzer will open here.",
      trusted:
        "Trusted Person Confirmation will be connected to the payment review.",
      transactions: "Transaction history will open here.",
      help: actions.help,
      timeline: actions.timeline,
      send: actions.send,
      scan: actions.scan,
      recovery: actions.recovery,
    }[action] || "This feature will be connected in a later milestone.";

    showToast(message);
  });
});

document.addEventListener("click", (event) => {
  const menu = document.querySelector("#notificationMenu");

  if (
    !event.target.closest("#notificationMenu") &&
    !event.target.closest('[data-action="notifications"]')
  ) {
    menu.hidden = true;
  }
});

updateDateAndGreeting();