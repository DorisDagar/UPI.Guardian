
const crypto = require("crypto");
const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();


// ======================================================
// DASHBOARD NOTIFICATIONS
// ======================================================

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


// ======================================================
// DASHBOARD STATIC TIMELINE
// ======================================================
//
// This is ONLY the small timeline shown on the Dashboard.
//
// It is NOT the full Global Scam Timeline.
//
// Full Global Scam Timeline:
// GET /api/scam-timeline
//
// Recovery timeline remains:
// scamtimeline-recovery.*
//
// ======================================================

const timeline = [
  {
    id: 1,
    type: "danger",
    icon: "message",
    title: "Suspicious message detected",
    time: "09:14 AM",
    description:
      "Fake refund claim with an urgent payment link.",
    status: "High risk",
  },
  {
    id: 2,
    type: "danger",
    icon: "qrcode",
    title: "Fake collect QR identified",
    time: "09:19 AM",
    description:
      "The QR could pull money from your account.",
    status: "High risk",
  },
  {
    id: 3,
    type: "success",
    icon: "shield-halved",
    title: "Payment paused",
    time: "09:28 AM",
    description:
      "UPI Guardian kept the user in control.",
    status: "Protected",
  },
];


// ======================================================
// PAYMENT REQUESTS
// ======================================================
//
// These are currently the existing dashboard demo
// payment requests. They are kept unchanged.
//
// ======================================================

const paymentRequests = [
  {
    id: 101,
    sender: "Rohit Verma",
    upiId: "rohit.v@okaxis",
    amount: 750,
    reason: "Dinner split",
    status: "Pending",
    risk: "Low",
  },
  {
    id: 102,
    sender: "Refund Support",
    upiId: "instant-refund@upi",
    amount: 4999,
    reason: "Refund verification",
    status: "Pending",
    risk: "High",
  },
  {
    id: 103,
    sender: "Neha Kapoor",
    upiId: "neha.k@ibl",
    amount: 420,
    reason: "Cab split",
    status: "Pending",
    risk: "Low",
  },
];


// ======================================================
// MESSAGE ANALYSIS HELPER
// ======================================================

function analyzeMessage(message) {
  const checks = [
    {
      pattern:
        /urgent|immediately|within\s+\d+\s*(minutes?|mins?)/i,
      label: "Creates urgency or pressure",
      weight: 22,
    },

    {
      pattern:
        /otp|upi\s*pin|cvv|password/i,
      label:
        "Asks for private banking credentials",
      weight: 35,
    },

    {
      pattern:
        /refund|prize|lottery|cashback|reward/i,
      label:
        "Uses a reward or refund lure",
      weight: 20,
    },

    {
      pattern:
        /https?:\/\/|www\.|bit\.ly|tinyurl/i,
      label:
        "Contains an external link",
      weight: 18,
    },

    {
      pattern:
        /screen\s*share|anydesk|teamviewer|remote\s*access/i,
      label:
        "Requests remote access",
      weight: 40,
    },

    {
      pattern:
        /account.*block|kyc.*expire|electricity.*disconnect/i,
      label:
        "Threatens account or service suspension",
      weight: 28,
    },
  ];

  const signals =
    checks.filter((check) =>
      check.pattern.test(message)
    );

  const score =
    Math.min(
      100,
      signals.reduce(
        (total, item) =>
          total + item.weight,
        5
      )
    );

  const risk =
    score >= 60
      ? "High"
      : score >= 30
        ? "Medium"
        : "Low";

  return {
    risk,
    score,
    signals:
      signals.map(
        (item) => item.label
      ),
    advice:
      risk === "High"
        ? "Do not click links, share credentials or make the requested payment. Verify through the organisation's official number."
        : risk === "Medium"
          ? "Pause and independently verify the sender before taking action."
          : "No strong scam pattern was detected, but always verify the receiver before paying.",
  };
}


// ======================================================
// AUTHENTICATION
// ======================================================
//
// Every dashboard route below requires the logged-in
// user's JWT.
//
// req.user.userId identifies the current user.
//
// ======================================================

router.use(requireAuth);


// ======================================================
// DASHBOARD SUMMARY
// GET /api/dashboard/summary
// ======================================================

