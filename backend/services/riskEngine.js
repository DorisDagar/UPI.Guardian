function clamp(number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function calculateFactualRisk({
  receiverName,
  receiverUpiId,
  amount,
  analysisTime,
  transactionHistory,
}) {
  const normalizedUpiId = receiverUpiId.trim().toLowerCase();
  const numericAmount = Number(amount);
  const history = Array.isArray(transactionHistory)
    ? transactionHistory
    : [];

  // ==========================================
  // 1. CHECK WHETHER THIS IS A NEW PAYEE
  // ==========================================

  const previousPaymentsToReceiver = history.filter((transaction) => {
    return (
      transaction.receiver_upi_id?.trim().toLowerCase() === normalizedUpiId
    );
  });

  const isNewPayee = previousPaymentsToReceiver.length === 0;

  // Suspicious words sometimes found in impersonation UPI IDs.
  const suspiciousReceiverPattern =
    /(refund|reward|prize|support|helpdesk|claim|kyc|verify|cashback)/i;

  const hasSuspiciousReceiverName = suspiciousReceiverPattern.test(
    `${receiverName} ${receiverUpiId}`
  );

  let receiverScore = isNewPayee ? 70 : 15;

  if (hasSuspiciousReceiverName) {
    receiverScore += 20;
  }

  receiverScore = clamp(receiverScore);

  // ==========================================
  // 2. COMPARE AMOUNT WITH TRANSACTION HISTORY
  // ==========================================

  const previousAmounts = history
    .map((transaction) => Number(transaction.amount))
    .filter((value) => Number.isFinite(value) && value > 0);

  const averageAmount =
    previousAmounts.length > 0
      ? previousAmounts.reduce((total, value) => total + value, 0) /
        previousAmounts.length
      : numericAmount;

  const amountRatio =
    averageAmount > 0 ? numericAmount / averageAmount : 1;

  let amountScore = 15;

  if (previousAmounts.length === 0) {
    amountScore = 25;
  } else if (amountRatio >= 3) {
    amountScore = 90;
  } else if (amountRatio >= 2) {
    amountScore = 70;
  } else if (amountRatio >= 1.5) {
    amountScore = 50;
  } else if (amountRatio >= 1.2) {
    amountScore = 30;
  }

  // ==========================================
  // 3. CHECK TRANSACTION TIME AND FREQUENCY
  // ==========================================

  const currentTime = new Date(analysisTime);
  const currentHour = currentTime.getHours();

  const isLateNight = currentHour >= 23 || currentHour < 5;

  const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

  const transactionsDuringLastHour = history.filter((transaction) => {
    const transactionTime = new Date(transaction.transaction_time);

    return (
      !Number.isNaN(transactionTime.getTime()) &&
      transactionTime >= oneHourAgo &&
      transactionTime <= currentTime
    );
  }).length;

  let timeScore = isLateNight ? 65 : 15;

  if (transactionsDuringLastHour >= 3) {
    timeScore += 25;
  }

  timeScore = clamp(timeScore);

  // ==========================================
  // 4. BUILD FACTUAL RISK FACTORS
  // ==========================================

  const riskFactors = [];

  if (isNewPayee) {
    riskFactors.push({
      key: "new_payee",
      title: "New Payee",
      description: "You have not sent money to this UPI ID before.",
      level: "high",
      score: receiverScore,
    });
  }

  if (hasSuspiciousReceiverName) {
    riskFactors.push({
      key: "suspicious_receiver",
      title: "Suspicious Receiver",
      description:
        "The receiver details contain words commonly used in impersonation or reward scams.",
      level: "high",
      score: receiverScore,
    });
  }

  if (amountRatio >= 1.5 && previousAmounts.length > 0) {
    riskFactors.push({
      key: "high_amount",
      title: "High Amount",
      description: `This amount is ${amountRatio.toFixed(
        1
      )}x higher than your recent average.`,
      level: amountRatio >= 3 ? "high" : "medium",
      score: amountScore,
    });
  }

  if (isLateNight) {
    riskFactors.push({
      key: "unusual_time",
      title: "Unusual Time",
      description: "This payment is being analyzed during late-night hours.",
      level: "medium",
      score: timeScore,
    });
  }

  if (transactionsDuringLastHour >= 3) {
    riskFactors.push({
      key: "high_frequency",
      title: "High Transaction Frequency",
      description: `${transactionsDuringLastHour} transactions were found during the last hour.`,
      level: "medium",
      score: timeScore,
    });
  }

  // ==========================================
  // 5. RETURN FACTUAL RESULT
  // ==========================================

  return {
    scores: {
      receiver: receiverScore,
      amount: clamp(amountScore),
      timeAndFrequency: timeScore,
      deviceAndLocation: null,
    },

    facts: {
      isNewPayee,
      hasSuspiciousReceiverName,
      previousPaymentsToReceiver:
        previousPaymentsToReceiver.length,
      averageAmount: Number(averageAmount.toFixed(2)),
      amountRatio: Number(amountRatio.toFixed(2)),
      isLateNight,
      transactionsDuringLastHour,
      historySize: history.length,
    },

    riskFactors,

    historicalComparison: {
      usualAverageAmount: Number(averageAmount.toFixed(2)),
      currentAmount: numericAmount,
      amountRatio: Number(amountRatio.toFixed(2)),
      previousPaymentsToReceiver:
        previousPaymentsToReceiver.length,
      recentTransactionsChecked: history.length,
    },
  };
}

module.exports = {
  calculateFactualRisk,
};