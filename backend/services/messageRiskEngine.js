function clamp(number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Math.round(number)));
}

function analyzeMessage(message) {
  const text = String(message || "").trim();

  if (!text) {
    throw new Error("Message is required.");
  }

  let score = 0;
  const riskFactors = [];
  const detected = {
    urls: [],
    upiIds: [],
    phoneNumbers: [],
  };

  // ==========================================
  // 1. SUSPICIOUS LINKS
  // ==========================================

  const urlRegex =
    /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

  detected.urls = [...new Set(text.match(urlRegex) || [])];

  if (detected.urls.length > 0) {
    score += 30;

    riskFactors.push({
      key: "suspicious_link",
      title: "Suspicious Link",
      description:
        "The message contains a clickable web link. Fraudsters commonly use links to imitate banks, UPI services or government websites.",
      level: "high",
      score: 30,
    });
  }

  // ==========================================
  // 2. UPI ID
  // ==========================================

  const upiRegex =
    /\b[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}\b/g;

  detected.upiIds = [
    ...new Set(text.match(upiRegex) || []),
  ];

  if (detected.upiIds.length > 0) {
    score += 15;

    riskFactors.push({
      key: "upi_id",
      title: "UPI ID Detected",
      description:
        "The message contains a UPI ID that may be asking the user to make a payment.",
      level: "medium",
      score: 15,
    });
  }

  // ==========================================
  // 3. PHONE NUMBER
  // ==========================================

  const phoneRegex =
    /(?:\+91[\s-]?)?[6-9]\d{9}\b/g;

  detected.phoneNumbers = [
    ...new Set(text.match(phoneRegex) || []),
  ];

  if (detected.phoneNumbers.length > 0) {
    score += 10;

    riskFactors.push({
      key: "phone_number",
      title: "Phone Number Detected",
      description:
        "The message contains a phone number. Verify unexpected callers independently before sharing information or making payments.",
      level: "low",
      score: 10,
    });
  }

  // ==========================================
  // 4. OTP / UPI PIN
  // ==========================================

  const otpPattern =
    /\b(otp|one[-\s]?time password|verification code|upi pin|pin)\b/i;

  const sharingPattern =
    /\b(share|send|provide|tell|enter|submit|confirm)\b/i;

  if (
    otpPattern.test(text) &&
    sharingPattern.test(text)
  ) {
    score += 40;

    riskFactors.push({
      key: "credential_request",
      title: "OTP / PIN Request",
      description:
        "The message appears to request a sensitive authentication code or UPI PIN.",
      level: "critical",
      score: 40,
    });
  }

  // ==========================================
  // 5. URGENCY / THREAT
  // ==========================================

  const urgencyPattern =
    /\b(urgent|immediately|hurry|act now|last warning|within \d+ (minutes?|hours?)|today only|expires? today)\b/i;

  if (urgencyPattern.test(text)) {
    score += 20;

    riskFactors.push({
      key: "urgency",
      title: "Urgent or Threatening Language",
      description:
        "The message pressures you to act quickly instead of giving you time to independently verify the request.",
      level: "high",
      score: 20,
    });
  }

  // ==========================================
  // 6. ACCOUNT BLOCK / KYC
  // ==========================================

  const accountThreatPattern =
    /\b(account|bank account|upi)\b.{0,50}\b(blocked|suspended|frozen|deactivated|closed)\b/i;

  const kycPattern =
    /\b(kyc|pan|verification|verify your account|reactivate)\b/i;

  if (
    accountThreatPattern.test(text) ||
    kycPattern.test(text)
  ) {
    score += 25;

    riskFactors.push({
      key: "account_threat",
      title: "KYC / Account Threat",
      description:
        "The message uses account verification, KYC or suspension language that is commonly seen in phishing scams.",
      level: "high",
      score: 25,
    });
  }

  // ==========================================
  // 7. REWARD / CASHBACK / PRIZE
  // ==========================================

  const rewardPattern =
    /\b(cashback|reward|prize|lottery|winner|won|gift|bonus|cash prize)\b/i;

  if (rewardPattern.test(text)) {
    score += 20;

    riskFactors.push({
      key: "reward_bait",
      title: "Reward / Prize Bait",
      description:
        "The message uses a reward, cashback or prize to encourage the recipient to take an action.",
      level: "medium",
      score: 20,
    });
  }

  // ==========================================
  // 8. PAYMENT REQUEST
  // ==========================================

  const paymentPattern =
    /\b(send money|make payment|pay now|transfer money|transfer ₹|pay ₹|collect request|payment request)\b/i;

  if (paymentPattern.test(text)) {
    score += 25;

    riskFactors.push({
      key: "payment_request",
      title: "Payment Request",
      description:
        "The message asks the recipient to make or authorize a payment.",
      level: "high",
      score: 25,
    });
  }

  // ==========================================
  // FINAL SCORE
  // ==========================================

  score = clamp(score);

  let level = "Low";

  if (score >= 75) {
    level = "Critical";
  } else if (score >= 50) {
    level = "High";
  } else if (score >= 25) {
    level = "Medium";
  }

  return {
    score,
    level,

    isPotentialScam: score >= 50,

    riskFactors,

    detected,

    messageLength: text.length,
  };
}

module.exports = {
  analyzeMessage,
};