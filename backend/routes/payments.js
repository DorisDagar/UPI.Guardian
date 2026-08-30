const crypto = require("crypto");
const express = require("express");

const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);


// =====================================================
// CREATE A UNIQUE TRANSACTION REFERENCE
// =====================================================

function createTransactionReference() {
  const randomPart = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `TXN${randomPart}`;
}


// =====================================================
// VALIDATE UPI ID
// =====================================================

function isValidUpiId(upiId) {
  return /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(
    upiId
  );
}


// =====================================================
// VALIDATE DIRECT-PAYMENT DETAILS
// =====================================================

function validatePaymentDetails(body = {}) {
  const receiverName =
    String(body.receiverName || "").trim();

  const receiverUpiId =
    String(body.receiverUpiId || "")
      .trim()
      .toLowerCase();

  const amount = Number(body.amount);

  const paymentNote =
    String(body.paymentNote || "").trim();

  if (
    !receiverName ||
    receiverName.length < 2
  ) {
    return {
      error: "Enter a valid receiver name.",
    };
  }

  if (receiverName.length > 150) {
    return {
      error:
        "Receiver name must be 150 characters or fewer.",
    };
  }

  if (
    !receiverUpiId ||
    !isValidUpiId(receiverUpiId)
  ) {
    return {
      error:
        "Enter a valid UPI ID, such as name@bank.",
    };
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return {
      error: "Enter a valid payment amount.",
    };
  }

  if (amount > 10000000) {
    return {
      error:
        "Payment amount is above the supported limit.",
    };
  }

  if (paymentNote.length > 500) {
    return {
      error:
        "Payment note must be 500 characters or fewer.",
    };
  }

  return {
    payment: {
      receiverName,
      receiverUpiId,
      amount,
      paymentNote,
    },
  };
}


// =====================================================
// INSERT A TRANSACTION INTO SUPABASE
// =====================================================

async function insertTransaction({
  userId,
  transactionReference,
  receiverName,
  receiverUpiId,
  amount,
  paymentNote,
  riskLevel,
  riskReason,
  transactionStatus,
  analysisId,
  paymentPath,
  verificationStatus,
  verifiedAt,
}) {
  const result = await pool.query(
    `
      INSERT INTO transactions (
        user_id,
        transaction_reference,
        receiver_name,
        receiver_upi_id,
        amount,
        payment_method,
        bank_name,
        transaction_time,
        risk_level,
        risk_reason,
        receiver_category,
        transaction_status,
        payment_note,
        analysis_id,
        payment_path,
        verification_status,
        verified_at
      )
      VALUES (
        $1, $2, $3, $4, $5,
        'UPI',
        NULL,
        CURRENT_TIMESTAMP,
        $6, $7,
        'person',
        $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT DO NOTHING
      RETURNING
        id,
        transaction_reference,
        receiver_name,
        receiver_upi_id,
        amount,
        payment_method,
        transaction_time,
        risk_level,
        risk_reason,
        transaction_status,
        payment_note,
        analysis_id,
        payment_path,
        verification_status,
        verified_at
    `,
    [
      userId,
      transactionReference,
      receiverName,
      receiverUpiId,
      amount,
      riskLevel,
      riskReason,
      transactionStatus,
      paymentNote || null,
      analysisId,
      paymentPath,
      verificationStatus,
      verifiedAt,
    ]
  );

  return result.rows[0] || null;
}


// =====================================================
// FORMAT TRANSACTION FOR THE FRONTEND
// =====================================================

function formatTransaction(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,

    transactionReference:
      row.transaction_reference,

    receiverName:
      row.receiver_name,

    receiverUpiId:
      row.receiver_upi_id,

    amount:
      Number(row.amount),

    paymentMethod:
      row.payment_method,

    transactionTime:
      row.transaction_time,

    riskLevel:
      row.risk_level,

    riskReason:
      row.risk_reason,

    transactionStatus:
      row.transaction_status,

    paymentNote:
      row.payment_note || "",

    analysisId:
      row.analysis_id,

    paymentPath:
      row.payment_path,

    verificationStatus:
      row.verification_status,

    verifiedAt:
      row.verified_at,
  };
}


// =====================================================
// POST /api/payments/direct
// MAKE A PAYMENT WITHOUT RISK ANALYSIS
// =====================================================

