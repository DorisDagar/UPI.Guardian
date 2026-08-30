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


    // ==========================================
    // VALIDATE RECEIVER NAME
    // ==========================================

    if (
      !receiverName ||
      receiverName.length < 2
    ) {
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


    // ==========================================
    // VALIDATE UPI ID
    // ==========================================

    if (
      !receiverUpiId ||
      !isValidUpiId(receiverUpiId)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid UPI ID, such as name@bank.",
      });
    }


    // ==========================================
    // VALIDATE AMOUNT
    // ==========================================

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


    // ==========================================
    // VALIDATE PAYMENT NOTE
    // ==========================================

    if (paymentNote.length > 500) {
      return res.status(400).json({
        message:
          "Payment note must be 500 characters or fewer.",
      });
    }


    // ==========================================
    // AUTHENTICATED USER
    // ==========================================

    const userId =
      req.user.userId;


    // ==========================================
    // LOAD USER TRANSACTION HISTORY
    // ==========================================

    const [
      historyResult,
      receiverHistoryResult,
    ] = await Promise.all([

      pool.query(
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
      ),

      pool.query(
        `
          SELECT
            COUNT(*)::int AS payment_count
          FROM transactions
          WHERE user_id = $1
            AND transaction_status = 'completed'
            AND LOWER(TRIM(receiver_upi_id)) = $2
        `,
        [
          userId,
          receiverUpiId,
        ]
      ),

    ]);


    const previousPaymentsToReceiverCount =
      Number(
        receiverHistoryResult.rows[0]
          ?.payment_count || 0
      );


    // ==========================================
    // RUN EXISTING SHARED RISK ENGINE
    // ==========================================

    const analysis =
      await createPaymentRiskAnalysis({

        receiverName,

        receiverUpiId,

        amount,

        paymentNote,

        transactionHistory:
          historyResult.rows,

        previousPaymentsToReceiverCount,

      });


    // ==========================================
    // SAVE RISK ANALYSIS
    // ==========================================

    const insertResult =
      await pool.query(
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
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11::jsonb,
            $12::jsonb,
            $13::jsonb,
            $14::jsonb,
            $15,
            $16
          )
          RETURNING id
        `,
        [
          userId,

          analysis.transaction.reference,

          analysis.transaction.receiverName,

          analysis.transaction.receiverUpiId,

          analysis.transaction.amount,

          analysis.transaction.paymentNote ||
            null,

          analysis.transaction.analysisTime,

          analysis.overallScore,

          analysis.riskLevel,

          analysis.summary,

          JSON.stringify(
            analysis.breakdown
          ),

          JSON.stringify(
            analysis.riskFactors
          ),

          JSON.stringify(
            analysis.recommendations
          ),

          JSON.stringify(
            analysis.historicalComparison
          ),

          analysis.ai.provider,

          analysis.ai.model,

        ]
      );


    const analysisId =
      insertResult.rows[0].id;


    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(201).json({

      message:
        "Payment analyzed successfully.",

      analysisId,

      analysis: {

        id:
          analysisId,

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
// GET /api/risk/transaction/:transactionId
//
// LOAD EXISTING RISK ANALYSIS FOR A
// SAVED TRANSACTION
//
// IMPORTANT:
// This does NOT run the Risk Engine again.
//
// It only retrieves the analysis that was
// already created by the shared Risk Engine.
//
// Relationship:
//
// transactions.analysis_id
//          ↓
// risk_analyses.id
//          ↓
// overall_score
//
// ==========================================

router.get(
  "/transaction/:transactionId",
  async (req, res) => {

    try {

      // ----------------------------------------
      // Authenticated user
      // ----------------------------------------

      const userId =
        req.user.userId;


      // ----------------------------------------
      // Transaction ID
      // ----------------------------------------

      const transactionId =
        Number(
          req.params.transactionId
        );


      // ----------------------------------------
      // Validate transaction ID
      // ----------------------------------------

      if (
        !Number.isInteger(transactionId) ||
        transactionId <= 0
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Invalid transaction ID.",

        });

      }


      // ----------------------------------------
      // Find transaction and linked analysis
      // ----------------------------------------

      const result =
        await pool.query(
          `
            SELECT

              t.id AS transaction_id,

              t.user_id,

              t.transaction_reference,

              t.receiver_name,

              t.receiver_upi_id,

              t.amount,

              t.risk_level AS transaction_risk_level,

              t.risk_reason AS transaction_risk_reason,

              t.analysis_id,

              r.id AS risk_analysis_id,

              r.overall_score,

              r.risk_level AS analysis_risk_level,

              r.summary,

              r.risk_breakdown,

              r.risk_factors,

              r.recommendations,

              r.historical_comparison,

              r.ai_provider,

              r.ai_model,

              r.analysis_time

            FROM transactions t

            LEFT JOIN risk_analyses r

              ON r.id = t.analysis_id

             AND r.user_id = t.user_id

            WHERE t.id = $1

              AND t.user_id = $2

            LIMIT 1

          `,
          [
            transactionId,
            userId,
          ]
        );


      // ----------------------------------------
      // Transaction not found
      // ----------------------------------------

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          success: false,

          message:
            "Transaction not found.",

        });

      }


      const row =
        result.rows[0];


      // ----------------------------------------
      // Transaction exists but wasn't analyzed
      // ----------------------------------------

      if (
        !row.analysis_id
      ) {

        return res.status(404).json({

          success: false,

          message:
            "No risk analysis is attached to this transaction.",

          transactionId:
            row.transaction_id,

          transactionReference:
            row.transaction_reference,

          transactionRiskLevel:
            row.transaction_risk_level,

        });

      }


      // ----------------------------------------
      // Analysis ID exists but record is missing
      // ----------------------------------------

      if (
        !row.risk_analysis_id
      ) {

        return res.status(404).json({

          success: false,

          message:
            "The linked risk analysis could not be found.",

          transactionId:
            row.transaction_id,

          analysisId:
            row.analysis_id,

        });

      }


      // ----------------------------------------
      // Return existing Risk Engine result
      // ----------------------------------------

      return res.json({

        success: true,

        riskAnalysis: {

          analysisId:
            row.risk_analysis_id,

          transactionId:
            row.transaction_id,

          transactionReference:
            row.transaction_reference,

          receiverName:
            row.receiver_name,

          receiverUpiId:
            row.receiver_upi_id,

          amount:
            Number(row.amount),

          overallScore:
            Number(row.overall_score),

          riskLevel:
            row.analysis_risk_level ||
            row.transaction_risk_level,

          summary:
            row.summary ||
            row.transaction_risk_reason ||
            "",

          breakdown:
            row.risk_breakdown ||
            {},

          riskFactors:
            row.risk_factors ||
            [],

          recommendations:
            row.recommendations ||
            [],

          historicalComparison:
            row.historical_comparison ||
            {},

          ai: {

            provider:
              row.ai_provider,

            model:
              row.ai_model,

          },

          analysisTime:
            row.analysis_time,

        },

      });

    } catch (error) {

      console.error(
        "Loading transaction risk analysis failed:",
        error.message
      );


      return res.status(500).json({

        success: false,

        message:
          "Unable to load the transaction risk analysis.",

      });

    }

  }
);


// ==========================================
// GET /api/risk/:analysisId
// LOAD A SAVED ANALYSIS
// ==========================================

router.get(
  "/:analysisId",
  async (req, res) => {

    try {

      const analysisId =
        req.params.analysisId;


      const userId =
        req.user.userId;


      const result =
        await pool.query(
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
          [
            analysisId,
            userId,
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          message:
            "Risk analysis was not found.",

        });

      }


      const row =
        result.rows[0];


      return res.json({

        analysis: {

          id:
            row.id,

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
              row.payment_note ||
              "",

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
            row.risk_breakdown ||
            {},

          riskFactors:
            row.risk_factors ||
            [],

          recommendations:
            row.recommendations ||
            [],

          historicalComparison:
            row.historical_comparison ||
            {},

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

  }
);


module.exports = router;
