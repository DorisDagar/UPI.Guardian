const express = require("express");

const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const {
  createPaymentRiskAnalysis,
} = require("../services/paymentRiskService");

const router = express.Router();

router.use(requireAuth);

// ==========================================
// VALIDATE UPI ID
// ==========================================

function isValidUpiId(upiId) {
  return /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(
    upiId
  );
}

// ==========================================
// POST /api/risk/analyze
// CREATE A NEW PAYMENT-RISK ANALYSIS
// ==========================================

router.post("/analyze", async (req, res) => {
  try {
    const receiverName =
      req.body?.receiverName?.trim();

    const receiverUpiId =
      req.body?.receiverUpiId
        ?.trim()
        .toLowerCase();

    const amount = Number(req.body?.amount);

    const paymentNote =
      req.body?.paymentNote?.trim() || "";

    // Validate receiver name.
    if (!receiverName || receiverName.length < 2) {
      return res.status(400).json({
        message:
          "Enter a valid receiver name.",
      });
    }

    if (receiverName.length > 150) {
      return res.status(400).json({
        message:
          "Receiver name must be 150 characters or fewer.",
      });
    }

    // Validate UPI ID.
    if (
      !receiverUpiId ||
      !isValidUpiId(receiverUpiId)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid UPI ID, such as name@bank.",
      });
    }

    // Validate amount.
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        message:
          "Enter a valid payment amount.",
      });
    }

    if (amount > 10000000) {
      return res.status(400).json({
        message:
          "Payment amount is above the supported limit.",
      });
    }

    // Validate optional payment note.
    if (paymentNote.length > 500) {
      return res.status(400).json({
        message:
          "Payment note must be 500 characters or fewer.",
      });
    }

    // The JWT created during login stores the ID as userId.
    const userId = req.user.userId;

    // Load the logged-in user's last 20 transactions.
    const historyResult = await pool.query(
      `
        SELECT
          receiver_upi_id,
          amount,
          transaction_time
        FROM transactions
        WHERE user_id = $1
          AND transaction_status = 'completed'
        ORDER BY transaction_time DESC
        LIMIT 20
      `,
      [userId]
    );

    // Run the complete hybrid risk engine.
    const analysis =
      await createPaymentRiskAnalysis({
        receiverName,
        receiverUpiId,
        amount,
        paymentNote,
        transactionHistory: historyResult.rows,
      });

    // Save the result in Supabase.
    const insertResult = await pool.query(
      `
        INSERT INTO risk_analyses (
          user_id,
          transaction_reference,
          receiver_name,
          receiver_upi_id,
          amount,
          payment_note,
          analysis_time,
          overall_score,
          risk_level,
          summary,
          risk_breakdown,
          risk_factors,
          recommendations,
          historical_comparison,
          ai_provider,
          ai_model
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11::jsonb, $12::jsonb,
          $13::jsonb, $14::jsonb, $15, $16
        )
        RETURNING id
      `,
      [
        userId,
        analysis.transaction.reference,
        analysis.transaction.receiverName,
        analysis.transaction.receiverUpiId,
        analysis.transaction.amount,
        analysis.transaction.paymentNote || null,
        analysis.transaction.analysisTime,
        analysis.overallScore,
        analysis.riskLevel,
        analysis.summary,
        JSON.stringify(analysis.breakdown),
        JSON.stringify(analysis.riskFactors),
        JSON.stringify(analysis.recommendations),
        JSON.stringify(
          analysis.historicalComparison
        ),
        analysis.ai.provider,
        analysis.ai.model,
      ]
    );

    const analysisId =
      insertResult.rows[0].id;

    return res.status(201).json({
      message:
        "Payment analyzed successfully.",

      analysisId,

      analysis: {
        id: analysisId,
        ...analysis,
      },
    });
  } catch (error) {
    console.error(
      "Payment analysis failed:",
      error.message
    );

    return res.status(500).json({
      message:
        "Unable to analyze the payment right now. Please try again.",
    });
  }
});

// ==========================================
// GET /api/risk/:analysisId
// LOAD A SAVED ANALYSIS
// ==========================================

router.get("/:analysisId", async (req, res) => {
  try {
    const analysisId =
      req.params.analysisId;

    // The JWT created during login stores the ID as userId.
    const userId = req.user.userId;

    const result = await pool.query(
      `
        SELECT
          id,
          transaction_reference,
          receiver_name,
          receiver_upi_id,
          amount,
          payment_note,
          analysis_time,
          overall_score,
          risk_level,
          summary,
          risk_breakdown,
          risk_factors,
          recommendations,
          historical_comparison,
          ai_provider,
          ai_model
        FROM risk_analyses
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [analysisId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "Risk analysis was not found.",
      });
    }

    const row = result.rows[0];

    return res.json({
      analysis: {
        id: row.id,

        transaction: {
          reference:
            row.transaction_reference,

          receiverName:
            row.receiver_name,

          receiverUpiId:
            row.receiver_upi_id,

          amount:
            Number(row.amount),

          paymentNote:
            row.payment_note || "",

          analysisTime:
            row.analysis_time,

          channel:
            "UPI Guardian",
        },

        overallScore:
          Number(row.overall_score),

        riskLevel:
          row.risk_level,

        summary:
          row.summary,

        breakdown:
          row.risk_breakdown || {},

        riskFactors:
          row.risk_factors || [],

        recommendations:
          row.recommendations || [],

        historicalComparison:
          row.historical_comparison || {},

        ai: {
          provider:
            row.ai_provider,

          model:
            row.ai_model,
        },
      },
    });
  } catch (error) {
    console.error(
      "Loading risk analysis failed:",
      error.message
    );

    return res.status(500).json({
      message:
        "Unable to load the risk analysis.",
    });
  }
});

module.exports = router;
