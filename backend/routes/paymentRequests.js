const crypto = require("crypto");
const express = require("express");

const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const {
  createPaymentRequestRiskAnalysis,
} = require("../services/paymentRequestRiskService");

const router = express.Router();


// ======================================================
// CREATE A UNIQUE TRANSACTION REFERENCE
// ======================================================

function createPaymentRequestTransactionReference() {
  const randomPart = crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase();

  return `TXN${randomPart}`;
}


// ======================================================
// AUTHENTICATION
// ======================================================

router.use(requireAuth);


// ======================================================
// GET /api/payment-requests
// LOAD UP TO THREE RANDOM PENDING DEMO REQUESTS
// ======================================================

router.get("/", async (req, res) => {
  try {
    const userId =
      req.user.userId;

    const [requestsResult, countResult] =
      await Promise.all([
        pool.query(
          `
            SELECT
              request.id,
              request.requester_name,
              request.requester_upi_id,
              request.amount,
              request.payment_note,
              request.request_time
            FROM demo_payment_requests AS request
            LEFT JOIN user_payment_request_status AS user_status
              ON user_status.request_id = request.id
             AND user_status.user_id = $1
            WHERE user_status.id IS NULL
            ORDER BY RANDOM()
            LIMIT 3
          `,
          [userId]
        ),

        pool.query(
          `
            SELECT COUNT(*)::int AS pending_count
            FROM demo_payment_requests AS request
            LEFT JOIN user_payment_request_status AS user_status
              ON user_status.request_id = request.id
             AND user_status.user_id = $1
            WHERE user_status.id IS NULL
          `,
          [userId]
        ),
      ]);

    const requests =
      requestsResult.rows.map((row) => ({
        id: row.id,

        requesterName:
          row.requester_name,

        requesterUpiId:
          row.requester_upi_id,

        amount:
          Number(row.amount),

        paymentNote:
          row.payment_note,

        requestTime:
          row.request_time,

        status: "pending",
      }));

    const pendingCount =
      Number(
        countResult.rows[0]
          ?.pending_count || 0
      );

    return res.status(200).json({
      success: true,
      pendingCount,
      displayedCount: requests.length,
      requests,
    });
  } catch (error) {
    console.error(
      "Loading payment requests failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load payment requests right now.",
    });
  }
});


// ======================================================
// GET /api/payment-requests/history
// LOAD RESOLVED REQUESTS FOR THE LOGGED-IN USER
// ======================================================

router.get("/history", async (req, res) => {
  try {
    const userId =
      req.user.userId;

    const historyResult =
      await pool.query(
        `
          SELECT
            request.id AS request_id,
            request.requester_name,
            request.requester_upi_id,
            request.amount,
            request.payment_note,
            request.request_time,
            user_status.status,
            user_status.acted_at,
            transaction.transaction_reference,
            transaction.transaction_time
          FROM user_payment_request_status AS user_status
          INNER JOIN demo_payment_requests AS request
            ON request.id = user_status.request_id
          LEFT JOIN transactions AS transaction
            ON transaction.id = user_status.transaction_id
           AND transaction.user_id = user_status.user_id
          WHERE user_status.user_id = $1
          ORDER BY user_status.acted_at DESC
        `,
        [userId]
      );

    const history =
      historyResult.rows.map((row) => {
        const wasAccepted =
          row.status === "paid";

        return {
          id: row.request_id,

          requesterName:
            row.requester_name,

          requesterUpiId:
            row.requester_upi_id,

          amount:
            Number(row.amount),

          paymentNote:
            row.payment_note,

          requestTime:
            row.request_time,

          status:
            wasAccepted
              ? "accepted"
              : "declined",

          actedAt:
            row.acted_at,

          paymentDirection:
            wasAccepted
              ? "money_out"
              : "no_payment",

          transactionReference:
            row.transaction_reference || null,

          transactionTime:
            row.transaction_time || null,
        };
      });

    return res.status(200).json({
      success: true,
      historyCount: history.length,
      history,
    });
  } catch (error) {
    console.error(
      "Loading payment request history failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load payment request history right now.",
    });
  }
});


