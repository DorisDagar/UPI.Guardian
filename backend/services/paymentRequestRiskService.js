const {
  calculateFactualRisk,
} = require("./riskEngine");

const {
  analyzePaymentRequestContext,
} = require("./geminiRisk");

function clampScore(value) {
  return Math.min(
    100,
    Math.max(0, Math.round(Number(value) || 0))
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

async function createPaymentRequestRiskAnalysis({
  requesterName,
  requesterUpiId,
  amount,
  paymentNote,
  transactionHistory,
  previousPaymentsToRequesterCount,
}) {
  const analysisTime = new Date();

  const directionFacts = {
    requestType: "upi_collect_request",
    direction: "money_out",
    acceptingDebitsUser: true,
    acceptingCreditsRequester: true,
  };

  const factualRisk = calculateFactualRisk({
    receiverName: requesterName,
    receiverUpiId: requesterUpiId,
    amount,
    analysisTime,
    transactionHistory,
    previousPaymentsToReceiverCount:
      previousPaymentsToRequesterCount,
  });

  const contextRisk =
    await analyzePaymentRequestContext({
      requesterName,
      requesterUpiId,
      amount,
      paymentNote,
      factualRisk,
      directionFacts,
    });

  const weightedScore =
    factualRisk.scores.receiver * 0.3 +
    factualRisk.scores.amount * 0.25 +
    factualRisk.scores.timeAndFrequency * 0.15 +
    contextRisk.contextScore * 0.3;

  const overallScore =
    clampScore(weightedScore);

  const riskLevel =
    overallScore >= 65
      ? "high"
      : overallScore >= 35
        ? "medium"
        : "safe";

  const familiarRequester =
    !factualRisk.facts.isNewPayee;

  const amountRangeStatus =
    factualRisk.facts.amountRangeStatus;

  let summary =
    `Accepting this collect request will debit ${formatCurrency(amount)} from your account and send it to ${requesterName}. `;

  if (riskLevel === "high") {
    summary +=
      "Multiple high-risk indicators were detected. Do not accept until you independently verify the requester and purpose.";
  } else if (riskLevel === "medium") {
    summary +=
      "Some unusual indicators were detected. Verify the requester and purpose before accepting.";
  } else {
    summary +=
      "No major risk indicators were detected, but confirm the requester before accepting.";
  }

  const riskFactors = [
    ...factualRisk.riskFactors,
    {
      key: "payment_direction",
      title: "You Will Pay the Requester",
      description:
        contextRisk.directionExplanation,
      level: "safe",
      score: 0,
      informational: true,
    },
  ];

  if (
    contextRisk.contextScore >= 35 ||
    contextRisk.suspiciousSignals.length > 0
  ) {
    riskFactors.push({
      key: "request_context",
      title: "Payment Request Language",
      description:
        contextRisk.explanation,
      level: contextRisk.contextLevel,
      score: contextRisk.contextScore,
      signals:
        contextRisk.suspiciousSignals,
    });
  }

  if (contextRisk.misleadingLanguageDetected) {
    riskFactors.push({
      key: "misleading_collect_language",
      title: "Misleading Request Description",
      description:
        contextRisk.misleadingLanguageExplanation,
      level: "high",
      score: contextRisk.contextScore,
    });
  }

  return {
    mode: "payment_request",

    request: {
      requesterName: requesterName.trim(),
      requesterUpiId:
        requesterUpiId.trim().toLowerCase(),
      amount: Number(amount),
      paymentNote:
        paymentNote?.trim() || "",
      analysisTime:
        analysisTime.toISOString(),
    },

    paymentDirection: {
      ...directionFacts,
      explanation:
        contextRisk.directionExplanation,
    },

    overallScore,
    riskLevel,
    summary,

    requesterFamiliarity: {
      familiar: familiarRequester,
      previousCompletedPayments:
        factualRisk.facts
          .previousPaymentsToReceiver,
      explanation: familiarRequester
        ? `You have previously completed ${factualRisk.facts.previousPaymentsToReceiver} payment(s) to this UPI ID.`
        : "You have not completed a payment to this UPI ID before.",
    },

    amountComparison: {
      rangeStatus: amountRangeStatus,
      currentAmount: Number(amount),
      usualMinimumAmount:
        factualRisk.facts.usualMinimumAmount,
      usualMaximumAmount:
        factualRisk.facts.usualMaximumAmount,
      explanation:
        amountRangeStatus === "no_history"
          ? "There is not enough completed payment history to establish your usual range."
          : `This amount is ${amountRangeStatus} your usual payment range of ${formatCurrency(factualRisk.facts.usualMinimumAmount)} to ${formatCurrency(factualRisk.facts.usualMaximumAmount)}.`,
    },

    noteAnalysis: {
      misleadingLanguageDetected:
        contextRisk.misleadingLanguageDetected,
      explanation:
        contextRisk.misleadingLanguageExplanation,
      suspiciousSignals:
        contextRisk.suspiciousSignals,
    },

    breakdown: {
      unusualRequester:
        factualRisk.scores.receiver,
      requestAmount:
        factualRisk.scores.amount,
      timeAndFrequency:
        factualRisk.scores.timeAndFrequency,
      requestContext:
        contextRisk.contextScore,
      paymentDirection: "money_out",
    },

    riskFactors,
    recommendations:
      contextRisk.recommendations,
    historicalComparison:
      factualRisk.historicalComparison,

    ai: {
      used: true,
      provider: "gemini",
      model:
        process.env.GEMINI_MODEL ||
        "gemini-3.7-flash",
      explanation:
        contextRisk.explanation,
    },
  };
}

module.exports = {
  createPaymentRequestRiskAnalysis,
};
