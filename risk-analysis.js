"use strict";

const API_BASE_URL = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", loadRiskAnalysis);

async function loadRiskAnalysis() {
  const params = new URLSearchParams(window.location.search);
  const analysisId = params.get("analysisId");
  const token = localStorage.getItem("upiGuardianToken");

  const analyzeButton = document.querySelector(".analyze-btn");

  if (analyzeButton) {
    analyzeButton.addEventListener("click", () => {
      window.location.href = "/send%20money.html";
    });
  }

  if (!analysisId) {
    showError(
      "Analysis ID is missing. Please analyze the payment again."
    );
    return;
  }

  if (!token) {
    showError(
      "Your login session was not found. Please log in again."
    );
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/risk/${encodeURIComponent(analysisId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to load the analysis."
      );
    }

    if (!result.analysis) {
      throw new Error(
        "The server did not return an analysis."
      );
    }

    updateRiskPage(result.analysis);
  } catch (error) {
    console.error("Risk analysis error:", error);

    showError(
      error.message ||
        "Unable to load the risk analysis."
    );
  }
}

function updateRiskPage(analysis) {
  const transaction = analysis.transaction || {};

  const score = limitScore(analysis.overallScore);

  const riskLevel = getRiskLevel(
    analysis.riskLevel,
    score
  );

  const color = getRiskColor(riskLevel);

  // ==================================
  // OVERALL SCORE
  // ==================================

  setText(".score-inner h2", score);

  setText(
    ".risk-description h2",
    `${capitalize(riskLevel)} Risk`
  );

  setText(
    ".risk-description > p",
    analysis.summary || getDefaultSummary(riskLevel)
  );

  const riskHeading = document.querySelector(
    ".risk-description h2"
  );

  if (riskHeading) {
    riskHeading.style.color = color;
  }

  const scoreCircle = document.querySelector(
    ".score-circle"
  );

  if (scoreCircle) {
    const angle = score * 3.6;

    scoreCircle.style.background = `
      conic-gradient(
        ${color} 0deg,
        ${color} ${angle}deg,
        #242e4d ${angle}deg,
        #242e4d 360deg
      )
    `;
  }

  // ==================================
  // ANALYSIS TIME
  // ==================================

  const analyzedTime = document.querySelector(
    ".analyzed-time"
  );

  if (analyzedTime) {
    analyzedTime.innerHTML = `
      <i class="fa-regular fa-clock"></i>
      Analyzed on ${formatDate(transaction.analysisTime)}
    `;
  }

  // ==================================
  // TRANSACTION DETAILS
  // ==================================

  const detailValues = document.querySelectorAll(
    ".transaction-details .detail-item strong"
  );

  const values = [
    transaction.reference || "Not available",

    formatCurrency(transaction.amount),

    transaction.receiverName || "Not available",

    transaction.receiverUpiId || "Not available",

    formatDate(transaction.analysisTime),

    transaction.channel || "UPI Guardian",
  ];

  detailValues.forEach((element, index) => {
    if (values[index] !== undefined) {
      element.textContent = values[index];
    }
  });

  // ==================================
  // RISK FACTORS
  // ==================================

  updateRiskFactors(
    Array.isArray(analysis.riskFactors)
      ? analysis.riskFactors
      : []
  );

  // ==================================
  // RISK BREAKDOWN
  // ==================================

  updateRiskBreakdown(
    analysis.breakdown || {},
    score,
    color
  );

  // ==================================
  // RECOMMENDATIONS
  // ==================================

  updateRecommendations(
    Array.isArray(analysis.recommendations)
      ? analysis.recommendations
      : []
  );

  // ==================================
  // HISTORICAL COMPARISON
  // ==================================

  updateHistoricalComparison(
    analysis.historicalComparison || {}
  );
}

function updateRiskFactors(factors) {
  const factorList = document.querySelector(
    ".factor-list"
  );

  if (!factorList) {
    return;
  }

  if (factors.length === 0) {
    factorList.innerHTML = `
      <div class="factor-item">
        <div class="factor-icon low">
          <i class="fa-solid fa-check"></i>
        </div>

        <div class="factor-content">
          <h4>No major risk factors</h4>
          <p>
            No major warning was detected from the
            available payment information.
          </p>
        </div>

        <span class="risk-badge low">
          Low Risk
        </span>
      </div>
    `;

    return;
  }

  factorList.innerHTML = factors
    .map((factor) => {
      const level = getRiskLevel(
        factor.level,
        factor.score
      );

      let iconClass = "low";

      if (level === "high") {
        iconClass = "danger";
      } else if (level === "medium") {
        iconClass = "warning";
      }

      return `
        <div class="factor-item">

          <div class="factor-icon ${iconClass}">
            ${getFactorIcon(factor.key)}
          </div>

          <div class="factor-content">

            <h4>
              ${escapeHtml(
                factor.title || "Risk indicator"
              )}
            </h4>

            <p>
              ${escapeHtml(
                factor.description ||
                  "This payment needs attention."
              )}
            </p>

          </div>

          <span class="risk-badge ${level}">
            ${capitalize(level)} Risk
          </span>

        </div>
      `;
    })
    .join("");
}

