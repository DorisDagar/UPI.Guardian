const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// ======================================================
// TRANSACTION ROUTE HEALTH CHECK
// GET /api/transactions/health
// ======================================================
//
// This is intentionally before requireAuth so we can
// confirm that this router is actually connected.
//
// ======================================================

router.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "UPI Guardian Transactions API is running",
        endpoint: "/api/transactions/fake-payment"
    });
});

// ======================================================
// AUTHENTICATION
// ======================================================

router.use(requireAuth);

// ======================================================
// RECENT RECEIVERS
// GET /api/transactions/recent-receivers
// ======================================================

router.get("/recent-receivers", async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestedLimit = Number(req.query.limit) || 6;
        const limit = Math.min(Math.max(requestedLimit, 1), 12);

        const result = await pool.query(
            `
            SELECT DISTINCT ON (receiver_upi_id)
                receiver_name,
                receiver_upi_id,
                transaction_time
            FROM transactions
            WHERE user_id = $1
              AND receiver_upi_id IS NOT NULL
              AND receiver_upi_id <> ''
            ORDER BY receiver_upi_id, transaction_time DESC
            LIMIT $2
            `,
            [userId, limit]
        );

        const receivers = result.rows
            .sort(
                (a, b) =>
                    new Date(b.transaction_time) -
                    new Date(a.transaction_time)
            )
            .map((receiver) => ({
                name: receiver.receiver_name,
                upiId: receiver.receiver_upi_id,
                lastTransactionTime:
                    receiver.transaction_time,
            }));

        return res.status(200).json({
            success: true,
            receivers,
        });
    } catch (error) {
        console.error("❌ Loading recent receivers failed:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load recent receivers.",
        });
    }
});

// ======================================================
// SAVE FAKE SCAN & PAY PAYMENT
// POST /api/transactions/fake-payment
// ======================================================

router.post("/fake-payment", async (req, res) => {
    try {
        // User ID comes from the authenticated JWT
        const userId = req.user.userId;

        const receiverName =
            req.body?.receiverName?.trim();

        const receiverUpiId =
            req.body?.receiverUpiId
                ?.trim()
                .toLowerCase();

        const amount =
            Number(req.body?.amount);

        const paymentMethod =
            req.body?.paymentMethod?.trim() ||
            "Scan & Pay";

        const riskLevel =
            String(
                req.body?.riskLevel ||
                "medium"
            ).toLowerCase();

        const riskReason =
            req.body?.riskReason?.trim() ||
            null;

        const receiverCategory =
            req.body?.receiverCategory?.trim() ||
            "person";

        // ==================================================
        // VALIDATION
        // ==================================================

        if (
            !receiverName ||
            receiverName.length < 2
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid receiver name is required."
            });
        }

        if (
            receiverName.length > 150
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Receiver name must be 150 characters or fewer."
            });
        }

        if (
            !receiverUpiId ||
            !/^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(
                receiverUpiId
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid UPI ID is required."
            });
        }

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A valid payment amount is required."
            });
        }

        if (
            amount > 10000000
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Payment amount is above the supported limit."
            });
        }

        if (
            !["safe", "medium", "high"].includes(
                riskLevel
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid risk level."
            });
        }

        // ==================================================
        // GENERATE UNIQUE TRANSACTION REFERENCE
        // ==================================================

        const transactionReference =
            `UPIG-${Date.now()}-${Math.floor(
                Math.random() * 10000
            )}`;

        // ==================================================
        // INSERT INTO EXISTING POSTGRESQL TABLE
        // ==================================================

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
                transaction_status
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
                $11,
                $12
            )
            RETURNING
                id,
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
                created_at
            `,
            [
                userId,
                transactionReference,
                receiverName,
                receiverUpiId,
                amount,
                paymentMethod,
                "UPI Guardian Demo",
                new Date(),
                riskLevel,
                riskReason,
                receiverCategory,
                "completed"
            ]
        );

        // ==================================================
        // SUCCESS
        // ==================================================

        console.log(
            "✅ Scan & Pay transaction saved:",
            result.rows[0]
        );

        return res.status(201).json({
            success: true,

            message:
                "Scan & Pay demo payment saved successfully.",

            transaction:
                result.rows[0]
        });

    } catch (error) {
        console.error(
            "❌ Saving Scan & Pay transaction failed:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                "Unable to save the demo payment.",

            error:
                error.message
        });
    }
});

module.exports = router;