// ======================================================
// POST /api/payment-requests/:requestId/analyze
// RUN GEMINI-POWERED PAYMENT-REQUEST RISK ANALYSIS
// ======================================================

router.post(
  "/:requestId/analyze",
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const requestId =
        Number(req.params.requestId);

      if (
        !Number.isInteger(requestId) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment request ID.",
        });
      }

      const requestResult =
        await pool.query(
          `
            SELECT
              request.id,
              request.requester_name,
              request.requester_upi_id,
              request.amount,
              request.payment_note,
              request.request_time
            FROM demo_payment_requests AS request
            LEFT JOIN user_payment_request_status AS user_status
              ON user_status.request_id = request.id
             AND user_status.user_id = $2
            WHERE request.id = $1
              AND user_status.id IS NULL
            LIMIT 1
          `,
          [requestId, userId]
        );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "This payment request was not found or has already been resolved.",
        });
      }

      const request =
        requestResult.rows[0];

      const normalizedRequesterUpiId =
        request.requester_upi_id
          .trim()
          .toLowerCase();

      const [
        historyResult,
        requesterHistoryResult,
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
            SELECT COUNT(*)::int AS payment_count
            FROM transactions
            WHERE user_id = $1
              AND transaction_status = 'completed'
              AND LOWER(TRIM(receiver_upi_id)) = $2
          `,
          [userId, normalizedRequesterUpiId]
        ),
      ]);

      const previousPaymentsToRequesterCount =
        Number(
          requesterHistoryResult.rows[0]
            ?.payment_count || 0
        );

      const analysis =
        await createPaymentRequestRiskAnalysis({
          requesterName:
            request.requester_name,
          requesterUpiId:
            normalizedRequesterUpiId,
          amount:
            Number(request.amount),
          paymentNote:
            request.payment_note,
          transactionHistory:
            historyResult.rows,
          previousPaymentsToRequesterCount,
        });

      const transactionReference =
        createPaymentRequestTransactionReference();

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
              $1, $2, $3, $4,
              $5, $6, $7, $8,
              $9, $10, $11::jsonb, $12::jsonb,
              $13::jsonb, $14::jsonb, $15, $16
            )
            RETURNING id
          `,
          [
            userId,
            transactionReference,
            analysis.request.requesterName,
            analysis.request.requesterUpiId,
            analysis.request.amount,
            analysis.request.paymentNote || null,
            analysis.request.analysisTime,
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
        success: true,
        message:
          "Payment request analyzed successfully.",
        requestId,
        analysisId,
        analysis: {
          id: analysisId,
          ...analysis,
          transactionReference,
        },
      });
    } catch (error) {
      console.error(
        "Payment request analysis failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to analyze the payment request right now. Please try again.",
      });
    }
  }
);


// ======================================================
// POST /api/payment-requests/:requestId/decline
// DECLINE ONE REQUEST FOR THE LOGGED-IN USER
// ======================================================