router.get(
  "/summary",
  async (req, res) => {

    try {

      const userId =
        req.user.userId;


      // ==================================================
      // LOAD USER TRANSACTIONS + STATISTICS
      // ==================================================

      const [
        recentResult,
        statsResult,
      ] = await Promise.all([

        pool.query(
          `
            SELECT
              id,
              receiver_name,
              receiver_upi_id,
              amount,
              transaction_time,
              risk_level,
              receiver_category,
              transaction_status
            FROM transactions
            WHERE user_id = $1
            ORDER BY transaction_time DESC
            LIMIT 50
          `,
          [userId]
        ),

        pool.query(
          `
            SELECT
              COUNT(*)::int AS payments_reviewed,

              COUNT(*) FILTER (
                WHERE transaction_status = 'blocked'
              )::int AS payments_stopped,

              COALESCE(
                SUM(amount) FILTER (
                  WHERE transaction_status = 'blocked'
                ),
                0
              ) AS risk_prevented,

              CASE
                WHEN COUNT(*) = 0 THEN 100

                ELSE ROUND(
                  100.0 *
                  COUNT(*) FILTER (
                    WHERE risk_level = 'safe'
                      AND transaction_status <> 'blocked'
                  )
                  / COUNT(*)
                )::int
              END AS safety_score

            FROM transactions
            WHERE user_id = $1
          `,
          [userId]
        ),
      ]);


      // ==================================================
      // TRANSACTION ICONS
      // ==================================================

      const iconByCategory = {
        merchant: "cart-shopping",
        shopping: "cart-shopping",
        transport: "train-subway",
        bill: "file-invoice-dollar",
        person: "user",
      };


      // ==================================================
      // PREPARE DASHBOARD TRANSACTIONS
      // ==================================================

      const transactions =
        recentResult.rows.map(
          (row) => {

            const isBlocked =
              row.transaction_status ===
              "blocked";


            const status =
              isBlocked
                ? "Blocked"
                : row.risk_level === "safe"
                  ? "Safe"
                  : row.risk_level === "not_analyzed"
                    ? "Not analyzed"
                    : "Review";


            return {

              id:
                row.id,

              name:
                row.receiver_name,

              upiId:
                row.receiver_upi_id ||
                "UPI ID unavailable",

              amount:
                Number(row.amount),

              transactionTime:
                row.transaction_time,

              status,

              icon:
                isBlocked
                  ? "user-slash"
                  : iconByCategory[
                      row.receiver_category
                    ] || "user",
            };
          }
        );


      // ==================================================
      // DASHBOARD STATISTICS
      // ==================================================

      const stats =
        statsResult.rows[0];


      // ==================================================
      // RESPONSE
      // ==================================================

      return res.json({

        protectionActive:
          true,

        stats: {

          safetyScore:
            Number(
              stats.safety_score
            ),

          paymentsReviewed:
            Number(
              stats.payments_reviewed
            ),

          riskPrevented:
            Number(
              stats.risk_prevented
            ),

          paymentsStopped:
            Number(
              stats.payments_stopped
            ),
        },

        notifications,

        transactions,

        timeline,

        paymentRequests,
      });

    } catch (error) {

      console.error(
        "Dashboard summary failed:",
        error.message
      );

      return res.status(500).json({

        message:
          "Unable to load dashboard transactions right now.",
      });
    }
  }
);


// ======================================================
// ANALYZE MESSAGE
// POST /api/dashboard/analyze-message
// ======================================================

router.post(
  "/analyze-message",
  (req, res) => {

    const message =
      req.body?.message?.trim();


    if (
      !message ||
      message.length < 10
    ) {

      return res.status(400).json({

        message:
          "Enter at least 10 characters to analyze.",
      });
    }


    return res.json({

      analysis:
        analyzeMessage(message),
    });
  }
);


// ======================================================
// CHECK UPI
// POST /api/dashboard/check-upi
// ======================================================

router.post(
  "/check-upi",
  (req, res) => {

    const upiId =
      req.body?.upiId
        ?.trim()
        .toLowerCase();


    if (
      !upiId ||
      !/^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(
        upiId
      )
    ) {

      return res.status(400).json({

        message:
          "Enter a valid UPI ID, such as name@bank.",
      });
    }


    const suspicious =
      /(refund|prize|reward|support|helpdesk|claim|kyc)/i.test(
        upiId
      );


    return res.json({

      result: {

        upiId,

        risk:
          suspicious
            ? "High"
            : "Low",

        explanation:

          suspicious

            ? "This UPI ID uses words commonly seen in impersonation and reward scams. Verify it independently before paying."

            : "The format looks valid and no obvious naming risk was found. This does not guarantee the receiver's identity.",
      },
    });
  }
);


// ======================================================
// PAYMENT REQUEST ACTION
// POST /api/dashboard/payment-requests/:requestId/action
// ======================================================

router.post(
  "/payment-requests/:requestId/action",
  (req, res) => {

    const request =
      paymentRequests.find(
        (item) =>
          item.id ===
          Number(
            req.params.requestId
          )
      );


    const action =
      req.body?.action;


    if (!request) {

      return res.status(404).json({

        message:
          "Payment request not found.",
      });
    }


    if (
      !["accept", "decline"].includes(
        action
      )
    ) {

      return res.status(400).json({

        message:
          "Choose accept or decline.",
      });
    }


    if (
      action === "accept" &&
      request.risk === "High"
    ) {

      return res.status(409).json({

        message:
          "High-risk requests cannot be accepted until the sender is verified.",
      });
    }


    request.status =
      action === "accept"
        ? "Accepted"
        : "Declined";


    return res.json({

      message:
        `Request ${request.status.toLowerCase()}.`,

      request,
    });
  }
);


// ======================================================
// RECOVERY
// POST /api/dashboard/recovery
// ======================================================

router.post(
  "/recovery",
  (req, res) => {

    const transactionReference =
      req.body?.transactionReference
        ?.trim();


    if (
      !transactionReference ||
      transactionReference.length < 6
    ) {

      return res.status(400).json({

        message:
          "Enter a valid transaction reference.",
      });
    }


    const ticketId =
      `UG-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;


    return res.status(201).json({

      ticketId,

      message:
        "Recovery checklist created.",

      steps: [

        "Call your bank immediately and request that the transaction be flagged.",

        "Report the incident on 1930 or cybercrime.gov.in.",

        "Keep screenshots, messages, UPI IDs and transaction references as evidence.",
      ],
    });
  }
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
