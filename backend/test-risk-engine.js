const {
  calculateFactualRisk,
} = require("./services/riskEngine");

const sampleTransactionHistory = [
  {
    receiver_upi_id: "aarav@okaxis",
    amount: "1000.00",
    transaction_time: "2026-08-28T10:00:00+05:30",
  },
  {
    receiver_upi_id: "freshmart@okicici",
    amount: "1500.00",
    transaction_time: "2026-08-27T13:00:00+05:30",
  },
  {
    receiver_upi_id: "metro@paytm",
    amount: "500.00",
    transaction_time: "2026-08-26T09:00:00+05:30",
  },
];

const result = calculateFactualRisk({
  receiverName: "Refund Support",
  receiverUpiId: "refund-help@upi",
  amount: 5000,
  analysisTime: "2026-08-29T14:00:00+05:30",
  transactionHistory: sampleTransactionHistory,
});

console.log("\nRisk-engine test result:\n");

console.dir(result, {
  depth: null,
  colors: true,
});

console.log("\nExpected checks:");

console.log(
  result.facts.isNewPayee === true
    ? "✅ New payee detected"
    : "❌ New payee was not detected"
);

console.log(
  result.scores.amount === 90
    ? "✅ Unusually high amount detected"
    : "❌ Amount score was unexpected"
);

console.log(
  result.facts.hasSuspiciousReceiverName === true
    ? "✅ Suspicious receiver wording detected"
    : "❌ Suspicious receiver wording was not detected"
);

console.log("\n✅ Risk-engine test completed.");