function updateRiskBreakdown(
  breakdown,
  overallScore,
  overallColor
) {
  const items = document.querySelectorAll(
    ".risk-breakdown .breakdown-item"
  );

  const breakdownDefinitions = [
    {
      keys: [
        "unusualReceiver",
        "receiver",
        "receiverRisk",
        "payee",
      ],

      title: "Unusual Receiver",

      description:
        "Receiver familiarity and payment history",

      fallback: overallScore,
    },

    {
      keys: [
        "transactionAmount",
        "amount",
        "amountRisk",
      ],

      title: "Transaction Amount",

      description:
        "Compared with your recent average",

      fallback: overallScore,
    },

    {
      keys: [
        "timeFrequency",
        "timeAndFrequency",
        "time",
        "frequency",
      ],

      title: "Time & Frequency",

      description:
        "Payment time and recent frequency",

      fallback: 0,
    },

    {
      keys: [
        "messageContext",
        "message",
        "context",
        "geminiContext",
      ],

      title: "Message/Context",

      description:
        "Payment-note and scam-language analysis",

      fallback: 0,
    },
  ];

  breakdownDefinitions.forEach(
    (definition, index) => {
      const item = items[index];

      if (!item) {
        return;
      }

      const value = findBreakdownValue(
        breakdown,
        definition.keys
      );

      const score = limitScore(
        getBreakdownScore(
          value,
          definition.fallback
        )
      );

      const description =
        getBreakdownDescription(
          value,
          definition.description
        );

      const heading = item.querySelector("h4");

      const descriptionElement =
        item.querySelector(".breakdown-top p");

      const scoreElement =
        item.querySelector(
          ".breakdown-top strong"
        );

      const progressBar =
        item.querySelector(".progress-bar");

      if (heading) {
        heading.textContent = definition.title;
      }

      if (descriptionElement) {
        descriptionElement.textContent =
          description;
      }

      if (scoreElement) {
        scoreElement.textContent =
          `${score}/100`;
      }

      if (progressBar) {
        progressBar.style.width = `${score}%`;
      }
    }
  );

  // Device and location are not collected.
  const locationItem = items[4];

  if (locationItem) {
    const description =
      locationItem.querySelector(
        ".breakdown-top p"
      );

    const scoreElement =
      locationItem.querySelector(
        ".breakdown-top strong"
      );

    const progressBar =
      locationItem.querySelector(
        ".progress-bar"
      );

    if (description) {
      description.textContent =
        "Not evaluated—location was not collected";
    }

    if (scoreElement) {
      scoreElement.textContent =
        "Not evaluated";
    }

    if (progressBar) {
      progressBar.style.width = "0%";
    }
  }

  const overallRisk = document.querySelector(
    ".overall-risk strong"
  );

  if (overallRisk) {
    overallRisk.textContent =
      `${overallScore}/100`;

    overallRisk.style.color =
      overallColor;
  }
}

function updateRecommendations(recommendations) {
  if (recommendations.length === 0) {
    return;
  }

  const section = document.querySelector(
    ".recommendations"
  );

  if (!section) {
    return;
  }

  section
    .querySelectorAll(".recommendation-item")
    .forEach((item) => item.remove());

  const warningBox =
    section.querySelector(".warning-box");

  const icons = [
    "fa-shield-halved",
    "fa-message",
    "fa-lock",
    "fa-circle-check",
  ];

  const iconClasses = [
    "shield",
    "message",
    "lock",
    "shield",
  ];

  recommendations
    .slice(0, 4)
    .forEach((recommendation, index) => {
      const item =
        document.createElement("div");

      item.className =
        "recommendation-item";

      item.innerHTML = `
        <div class="recommendation-icon ${iconClasses[index]}">
          <i class="fa-solid ${icons[index]}"></i>
        </div>

        <div>
          <h4>
            ${escapeHtml(
              recommendation.title ||
                "Stay cautious"
            )}
          </h4>

          <p>
            ${escapeHtml(
              recommendation.description ||
                "Verify the payment details before continuing."
            )}
          </p>
        </div>
      `;

      section.insertBefore(
        item,
        warningBox || null
      );
    });
}

