const {
  calculateFactualRisk,
} = require("./services/riskEngine");

const {
  analyzePaymentContext,
} = require("./services/geminiRisk");

async function runTest() {
  try {
    const transactionHistory = [
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

    console.log("Calculating factual risk...");

    const factualRisk = calculateFactualRisk({
      receiverName: "Refund Support",
      receiverUpiId: "refund-help@upi",
      amount: 5000,
      analysisTime: new Date(),
      transactionHistory,
    });

    console.log("Sending payment context to Gemini...");

    const geminiRisk = await analyzePaymentContext({
      receiverName: "Refund Support",
      amount: 5000,

      paymentNote:
        "Urgent KYC verification payment required to receive your refund immediately.",

      factualRisk,
    });

    console.log("\nGemini risk-analysis result:\n");

    console.dir(geminiRisk, {
      depth: null,
      colors: true,
    });

    console.log("\nValidation checks:");

    console.log(
      Number.isInteger(geminiRisk.contextScore)
        ? "✅ Context score received"
        : "❌ Context score is invalid"
    );

    console.log(
      ["safe", "medium", "high"].includes(
        geminiRisk.contextLevel
      )
        ? "✅ Valid context level received"
        : "❌ Context level is invalid"
    );

    console.log(
      geminiRisk.explanation
        ? "✅ Explanation received"
        : "❌ Explanation is missing"
    );

    console.log(
      Array.isArray(geminiRisk.recommendations) &&
        geminiRisk.recommendations.length > 0
        ? "✅ Recommendations received"
        : "❌ Recommendations are missing"
    );

    console.log("\n✅ Gemini risk-service test completed.");
  } catch (error) {
    console.error("\n❌ Gemini risk-service test failed.");
    console.error(error.message);

    if (error.stack) {
      console.error("\nTechnical details:");
      console.error(error.stack);
    }
  }
}

runTest();