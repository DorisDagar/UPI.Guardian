function clamp(number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const position =
    (sortedValues.length - 1) * percentileValue;

  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = position - lowerIndex;

  return (
    sortedValues[lowerIndex] * (1 - weight) +
    sortedValues[upperIndex] * weight
  );
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
  // 2. COMPARE AMOUNT WITH THE USER'S USUAL RANGE
  // ==========================================

  const previousAmounts = history
    .map((transaction) => Number(transaction.amount))
    .filter((value) => Number.isFinite(value) && value > 0);

  const sortedAmounts = [...previousAmounts].sort(
    (first, second) => first - second
  );

  // Five or more payments: use the central 80% so one
  // unusually small or large old transaction does not
  // distort the user's normal range.
  // Fewer than five: use the observed minimum and maximum.
  const usualMinimumAmount =
    sortedAmounts.length >= 5
      ? percentile(sortedAmounts, 0.1)
      : sortedAmounts[0] ?? numericAmount;

  const usualMaximumAmount =
    sortedAmounts.length >= 5
      ? percentile(sortedAmounts, 0.9)
      : sortedAmounts[sortedAmounts.length - 1] ??
        numericAmount;

  let amountRangeStatus = "no_history";

  if (previousAmounts.length > 0) {
    if (numericAmount < usualMinimumAmount) {
      amountRangeStatus = "below";
    } else if (numericAmount > usualMaximumAmount) {
      amountRangeStatus = "above";
    } else {
      amountRangeStatus = "within";
    }
  }

  let amountDeviationRatio = 1;
  let amountDeviationPercentage = 0;

  if (
    amountRangeStatus === "above" &&
    usualMaximumAmount > 0
  ) {
    amountDeviationRatio =
      numericAmount / usualMaximumAmount;

    amountDeviationPercentage =
      ((numericAmount - usualMaximumAmount) /
        usualMaximumAmount) *
      100;
  } else if (
    amountRangeStatus === "below" &&
    numericAmount > 0
  ) {
    amountDeviationRatio =
      usualMinimumAmount / numericAmount;

    amountDeviationPercentage =
      ((usualMinimumAmount - numericAmount) /
        usualMinimumAmount) *
      100;
  }

  let amountScore = 15;

  if (previousAmounts.length === 0) {
    amountScore = 25;
  } else if (amountRangeStatus === "within") {
    amountScore = 15;
  } else if (amountRangeStatus === "above") {
    if (amountDeviationRatio >= 3) {
      amountScore = 90;
    } else if (amountDeviationRatio >= 2) {
      amountScore = 75;
    } else if (amountDeviationRatio >= 1.5) {
      amountScore = 60;
    } else if (amountDeviationRatio >= 1.2) {
      amountScore = 45;
    } else {
      amountScore = 30;
    }
  } else if (amountRangeStatus === "below") {
    if (amountDeviationRatio >= 3) {
      amountScore = 55;
    } else if (amountDeviationRatio >= 2) {
      amountScore = 45;
    } else if (amountDeviationRatio >= 1.5) {
      amountScore = 35;
    } else {
      amountScore = 25;
    }
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

  if (
    amountRangeStatus === "above" ||
    amountRangeStatus === "below"
  ) {
    const direction =
      amountRangeStatus === "above"
        ? "above"
        : "below";

    riskFactors.push({
      key: "amount_outside_usual_range",
      title: "Outside Usual Payment Range",
      description:
        `This payment is ${direction} your usual range of ` +
        `₹${usualMinimumAmount.toFixed(2)} to ` +
        `₹${usualMaximumAmount.toFixed(2)} ` +
        `(${amountDeviationPercentage.toFixed(0)}% ${direction} the range).`,
      level:
        amountRangeStatus === "above" &&
        amountDeviationRatio >= 2
          ? "high"
          : "medium",
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
      usualMinimumAmount: Number(
        usualMinimumAmount.toFixed(2)
      ),
      usualMaximumAmount: Number(
        usualMaximumAmount.toFixed(2)
      ),
      amountRangeStatus,
      amountDeviationRatio: Number(
        amountDeviationRatio.toFixed(2)
      ),
      amountDeviationPercentage: Number(
        amountDeviationPercentage.toFixed(1)
      ),
      amountRangeMethod:
        sortedAmounts.length >= 5
          ? "central_80_percent"
          : sortedAmounts.length > 0
            ? "observed_minimum_maximum"
            : "no_history",
      isLateNight,
      transactionsDuringLastHour,
      historySize: history.length,
    },

    riskFactors,

    historicalComparison: {
      currentAmount: numericAmount,
      usualMinimumAmount: Number(
        usualMinimumAmount.toFixed(2)
      ),
      usualMaximumAmount: Number(
        usualMaximumAmount.toFixed(2)
      ),
      amountRangeStatus,
      amountDeviationRatio: Number(
        amountDeviationRatio.toFixed(2)
      ),
      amountDeviationPercentage: Number(
        amountDeviationPercentage.toFixed(1)
      ),
      previousPaymentsToReceiver:
        previousPaymentsToReceiver.length,
      recentTransactionsChecked: history.length,
    },
  };
}

module.exports = {
  calculateFactualRisk,
};