function updateHistoricalComparison(history) {
  const comparisonText = document.querySelector(
    ".comparison-text"
  );

  if (!comparisonText) {
    return;
  }

  const currentAmount = Number(
    history.currentAmount || 0
  );

  const usualAmount = Number(
    history.usualAverageAmount || 0
  );

  const amountRatio = Number(
    history.amountRatio || 0
  );

  const transactionsChecked = Number(
    history.recentTransactionsChecked || 0
  );

  if (transactionsChecked === 0) {
    comparisonText.textContent =
      "No completed transaction history is available yet. This payment will establish your baseline.";

    return;
  }

  comparisonText.innerHTML = `
    Current payment:
    <strong>${formatCurrency(currentAmount)}</strong>

    · Recent average:
    <strong>${formatCurrency(usualAmount)}</strong>

    · Ratio:
    <strong>${amountRatio.toFixed(1)}x</strong>
  `;
}

function findBreakdownValue(object, possibleKeys) {
  for (const key of possibleKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        object,
        key
      )
    ) {
      return object[key];
    }
  }

  const normalizedKeys =
    possibleKeys.map(normalizeKey);

  for (const [key, value] of Object.entries(object)) {
    if (
      normalizedKeys.includes(normalizeKey(key))
    ) {
      return value;
    }
  }

  return undefined;
}

function getBreakdownScore(value, fallback) {
  if (typeof value === "number") {
    return value;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value.score ??
      value.value ??
      value.riskScore ??
      fallback
    );
  }

  return fallback;
}

function getBreakdownDescription(
  value,
  fallback
) {
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value.description ||
      value.reason ||
      value.label ||
      fallback
    );
  }

  return fallback;
}

function showError(message) {
  const oldError =
    document.getElementById(
      "riskLoadingError"
    );

  if (oldError) {
    oldError.remove();
  }

  const errorBox =
    document.createElement("div");

  errorBox.id = "riskLoadingError";

  errorBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    max-width: 700px;
    padding: 15px 20px;
    background: #351b35;
    color: #ffdce4;
    border: 1px solid #ff5577;
    border-radius: 10px;
    font-family: Inter, sans-serif;
    font-weight: 600;
    box-shadow: 0 12px 35px rgba(0,0,0,0.35);
  `;

  errorBox.textContent = message;

  document.body.appendChild(errorBox);
}

function setText(selector, value) {
  const element =
    document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function getRiskLevel(value, score) {
  const level = String(
    value || ""
  ).toLowerCase();

  if (level.includes("low")) {
    return "low";
  }

  if (
    level.includes("medium") ||
    level.includes("moderate")
  ) {
    return "medium";
  }

  if (
    level.includes("high") ||
    level.includes("critical")
  ) {
    return "high";
  }

  const numericScore = limitScore(score);

  if (numericScore < 40) {
    return "low";
  }

  if (numericScore < 70) {
    return "medium";
  }

  return "high";
}

function getRiskColor(level) {
  if (level === "low") {
    return "#55d9b2";
  }

  if (level === "medium") {
    return "#ffbd4a";
  }

  return "#ff586c";
}

function getDefaultSummary(level) {
  if (level === "low") {
    return "No major risk indicators were detected, but always confirm the receiver before paying.";
  }

  if (level === "medium") {
    return "Some payment details need attention. Verify the receiver and purpose before continuing.";
  }

  return "This transaction shows high-risk indicators. Pause and verify every payment detail before continuing.";
}

function getFactorIcon(key) {
  const value = String(
    key || ""
  ).toLowerCase();

  if (value.includes("amount")) {
    return "₹";
  }

  if (
    value.includes("message") ||
    value.includes("context")
  ) {
    return `
      <i class="fa-solid fa-comment-dots"></i>
    `;
  }

  if (
    value.includes("time") ||
    value.includes("frequency")
  ) {
    return `
      <i class="fa-regular fa-clock"></i>
    `;
  }

  if (value.includes("location")) {
    return `
      <i class="fa-solid fa-location-dot"></i>
    `;
  }

  return `
    <i class="fa-solid fa-exclamation"></i>
  `;
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits:
        amount % 1 === 0 ? 0 : 2,
    }
  ).format(amount);
}

function formatDate(value) {
  const date = value
    ? new Date(value)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
}

function limitScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(score))
  );
}

function capitalize(value) {
  return (
    String(value).charAt(0).toUpperCase() +
    String(value).slice(1)
  );
}

function normalizeKey(value) {
  return String(value)
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}