router.post(
  "/:requestId/decline",
  async (req, res) => {
    try {
      const userId =
        req.user.userId;

      const requestId =
        Number(req.params.requestId);

      if (
        !Number.isInteger(requestId) ||
        requestId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment request ID.",
        });
      }

      const requestResult =
        await pool.query(
          `
            SELECT
              id,
              requester_name,
              requester_upi_id,
              amount,
              payment_note,
              request_time
            FROM demo_payment_requests
            WHERE id = $1
            LIMIT 1
          `,
          [requestId]
        );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Payment request was not found.",
        });
      }

      const insertResult =
        await pool.query(
          `
            INSERT INTO user_payment_request_status (
              user_id,
              request_id,
              status,
              transaction_id,
              acted_at
            )
            VALUES ($1, $2, 'declined', NULL, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, request_id)
            DO NOTHING
            RETURNING
              id,
              status,
              acted_at
          `,
          [userId, requestId]
        );

      if (insertResult.rows.length === 0) {
        const existingStatusResult =
          await pool.query(
            `
              SELECT
                status,
                acted_at
              FROM user_payment_request_status
              WHERE user_id = $1
                AND request_id = $2
              LIMIT 1
            `,
            [userId, requestId]
          );

        const existingStatus =
          existingStatusResult.rows[0];

        if (existingStatus?.status === "paid") {
          return res.status(409).json({
            success: false,
            message:
              "This payment request has already been paid and cannot be declined.",
          });
        }

        if (existingStatus?.status === "declined") {
          return res.status(200).json({
            success: true,
            alreadyDeclined: true,
            message:
              "This payment request was already declined. No payment was made.",
            request: {
              id: requestId,
              status: "declined",
              actedAt:
                existingStatus.acted_at,
            },
          });
        }

        return res.status(409).json({
          success: false,
          message:
            "This payment request has already been resolved.",
        });
      }

      const request =
        requestResult.rows[0];

      const savedStatus =
        insertResult.rows[0];

      return res.status(201).json({
        success: true,
        alreadyDeclined: false,
        message:
          "Payment request declined successfully. No payment was made.",
        request: {
          id: request.id,

          requesterName:
            request.requester_name,

          requesterUpiId:
            request.requester_upi_id,

          amount:
            Number(request.amount),

          paymentNote:
            request.payment_note,

          requestTime:
            request.request_time,

          status:
            savedStatus.status,

          actedAt:
            savedStatus.acted_at,
        },
      });
    } catch (error) {
      console.error(
        "Declining payment request failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to decline the payment request right now.",
      });
    }
  }
);


// ======================================================
// POST /api/payment-requests/:requestId/accept
// ACCEPT A REQUEST AND CREATE A COMPLETED PAYMENT
// ======================================================

