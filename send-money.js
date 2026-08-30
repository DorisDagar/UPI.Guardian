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

    analyzeButton.insertAdjacentElement(
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
      analyzeButton.innerHTML =
        originalButtonContent;
    }
  }
);