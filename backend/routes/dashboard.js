const crypto = require("crypto");
const express = require("express");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const notifications = [
  {
    id: 1,
    title: "Suspicious collect request blocked",
    message: "A ₹4,999 request from refund-help@upi was paused.",
    time: "10 minutes ago",
    unread: true,
  },
  {
    id: 2,
    title: "New receiver reviewed",
    message: "Your payment to Aarav Mehta was marked safe.",
    time: "2 hours ago",
    unread: true,
  },
];

const transactions = [
  { id: 1, name: "Aarav Mehta", upiId: "aarav.mehta@axis", amount: 1200, time: "Today, 11:42 AM", status: "Safe", icon: "user" },
  { id: 2, name: "Unknown Receiver", upiId: "xyz123@upi", amount: 25000, time: "Yesterday, 6:18 PM", status: "Blocked", icon: "user-slash" },
  { id: 3, name: "FreshMart Online", upiId: "freshmart@okicici", amount: 2840, time: "Yesterday, 1:05 PM", status: "Review", icon: "cart-shopping" },
  { id: 4, name: "Metro Recharge", upiId: "dmrc@paytm", amount: 500, time: "26 Aug, 8:20 AM", status: "Safe", icon: "train-subway" },
  { id: 5, name: "Prize Claims Desk", upiId: "claim-prize@upi", amount: 9999, time: "25 Aug, 4:44 PM", status: "Blocked", icon: "triangle-exclamation" },
];

const timeline = [
  { id: 1, type: "danger", icon: "message", title: "Suspicious message detected", time: "09:14 AM", description: "Fake refund claim with an urgent payment link.", status: "High risk" },
  { id: 2, type: "danger", icon: "qrcode", title: "Fake collect QR identified", time: "09:19 AM", description: "The QR could pull money from your account.", status: "High risk" },
  { id: 3, type: "success", icon: "shield-halved", title: "Payment paused", time: "09:28 AM", description: "UPI Guardian kept the user in control.", status: "Protected" },
];

const paymentRequests = [
  { id: 101, sender: "Rohit Verma", upiId: "rohit.v@okaxis", amount: 750, reason: "Dinner split", status: "Pending", risk: "Low" },
  { id: 102, sender: "Refund Support", upiId: "instant-refund@upi", amount: 4999, reason: "Refund verification", status: "Pending", risk: "High" },
  { id: 103, sender: "Neha Kapoor", upiId: "neha.k@ibl", amount: 420, reason: "Cab split", status: "Pending", risk: "Low" },
];

function analyzeMessage(message) {
  const checks = [
    { pattern: /urgent|immediately|within\s+\d+\s*(minutes?|mins?)/i, label: "Creates urgency or pressure", weight: 22 },
    { pattern: /otp|upi\s*pin|cvv|password/i, label: "Asks for private banking credentials", weight: 35 },
    { pattern: /refund|prize|lottery|cashback|reward/i, label: "Uses a reward or refund lure", weight: 20 },
    { pattern: /https?:\/\/|www\.|bit\.ly|tinyurl/i, label: "Contains an external link", weight: 18 },
    { pattern: /screen\s*share|anydesk|teamviewer|remote\s*access/i, label: "Requests remote access", weight: 40 },
    { pattern: /account.*block|kyc.*expire|electricity.*disconnect/i, label: "Threatens account or service suspension", weight: 28 },
  ];

  const signals = checks.filter((check) => check.pattern.test(message));
  const score = Math.min(100, signals.reduce((total, item) => total + item.weight, 5));
  const risk = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";

  return {
    risk,
    score,
    signals: signals.map((item) => item.label),
    advice: risk === "High"
      ? "Do not click links, share credentials or make the requested payment. Verify through the organisation's official number."
      : risk === "Medium"
        ? "Pause and independently verify the sender before taking action."
        : "No strong scam pattern was detected, but always verify the receiver before paying.",
  };
}

router.use(requireAuth);

router.get("/summary", (req, res) => {
  const reviewed = transactions.length + 19;
  const prevented = transactions
    .filter((item) => item.status === "Blocked")
    .reduce((total, item) => total + item.amount, 0);

  return res.json({
    protectionActive: true,
    stats: {
      safetyScore: 86,
      paymentsReviewed: reviewed,
      riskPrevented: prevented,
      paymentsStopped: transactions.filter((item) => item.status === "Blocked").length,
    },
    notifications,
    transactions,
    timeline,
    paymentRequests,
  });
});

router.post("/analyze-message", (req, res) => {
  const message = req.body?.message?.trim();

  if (!message || message.length < 10) {
    return res.status(400).json({ message: "Enter at least 10 characters to analyze." });
  }

  return res.json({ analysis: analyzeMessage(message) });
});

router.post("/check-upi", (req, res) => {
  const upiId = req.body?.upiId?.trim().toLowerCase();

  if (!upiId || !/^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(upiId)) {
    return res.status(400).json({ message: "Enter a valid UPI ID, such as name@bank." });
  }

  const suspicious = /(refund|prize|reward|support|helpdesk|claim|kyc)/i.test(upiId);
  return res.json({
    result: {
      upiId,
      risk: suspicious ? "High" : "Low",
      explanation: suspicious
        ? "This UPI ID uses words commonly seen in impersonation and reward scams. Verify it independently before paying."
        : "The format looks valid and no obvious naming risk was found. This does not guarantee the receiver's identity.",
    },
  });
});

router.post("/payment-requests/:requestId/action", (req, res) => {
  const request = paymentRequests.find((item) => item.id === Number(req.params.requestId));
  const action = req.body?.action;

  if (!request) return res.status(404).json({ message: "Payment request not found." });
  if (!["accept", "decline"].includes(action)) {
    return res.status(400).json({ message: "Choose accept or decline." });
  }
  if (action === "accept" && request.risk === "High") {
    return res.status(409).json({
      message: "High-risk requests cannot be accepted until the sender is verified.",
    });
  }

  request.status = action === "accept" ? "Accepted" : "Declined";
  return res.json({ message: `Request ${request.status.toLowerCase()}.`, request });
});

router.post("/recovery", (req, res) => {
  const transactionReference = req.body?.transactionReference?.trim();

  if (!transactionReference || transactionReference.length < 6) {
    return res.status(400).json({ message: "Enter a valid transaction reference." });
  }

  const ticketId = `UG-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  return res.status(201).json({
    ticketId,
    message: "Recovery checklist created.",
    steps: [
      "Call your bank immediately and request that the transaction be flagged.",
      "Report the incident on 1930 or cybercrime.gov.in.",
      "Keep screenshots, messages, UPI IDs and transaction references as evidence.",
    ],
  });
});

module.exports = router;
