const express = require("express");
const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// ======================================================
// AUTHENTICATION
// ======================================================

router.use(requireAuth);


// ======================================================
// GLOBAL SCAM TIMELINE
// GET /api/scam-timeline
// ======================================================
//
// Combines:
// 1. Scam message analyses
// 2. User transactions
//
// Only events belonging to the logged-in user are returned.
//
// ======================================================

router.get("/", async (req, res) => {

    try {

        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unable to identify the logged-in user."
            });
        }


        // ==================================================
        // MESSAGE ANALYSIS EVENTS
        // ==================================================

        const messageResult = await pool.query(
            `
            SELECT
                id,
                input_type,
                message_text,
                risk_score,
                risk_level,
                is_potential_scam,
                explanation,
                risk_factors,
                detected_elements,
                recommendations,
                detected_urls,
                detected_upi_ids,
                detected_phone_numbers,
                analyzed_at
            FROM scam_message_analyses
            WHERE user_id = $1
            ORDER BY analyzed_at DESC
            `,
            [userId]
        );


        // ==================================================
        // TRANSACTION EVENTS
        // ==================================================

        const transactionResult = await pool.query(
            `
            SELECT
                id,
                transaction_reference,
                receiver_name,
                receiver_upi_id,
                amount,
                payment_method,
                transaction_time,
                risk_level,
                risk_reason,
                receiver_category,
                transaction_status,
                payment_note,
                analysis_id,
                created_at
            FROM transactions
            WHERE user_id = $1
            ORDER BY transaction_time DESC
            `,
            [userId]
        );


        // ==================================================
        // CONVERT MESSAGE ANALYSES INTO TIMELINE EVENTS
        // ==================================================

        const messageEvents =
            messageResult.rows.map((analysis) => {

                const riskLevel =
                    String(
                        analysis.risk_level || "unknown"
                    ).toLowerCase();


                let title;

                if (
                    analysis.is_potential_scam === true
                ) {
                    title = "Suspicious message detected";
                } else {
                    title = "Message analyzed";
                }


                return {

                    id:
                        `message-${analysis.id}`,

                    type:
                        "message",

                    title,

                    description:
                        analysis.explanation ||
                        "Message security analysis completed.",

                    riskLevel,

                    riskScore:
                        analysis.risk_score,

                    inputType:
                        analysis.input_type,

                    messageText:
                        analysis.message_text,

                    isPotentialScam:
                        analysis.is_potential_scam,

                    riskFactors:
                        analysis.risk_factors || [],

                    detectedElements:
                        analysis.detected_elements || [],

                    recommendations:
                        analysis.recommendations || [],

                    detectedUrls:
                        analysis.detected_urls || [],

                    detectedUpiIds:
                        analysis.detected_upi_ids || [],

                    detectedPhoneNumbers:
                        analysis.detected_phone_numbers || [],

                    eventTime:
                        analysis.analyzed_at

                };

            });


        // ==================================================
        // CONVERT TRANSACTIONS INTO TIMELINE EVENTS
        // ==================================================

        const transactionEvents =
            transactionResult.rows.map((transaction) => {

                const riskLevel =
                    String(
                        transaction.risk_level || "unknown"
                    ).toLowerCase();


                let title;

                if (
                    String(
                        transaction.transaction_status || ""
                    ).toLowerCase() === "blocked"
                ) {

                    title = "Payment blocked";

                } else if (
                    riskLevel === "high"
                ) {

                    title = "High-risk payment detected";

                } else if (
                    riskLevel === "medium"
                ) {

                    title = "Payment requires review";

                } else {

                    title = "Payment completed";

                }


                return {

                    id:
                        `transaction-${transaction.id}`,

                    type:
                        "transaction",

                    title,

                    description:
                        transaction.risk_reason ||
                        "Payment activity recorded.",

                    riskLevel,

                    amount:
                        transaction.amount,

                    receiverName:
                        transaction.receiver_name,

                    receiverUpiId:
                        transaction.receiver_upi_id,

                    paymentMethod:
                        transaction.payment_method,

                    transactionReference:
                        transaction.transaction_reference,

                    receiverCategory:
                        transaction.receiver_category,

                    transactionStatus:
                        transaction.transaction_status,

                    paymentNote:
                        transaction.payment_note,

                    analysisId:
                        transaction.analysis_id,

                    eventTime:
                        transaction.transaction_time,

                    createdAt:
                        transaction.created_at

                };

            });


        // ==================================================
        // COMBINE BOTH EVENT TYPES
        // ==================================================

        const events = [
            ...messageEvents,
            ...transactionEvents
        ];


        // ==================================================
        // SORT NEWEST → OLDEST
        // ==================================================

        events.sort(
            (a, b) =>
                new Date(b.eventTime) -
                new Date(a.eventTime)
        );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(200).json({

            success: true,

            count:
                events.length,

            events

        });

    } catch (error) {

        console.error(
            "❌ Loading global scam timeline failed:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to load Scam Timeline."

        });

    }

});


module.exports = router;
