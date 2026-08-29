const {
  analyzeMessage,
} = require("./services/messageRiskEngine");

const testMessage = `
URGENT! Your bank account will be blocked today.
Complete KYC immediately by clicking
https://example.com/verify
and share your OTP to receive your cashback.
`;

const result = analyzeMessage(testMessage);

console.log("\nMessage Risk Engine Test\n");

console.dir(result, {
  depth: null,
  colors: true,
});

console.log("\nExpected checks:");

console.log(
  result.detected.urls.length > 0
    ? "✅ Link detected"
    : "❌ Link was not detected"
);

console.log(
  result.riskFactors.some(
    (factor) => factor.key === "credential_request"
  )
    ? "✅ OTP/PIN request detected"
    : "❌ OTP/PIN request was not detected"
);

console.log(
  result.riskFactors.some(
    (factor) => factor.key === "account_threat"
  )
    ? "✅ KYC/account threat detected"
    : "❌ KYC/account threat was not detected"
);

console.log(
  result.riskFactors.some(
    (factor) => factor.key === "urgency"
  )
    ? "✅ Urgency detected"
    : "❌ Urgency was not detected"
);

console.log(
  result.score >= 50
    ? "✅ High-risk message detected"
    : "❌ Risk score was unexpectedly low"
);

console.log("\n✅ Message risk-engine test completed.");