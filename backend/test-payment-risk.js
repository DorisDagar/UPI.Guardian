const {
  createPaymentRiskAnalysis,
} = require("./services/paymentRiskService");

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

    console.log("Creating complete payment-risk analysis...");

    const analysis = await createPaymentRiskAnalysis({
      receiverName: "Refund Support",
      receiverUpiId: "refund-help@upi",
      amount: 5000,

      paymentNote:
        "Urgent KYC verification payment required to receive your refund immediately.",

      transactionHistory,
    });

    console.log("\nComplete analysis:\n");

    console.dir(analysis, {
      depth: null,
      colors: true,
    });

    console.log("\nValidation checks:");

    console.log(
      analysis.transaction.reference.startsWith("TXN")
        ? "✅ Transaction reference generated"
        : "❌ Transaction reference is missing"
    );

    console.log(
      Number.isInteger(analysis.overallScore) &&
        analysis.overallScore >= 0 &&
        analysis.overallScore <= 100
        ? `✅ Overall score received: ${analysis.overallScore}/100`
        : "❌ Overall score is invalid"
    );

    console.log(
      ["safe", "medium", "high"].includes(
        analysis.riskLevel
      )
        ? `✅ Risk level received: ${analysis.riskLevel}`
        : "❌ Risk level is invalid"
    );

    console.log(
      Array.isArray(analysis.riskFactors) &&
        analysis.riskFactors.length > 0
        ? `✅ ${analysis.riskFactors.length} risk factors received`
        : "❌ No risk factors received"
    );

    console.log(
      Array.isArray(analysis.recommendations) &&
        analysis.recommendations.length > 0
        ? `✅ ${analysis.recommendations.length} recommendations received`
        : "❌ No recommendations received"
    );

    console.log(
      analysis.ai.used
        ? `✅ Gemini used: ${analysis.ai.model}`
        : "⚠️ Local fallback used because Gemini was unavailable"
    );

    console.log("\n✅ Complete risk-engine test finished.");
  } catch (error) {
    console.error("\n❌ Complete risk-engine test failed.");
    console.error(error.message);

    if (error.stack) {
      console.error("\nTechnical details:");
      console.error(error.stack);
    }
  }
}

runTest();