const crypto = require("crypto");

const {
  calculateFactualRisk,
} = require("./riskEngine");

const {
  analyzePaymentContext,
} = require("./geminiRisk");

// ==========================================
// KEEP SCORE BETWEEN 0 AND 100
// ==========================================

function clampScore(value) {
  return Math.min(
    100,
    Math.max(0, Math.round(Number(value) || 0))
  );
}

// ==========================================
// GENERATE A TRANSACTION REFERENCE
// ==========================================

function createTransactionReference() {
  const randomPart = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `TXN${randomPart}`;
}

// ==========================================
// LOCAL FALLBACK IF GEMINI IS UNAVAILABLE
// ==========================================

function analyzeContextLocally(paymentNote = "") {
  const note = paymentNote.trim();

  const checks = [
    {
      pattern: /urgent|immediately|quickly|right now/i,
      signal: "Urgency or pressure",
      score: 20,
    },
    {
      pattern: /refund|cashback|reward|prize|lottery/i,
      signal: "Refund, reward or prize claim",
      score: 25,
    },
    {
      pattern: /kyc|account.*block|account.*suspend/i,
      signal: "KYC or account threat",
      score: 25,
    },
    {
      pattern: /otp|upi\s*pin|cvv|password/i,
      signal: "Request involving sensitive credentials",
      score: 40,
    },
    {
      pattern: /anydesk|teamviewer|screen\s*share|remote\s*access/i,
      signal: "Remote-access request",
      score: 45,
    },
    {
      pattern: /https?:\/\/|www\.|bit\.ly|tinyurl/i,
      signal: "External link",
      score: 15,
    },
  ];

  const detectedChecks = checks.filter((check) =>
    check.pattern.test(note)
  );

  const contextScore = clampScore(
    detectedChecks.reduce(
      (total, check) => total + check.score,
      note ? 5 : 0
    )
  );

  const contextLevel =
    contextScore >= 65
      ? "high"
      : contextScore >= 35
        ? "medium"
        : "safe";

  return {
    contextScore,
    contextLevel,

    explanation:
      detectedChecks.length > 0
        ? "The payment note contains language commonly associated with payment scams."
        : "No strong scam language was detected in the payment note.",

    suspiciousSignals: detectedChecks.map(
      (check) => check.signal
    ),

    recommendations: [
      {
        title: "Verify the receiver",
        description:
          "Confirm the receiver using a trusted phone number or official application.",
      },
      {
        title: "Never share credentials",
        description:
          "Never share your OTP, UPI PIN, CVV or password with anyone.",
      },
    ],

    aiUsed: false,
  };
}

// ==========================================
// CREATE COMPLETE PAYMENT ANALYSIS
// ==========================================

async function createPaymentRiskAnalysis({
  receiverName,
  receiverUpiId,
  amount,
  paymentNote,
  transactionHistory,
}) {
  const analysisTime = new Date();

  // 1. Calculate factual risk using transaction history.
  const factualRisk = calculateFactualRisk({
    receiverName,
    receiverUpiId,
    amount,
    analysisTime,
    transactionHistory,
  });

  // 2. Ask Gemini to understand the payment context.
  let contextRisk;
  let aiUsed = true;
  let aiError = null;

  try {
    contextRisk = await analyzePaymentContext({
      receiverName,
      amount,
      paymentNote,
      factualRisk,
    });
  } catch (error) {
    console.error(
      "Gemini unavailable. Using local fallback:",
      error.message
    );

    contextRisk = analyzeContextLocally(paymentNote);
    aiUsed = false;
    aiError = error.message;
  }

  // 3. Calculate final weighted score.
  //
  // Device/location is not included because the application
  // does not currently collect that information.
  //
  // Available weights total 0.95, so divide by 0.95 to
  // normalize the final result back to a 0-100 score.

  const weightedScore =
    factualRisk.scores.receiver * 0.3 +
    factualRisk.scores.amount * 0.25 +
    factualRisk.scores.timeAndFrequency * 0.15 +
    contextRisk.contextScore * 0.25;

  const overallScore = clampScore(
    weightedScore / 0.95
  );

  const riskLevel =
    overallScore >= 65
      ? "high"
      : overallScore >= 35
        ? "medium"
        : "safe";

  // 4. Create the main user-facing summary.
  let summary;

  if (riskLevel === "high") {
    summary =
      "This payment shows multiple high-risk indicators. Pause and verify all receiver details before proceeding.";
  } else if (riskLevel === "medium") {
    summary =
      "This payment contains some unusual indicators. Verify the receiver and payment purpose before proceeding.";
  } else {
    summary =
      "No major risk indicators were detected, but always confirm the receiver before making a payment.";
  }

  // 5. Combine factual and Gemini risk factors.
  const riskFactors = [
    ...factualRisk.riskFactors,
  ];

  if (
    contextRisk.contextScore >= 35 ||
    contextRisk.suspiciousSignals.length > 0
  ) {
    riskFactors.push({
      key: "payment_context",
      title: "Suspicious Payment Context",
      description: contextRisk.explanation,
      level: contextRisk.contextLevel,
      score: contextRisk.contextScore,
      signals: contextRisk.suspiciousSignals,
    });
  }

  // If nothing risky was detected, provide a safe factor.
  if (riskFactors.length === 0) {
    riskFactors.push({
      key: "no_major_risk",
      title: "No Major Risk Detected",
      description:
        "The payment is consistent with the available transaction information.",
      level: "safe",
      score: overallScore,
    });
  }

  // 6. Return one complete analysis object.
  return {
    transaction: {
      reference: createTransactionReference(),
      receiverName: receiverName.trim(),
      receiverUpiId: receiverUpiId
        .trim()
        .toLowerCase(),
      amount: Number(amount),
      paymentNote: paymentNote?.trim() || "",
      analysisTime: analysisTime.toISOString(),
      channel: "UPI Guardian",
    },

    overallScore,
    riskLevel,
    summary,

    breakdown: {
      unusualReceiver:
        factualRisk.scores.receiver,

      transactionAmount:
        factualRisk.scores.amount,

      timeAndFrequency:
        factualRisk.scores.timeAndFrequency,

      messageContext:
        contextRisk.contextScore,

      deviceAndLocation: null,
    },

    facts: factualRisk.facts,

    riskFactors,

    recommendations:
      contextRisk.recommendations,

    historicalComparison:
      factualRisk.historicalComparison,

    ai: {
      used: aiUsed,
      provider: aiUsed ? "gemini" : "local-fallback",

      model: aiUsed
        ? process.env.GEMINI_MODEL ||
          "gemini-3.5-flash-lite"
        : null,

      explanation: contextRisk.explanation,

      suspiciousSignals:
        contextRisk.suspiciousSignals,

      error: aiError,
    },
  };
}

module.exports = {
  createPaymentRiskAnalysis,
};