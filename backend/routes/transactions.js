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
        endpoint: "/api/transactions"
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

        const requestedLimit =
            Number(req.query.limit) || 6;

        const limit =
            Math.min(
                Math.max(requestedLimit, 1),
                12
            );


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
            [
                userId,
                limit
            ]
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
                    receiver.transaction_time
            }));


        return res.status(200).json({
            success: true,
            receivers
        });

    } catch (error) {

        console.error(
            "❌ Loading recent receivers failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load recent receivers."
        });

    }

});


// ======================================================
// GET USER TRANSACTIONS
// GET /api/transactions
// ======================================================
//
// Returns the logged-in user's recent transactions.
//
// Optional query:
// ?limit=10
//
// ======================================================

router.get("/", async (req, res) => {

    try {

        const userId = req.user.userId;

        let limit =
            Number(req.query.limit);


        if (
            !Number.isInteger(limit) ||
            limit <= 0
        ) {

            limit = 10;

        }


        // Prevent excessively large requests
        limit = Math.min(limit, 50);


        const result = await pool.query(
            `
            SELECT
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
            FROM transactions
            WHERE user_id = $1
            ORDER BY transaction_time DESC
            LIMIT $2
            `,
            [
                userId,
                limit
            ]
        );


        return res.status(200).json({

            success: true,

            transactions:
                result.rows

        });

    } catch (error) {

        console.error(
            "❌ Getting transactions failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load transactions."

        });

    }

});


// ======================================================
// GET SINGLE TRANSACTION
// GET /api/transactions/:id
// ======================================================
//
// Used by Recovery Mode / Evidence Locker if needed.
//
// ======================================================

router.get("/:id", async (req, res) => {

    try {

        const userId = req.user.userId;

        const transactionId =
            Number(req.params.id);


        if (
            !Number.isInteger(transactionId) ||
            transactionId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid transaction ID."

            });

        }


        const result = await pool.query(
            `
            SELECT
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
            FROM transactions
            WHERE id = $1
              AND user_id = $2
            `,
            [
                transactionId,
                userId
            ]
        );


        if (
            result.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Transaction not found."

            });

        }


        return res.status(200).json({

            success: true,

            transaction:
                result.rows[0]

        });

    } catch (error) {

        console.error(
            "❌ Getting transaction failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load transaction."

        });

    }

});


// ======================================================
// SAVE FAKE SCAN & PAY PAYMENT
// POST /api/transactions/fake-payment
// ======================================================

router.post("/fake-payment", async (req, res) => {

    try {

        // ==================================================
        // USER ID FROM AUTHENTICATED JWT
        // ==================================================

        const userId =
            req.user.userId;


        // ==================================================
        // REQUEST DATA
        // ==================================================

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

        // Receiver name
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


        // Receiver name length
        if (
            receiverName.length > 150
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Receiver name must be 150 characters or fewer."

            });

        }


        // UPI ID
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


        // Amount
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


        // Maximum supported amount
        if (
            amount > 10000000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Payment amount is above the supported limit."

            });

        }


        // Risk level
        if (
            ![
                "safe",
                "medium",
                "high"
            ].includes(
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

        const result =
            await pool.query(
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
        // SUCCESS LOG
        // ==================================================

        console.log(
            "✅ Scan & Pay transaction saved:",
            result.rows[0]
        );


        // ==================================================
        // SUCCESS RESPONSE
        // ==================================================

        return res.status(201).json({

            success: true,

            message:
                "Scan & Pay demo payment saved successfully.",

            transaction:
                result.rows[0]

        });

    } catch (error) {

        // ==================================================
        // ERROR HANDLING
        // ==================================================

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


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
