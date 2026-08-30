const API_BASE_URL = "http://localhost:5000";

const paymentForm =
  document.getElementById("paymentForm");

const receiverNameInput =
  document.getElementById("receiverName");

const receiverUpiIdInput =
  document.getElementById("receiverUpiId");

const paymentAmountInput =
  document.getElementById("paymentAmount");

const paymentNoteInput =
  document.getElementById("paymentNote");

const analyzeButton =
  paymentForm?.querySelector(".analyze-button");

const directPayButton =
  paymentForm?.querySelector(
    ".direct-pay-button"
  );

// ==========================================
// LOAD RECENT RECEIVERS FROM SUPABASE
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadRecentReceivers() {
  const recentSection =
    document.querySelector(".recent-section");

  const receiverGrid =
    document.querySelector(".receiver-grid");

  const token = localStorage.getItem(
    "upiGuardianToken"
  );

  if (!recentSection || !receiverGrid || !token) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/transactions/recent-receivers?limit=6`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Unable to load recent receivers.");
    }

    const data = await response.json();
    const receivers = Array.isArray(data.receivers)
      ? data.receivers
      : [];

    if (!receivers.length) {
      recentSection.hidden = true;
      return;
    }

    const avatarClasses = [
      "receiver-purple",
      "receiver-blue",
      "receiver-green",
    ];

    receiverGrid.innerHTML = receivers
      .map((receiver, index) => {
        const name = String(receiver.name || "Receiver");
        const upiId = String(receiver.upiId || "");
        const avatarClass =
          avatarClasses[index % avatarClasses.length];
        const initial = escapeHtml(
          name.trim().charAt(0).toUpperCase()
        );

        return `
          <button class="receiver-card" type="button">
            <span class="receiver-avatar ${avatarClass}">${initial}</span>
            <span class="receiver-details">
              <h3>${escapeHtml(name)}</h3>
              <p>${escapeHtml(upiId)}</p>
            </span>
            <span class="receiver-arrow">
              <i class="fa-solid fa-arrow-right"></i>
            </span>
          </button>
        `;
      })
      .join("");

    receiverGrid
      .querySelectorAll(".receiver-card")
      .forEach((card) => {
        card.addEventListener("click", () => {
          const name = card
            .querySelector("h3")
            ?.textContent.trim();

          const upiId = card
            .querySelector("p")
            ?.textContent.trim();

          if (name) receiverNameInput.value = name;
          if (upiId) receiverUpiIdInput.value = upiId;

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        });
      });

    recentSection.hidden = false;
  } catch (error) {
    // Recent receivers are optional and should not affect payments.
    recentSection.hidden = true;
  }
}

// ==========================================
// DISPLAY A MESSAGE
// ==========================================

function showPaymentMessage(message, type = "error") {
  let messageBox =
    document.getElementById("paymentFormMessage");

  if (!messageBox) {
    messageBox = document.createElement("div");
    messageBox.id = "paymentFormMessage";

    messageBox.style.marginTop = "14px";
    messageBox.style.padding = "12px 14px";
    messageBox.style.borderRadius = "10px";
    messageBox.style.fontSize = "14px";
    messageBox.style.lineHeight = "1.5";

    const paymentActions =
  document.querySelector(".payment-actions");

(paymentActions || analyzeButton)
  .insertAdjacentElement(
    "afterend",
    messageBox
  );
  }

  messageBox.textContent = message;

  if (type === "success") {
    messageBox.style.color = "#6ee7b7";
    messageBox.style.background =
      "rgba(16, 185, 129, 0.12)";
    messageBox.style.border =
      "1px solid rgba(16, 185, 129, 0.35)";
  } else {
    messageBox.style.color = "#fda4af";
    messageBox.style.background =
      "rgba(244, 63, 94, 0.12)";
    messageBox.style.border =
      "1px solid rgba(244, 63, 94, 0.35)";
  }
}

// ==========================================
// DIRECT PAYMENT OUTCOME POPUP
// ==========================================

function showDirectPaymentPopup(
  message,
  type = "success"
) {
  const popupTypes = {
    success: {
      label: "Payment completed",
      title: "Payment successful!",
      icon: "fa-check",
      button: "Done",
    },
    cancelled: {
      label: "Payment stopped",
      title: "Payment cancelled",
      icon: "fa-xmark",
      button: "Close",
    },
    error: {
      label: "Payment not completed",
      title: "Payment failed",
      icon: "fa-triangle-exclamation",
      button: "Try again",
    },
  };

  const popupType =
    popupTypes[type] || popupTypes.error;

  document
    .getElementById("directPaymentOverlay")
    ?.remove();

  const existingMessage =
    document.getElementById(
      "paymentFormMessage"
    );

  if (existingMessage) {
    existingMessage.hidden = true;
  }

  const overlay =
    document.createElement("div");

  overlay.id = "directPaymentOverlay";
  overlay.className =
    `direct-payment-overlay ${type}`;

  overlay.innerHTML = `
    <div
      class="direct-payment-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="directPaymentTitle"
    >
      <div class="direct-payment-icon">
        <i class="fa-solid ${popupType.icon}"></i>
      </div>

      <p class="direct-payment-label">
        ${popupType.label}
      </p>

      <h2 id="directPaymentTitle">
        ${popupType.title}
      </h2>

      <p class="direct-payment-message"></p>

      <button
        class="direct-payment-close"
        type="button"
      >
        ${popupType.button}
      </button>
    </div>
  `;

  overlay.querySelector(
    ".direct-payment-message"
  ).textContent = message;

  const closePopup = () => {
    overlay.classList.add("closing");

    setTimeout(() => {
      overlay.remove();
    }, 180);
  };

  overlay
    .querySelector(".direct-payment-close")
    .addEventListener("click", closePopup);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePopup();
    }
  });

  document.body.appendChild(overlay);

  overlay
    .querySelector(".direct-payment-close")
    .focus();
}

// ==========================================
// QUICK-AMOUNT BUTTONS
// ==========================================

document
  .querySelectorAll(".quick-amounts button")
  .forEach((button) => {
    button.addEventListener("click", () => {
      const amount = Number(
        button.textContent.replace(/[₹,\s]/g, "")
      );

      if (Number.isFinite(amount)) {
        paymentAmountInput.value = amount;
        paymentAmountInput.focus();
      }
    });
  });

// ==========================================
// RECENT RECEIVER CARDS
// ==========================================

document
  .querySelectorAll(".receiver-card")
  .forEach((card) => {
    card.addEventListener("click", () => {
      const name =
        card.querySelector("h3")?.textContent.trim();

      const upiId =
        card.querySelector("p")?.textContent.trim();

      if (name) {
        receiverNameInput.value = name;
      }

      if (upiId) {
        receiverUpiIdInput.value = upiId;
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });

// ==========================================
// ANALYZE PAYMENT
// ==========================================

paymentForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const token = localStorage.getItem(
      "upiGuardianToken"
    );

    if (!token) {
      showPaymentMessage(
        "Please log in before analyzing a payment."
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);

      return;
    }

    const paymentData = {
      receiverName:
        receiverNameInput.value.trim(),

      receiverUpiId:
        receiverUpiIdInput.value
          .trim()
          .toLowerCase(),

      amount:
        Number(paymentAmountInput.value),

      paymentNote:
        paymentNoteInput.value.trim(),
    };

    if (
      !paymentData.receiverName ||
      !paymentData.receiverUpiId ||
      !Number.isFinite(paymentData.amount) ||
      paymentData.amount <= 0
    ) {
      showPaymentMessage(
        "Please enter the receiver name, UPI ID and payment amount."
      );

      return;
    }

    const originalButtonContent =
      analyzeButton.innerHTML;

    analyzeButton.disabled = true;
    directPayButton.disabled = true;

    analyzeButton.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Analyzing payment...
    `;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/risk/analyze`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(paymentData),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "upiGuardianToken"
        );

        localStorage.removeItem(
          "upiGuardianUser"
        );

        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Payment analysis failed."
        );
      }

      showPaymentMessage(
        "Analysis completed. Opening your risk report...",
        "success"
      );

      setTimeout(() => {
        window.location.href =
          `risk-analysis.html?analysisId=${encodeURIComponent(
            data.analysisId
          )}`;
      }, 600);
    } catch (error) {
      showPaymentMessage(error.message);

      if (
        error.message.includes(
          "session has expired"
        )
      ) {
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      }
    } finally {
      analyzeButton.disabled = false;
      directPayButton.disabled = false;

      analyzeButton.innerHTML =
        originalButtonContent;
    }
  }
);

// ==========================================
// MAKE A DIRECT PAYMENT
// ==========================================

directPayButton?.addEventListener(
  "click",
  async () => {
    const token = localStorage.getItem(
      "upiGuardianToken"
    );

    if (!token) {
      showDirectPaymentPopup(
        "Please log in before making a payment.",
        "error"
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2500);

      return;
    }

    const paymentData = {
      receiverName:
        receiverNameInput.value.trim(),

      receiverUpiId:
        receiverUpiIdInput.value
          .trim()
          .toLowerCase(),

      amount:
        Number(paymentAmountInput.value),

      paymentNote:
        paymentNoteInput.value.trim(),
    };

    if (
      !paymentData.receiverName ||
      !paymentData.receiverUpiId ||
      !Number.isFinite(paymentData.amount) ||
      paymentData.amount <= 0
    ) {
      showDirectPaymentPopup(
        "Please enter the receiver name, UPI ID and payment amount.",
        "error"
      );

      return;
    }

    const formattedAmount =
      new Intl.NumberFormat(
        "en-IN",
        {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        }
      ).format(paymentData.amount);

    const confirmed = window.confirm(
      `Pay ${formattedAmount} directly to ${paymentData.receiverName}?\n\n` +
      `UPI ID: ${paymentData.receiverUpiId}\n\n` +
      "This payment will continue without risk analysis."
    );

    if (!confirmed) {
      showDirectPaymentPopup(
        "No payment was made and no transaction was recorded.",
        "cancelled"
      );

      return;
    }

    const originalButtonContent =
      directPayButton.innerHTML;

    directPayButton.disabled = true;
    analyzeButton.disabled = true;

    directPayButton.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Processing...
    `;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/payments/direct`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(paymentData),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "upiGuardianToken"
        );

        localStorage.removeItem(
          "upiGuardianUser"
        );

        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to complete the payment."
        );
      }

      showDirectPaymentPopup(
        `Your payment was completed successfully. Transaction ID: ${data.transaction.transactionReference}`,
        "success"
      );

      paymentForm.reset();

      
    } catch (error) {
      showDirectPaymentPopup(
        error.message,
        "error"
      );

      if (
        error.message.includes(
          "session has expired"
        )
      ) {
        setTimeout(() => {
          window.location.href =
            "login.html";
        }, 2500);
      }
    } finally {
      directPayButton.disabled = false;
      analyzeButton.disabled = false;

      directPayButton.innerHTML =
        originalButtonContent;
    }
  }
);

loadRecentReceivers();