router.post("/direct", async (req, res) => {
  try {
    const validation =
      validatePaymentDetails(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const {
      receiverName,
      receiverUpiId,
      amount,
      paymentNote,
    } = validation.payment;

    const userId = req.user.userId;

    const transactionReference =
      createTransactionReference();

    const transaction =
      await insertTransaction({
        userId,
        transactionReference,
        receiverName,
        receiverUpiId,
        amount,
        paymentNote,

        riskLevel:
          "not_analyzed",

        riskReason:
          "The user completed this payment without running risk analysis.",

        transactionStatus:
          "completed",

        analysisId:
          null,

        paymentPath:
          "direct",

        verificationStatus:
          "not_requested",

        verifiedAt:
          null,
      });

    if (!transaction) {
      return res.status(409).json({
        message:
          "This payment could not be created. Please try again.",
      });
    }

    return res.status(201).json({
      message:
        "Payment completed successfully.",

      transaction:
        formatTransaction(transaction),
    });
  } catch (error) {
    console.error(
      "Direct payment failed:",
      error.message
    );

    return res.status(500).json({
      message:
        "Unable to complete the payment right now.",
    });
  }
});


// =====================================================
// POST /api/payments/analysis/:analysisId/decision
//
// decision can be:
// verify
// proceed
// cancel
// =====================================================

router.post(
  "/analysis/:analysisId/decision",
  async (req, res) => {
    try {
      const analysisId =
        String(req.params.analysisId || "").trim();

      const userId =
        req.user.userId;

      const decision =
        String(req.body?.decision || "")
          .trim()
          .toLowerCase();

      const receiverVerified =
        req.body?.receiverVerified === true;

      const isValidAnalysisId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    analysisId
  );

if (!isValidAnalysisId) {
  return res.status(400).json({
    message:
      "Enter a valid analysis ID.",
  });
}

      if (
        ![
          "verify",
          "proceed",
          "cancel",
        ].includes(decision)
      ) {
        return res.status(400).json({
          message:
            "Choose verify, proceed or cancel.",
        });
      }

      // Load only the logged-in user's analysis.
      const analysisResult =
        await pool.query(
          `
            SELECT
              id,
              transaction_reference,
              receiver_name,
              receiver_upi_id,
              amount,
              payment_note,
              risk_level,
              summary
            FROM risk_analyses
            WHERE id = $1
              AND user_id = $2
            LIMIT 1
          `,
          [
            analysisId,
            userId,
          ]
        );

      if (analysisResult.rows.length === 0) {
        return res.status(404).json({
          message:
            "Risk analysis was not found.",
        });
      }

      const analysis =
        analysisResult.rows[0];


      // =================================================
      // VERIFY DOES NOT MAKE THE PAYMENT
      // =================================================

      if (decision === "verify") {
        return res.json({
          message:
            "Verify the receiver before deciding whether to proceed.",

          verification: {
            analysisId:
              analysis.id,

            receiverName:
              analysis.receiver_name,

            receiverUpiId:
              analysis.receiver_upi_id,

            amount:
              Number(analysis.amount),

            riskLevel:
              analysis.risk_level,

            warning:
              "UPI Guardian cannot officially verify the receiver's identity. Confirm the details using an independent trusted source.",

            checks: [
              "Contact the receiver using a phone number you already trust.",
              "Ask the receiver to confirm their exact UPI ID.",
              "Confirm the payment purpose and amount.",
              "Never share your OTP, UPI PIN, CVV or password.",
            ],
          },
        });
      }


      // =================================================
      // PROCEED OR CANCEL
      // =================================================

      const transactionStatus =
        decision === "cancel"
          ? "blocked"
          : "completed";

      const verificationStatus =
        receiverVerified
          ? "user_verified"
          : "not_requested";

      const verifiedAt =
        receiverVerified
          ? new Date()
          : null;

      const transaction =
        await insertTransaction({
          userId,

          transactionReference:
            analysis.transaction_reference,

          receiverName:
            analysis.receiver_name,

          receiverUpiId:
            analysis.receiver_upi_id,

          amount:
            Number(analysis.amount),

          paymentNote:
            analysis.payment_note || "",

          riskLevel:
            analysis.risk_level,

          riskReason:
            analysis.summary,

          transactionStatus,

          analysisId:
            analysis.id,

          paymentPath:
            "analyzed",

          verificationStatus,

          verifiedAt,
        });

      if (!transaction) {
        return res.status(409).json({
          message:
            "A decision has already been recorded for this analysis.",
        });
      }

      if (decision === "cancel") {
        return res.status(201).json({
          message:
            "Payment cancelled successfully. No payment was made.",

          transaction:
            formatTransaction(transaction),
        });
      }

      return res.status(201).json({
        message:
          receiverVerified
            ? "Receiver verification recorded and payment completed successfully."
            : "Payment completed successfully.",

        transaction:
          formatTransaction(transaction),
      });
    } catch (error) {
      console.error(
        "Payment decision failed:",
        error.message
      );

      return res.status(500).json({
        message:
          "Unable to process the payment decision.",
      });
    }
  }
);


module.exports = router;