router.post(
  "/:requestId/accept",
  async (req, res) => {
    const userId =
      req.user.userId;

    const requestId =
      Number(req.params.requestId);

    const analysisId =
      req.body?.analysisId
        ? String(req.body.analysisId).trim()
        : null;

    if (
      !Number.isInteger(requestId) ||
      requestId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment request ID.",
      });
    }

    if (
      analysisId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        analysisId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment request analysis ID.",
      });
    }

    const client =
      await pool.connect();

    try {
      await client.query("BEGIN");

      // Lock this demo request while the decision is being
      // processed. This prevents two simultaneous clicks from
      // creating two payments for the same user and request.
      const requestResult =
        await client.query(
          `
            SELECT
              id,
              requester_name,
              requester_upi_id,
              amount,
              payment_note,
              request_time
            FROM demo_payment_requests
            WHERE id = $1
            FOR UPDATE
          `,
          [requestId]
        );

      if (requestResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message:
            "Payment request was not found.",
        });
      }

      const existingStatusResult =
        await client.query(
          `
            SELECT
              status,
              transaction_id,
              acted_at
            FROM user_payment_request_status
            WHERE user_id = $1
              AND request_id = $2
            LIMIT 1
          `,
          [userId, requestId]
        );

      const existingStatus =
        existingStatusResult.rows[0];

      if (existingStatus?.status === "declined") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "This payment request has already been declined and cannot be paid.",
        });
      }

      if (existingStatus?.status === "paid") {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "This payment request has already been paid.",
          transactionId:
            existingStatus.transaction_id,
        });
      }

      const request =
        requestResult.rows[0];

      let linkedAnalysis = null;

      if (analysisId) {
        const analysisResult =
          await client.query(
            `
              SELECT
                id,
                transaction_reference,
                receiver_name,
                receiver_upi_id,
                amount,
                payment_note,
                risk_level,
                summary,
                ai_provider,
                risk_breakdown
              FROM risk_analyses
              WHERE id = $1
                AND user_id = $2
                AND ai_provider = 'gemini'
                AND risk_breakdown->>'paymentDirection' = 'money_out'
              LIMIT 1
            `,
            [analysisId, userId]
          );

        linkedAnalysis =
          analysisResult.rows[0] || null;

        const analysisMatchesRequest =
          linkedAnalysis &&
          linkedAnalysis.receiver_name.trim() ===
            request.requester_name.trim() &&
          linkedAnalysis.receiver_upi_id
            .trim()
            .toLowerCase() ===
            request.requester_upi_id
              .trim()
              .toLowerCase() &&
          Number(linkedAnalysis.amount) ===
            Number(request.amount) &&
          String(
            linkedAnalysis.payment_note || ""
          ).trim() ===
            String(
              request.payment_note || ""
            ).trim();

        if (!analysisMatchesRequest) {
          await client.query("ROLLBACK");

          return res.status(409).json({
            success: false,
            message:
              "This Gemini analysis does not match the selected payment request. Please analyze the request again.",
          });
        }
      }

      const transactionReference =
        linkedAnalysis
          ? linkedAnalysis.transaction_reference
          : createPaymentRequestTransactionReference();

      const transactionRiskLevel =
        linkedAnalysis
          ? linkedAnalysis.risk_level
          : "not_analyzed";

      const transactionRiskReason =
        linkedAnalysis
          ? linkedAnalysis.summary
          : "The user accepted this payment request without running risk analysis.";

      const transactionResult =
        await client.query(
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
              $6,
              $7,
              'person',
              'completed',
              $8,
              $9,
              'payment_request',
              'not_requested',
              NULL
            )
            RETURNING
              id,
              transaction_reference,
              receiver_name,
              receiver_upi_id,
              amount,
              transaction_time,
              transaction_status,
              payment_note,
              risk_level,
              risk_reason,
              analysis_id,
              payment_path
          `,
          [
            userId,
            transactionReference,
            request.requester_name,
            request.requester_upi_id,
            Number(request.amount),
            transactionRiskLevel,
            transactionRiskReason,
            request.payment_note,
            linkedAnalysis?.id || null,
          ]
        );

      const transaction =
        transactionResult.rows[0];

      const statusResult =
        await client.query(
          `
            INSERT INTO user_payment_request_status (
              user_id,
              request_id,
              status,
              transaction_id,
              acted_at
            )
            VALUES (
              $1,
              $2,
              'paid',
              $3,
              CURRENT_TIMESTAMP
            )
            RETURNING
              status,
              transaction_id,
              acted_at
          `,
          [
            userId,
            requestId,
            transaction.id,
          ]
        );

      await client.query("COMMIT");

      const savedStatus =
        statusResult.rows[0];

      return res.status(201).json({
        success: true,
        paymentDirection: "money_out",
        analysisUsed:
          Boolean(linkedAnalysis),
        message:
          linkedAnalysis
            ? "Payment successfully made after Gemini risk analysis."
            : "Payment successfully made to the requester.",
        request: {
          id: request.id,

          requesterName:
            request.requester_name,

          requesterUpiId:
            request.requester_upi_id,

          amount:
            Number(request.amount),

          paymentNote:
            request.payment_note,

          requestTime:
            request.request_time,

          status:
            savedStatus.status,

          actedAt:
            savedStatus.acted_at,
        },

        transaction: {
          id: transaction.id,

          transactionReference:
            transaction.transaction_reference,

          receiverName:
            transaction.receiver_name,

          receiverUpiId:
            transaction.receiver_upi_id,

          amount:
            Number(transaction.amount),

          transactionTime:
            transaction.transaction_time,

          transactionStatus:
            transaction.transaction_status,

          paymentNote:
            transaction.payment_note,

          riskLevel:
            transaction.risk_level,

          riskReason:
            transaction.risk_reason,

          analysisId:
            transaction.analysis_id,

          paymentPath:
            transaction.payment_path,
        },
      });
    } catch (error) {
      await client
        .query("ROLLBACK")
        .catch(() => {});

      console.error(
        "Accepting payment request failed:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete the requested payment right now.",
      });
    } finally {
      client.release();
    }
  }
);


module.exports = router;
