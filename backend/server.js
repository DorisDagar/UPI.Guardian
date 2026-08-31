const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();


// ======================================================
// ROUTE IMPORTS
// ======================================================

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const whatsappRoutes = require("./routes/whatsapp");
const riskRoutes = require("./routes/risk");
const analyzerRoutes = require("./routes/analyzer");
const transactionRoutes = require("./routes/transactions");
const paymentRoutes = require("./routes/payments");
const evidenceRoutes = require("./routes/evidence");
const paymentRequestRoutes = require("./routes/paymentRequests");

// NEW: GLOBAL SCAM TIMELINE
const scamTimelineRoutes = require("./routes/scamTimeline");


// ======================================================
// CREATE EXPRESS APP
// ======================================================

const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

// ------------------------------------------------------
// CORS
// ------------------------------------------------------

app.use(
    cors({
        origin: true,
        credentials: true
    })
);


// ------------------------------------------------------
// JSON BODY
// ------------------------------------------------------

app.use(
    express.json({
        limit: "10mb"
    })
);


// ------------------------------------------------------
// URL ENCODED BODY
// ------------------------------------------------------

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// ======================================================
// REQUEST LOGGER
// ======================================================

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith("/api")
        ) {

            console.log(
                `📡 ${req.method} ${req.originalUrl}`
            );

        }

        next();

    }
);


// ======================================================
// AUTH ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);


// ======================================================
// TRANSACTION ROUTES
// ======================================================
//
// GET:
// /api/transactions
//
// GET:
// /api/transactions/:id
//
// POST:
// /api/transactions/fake-payment
//
// ======================================================

app.use(
    "/api/transactions",
    transactionRoutes
);


// ======================================================
// PAYMENT ROUTES
// ======================================================
//
// POST:
// /api/payments/direct
//
// POST:
// /api/payments/analysis/:analysisId/decision
//
// ======================================================

app.use(
    "/api/payments",
    paymentRoutes
);


// ======================================================
// PAYMENT REQUEST ROUTES
// ======================================================
//
// GET:
// /api/payment-requests
//
// GET:
// /api/payment-requests/history
//
// POST:
// /api/payment-requests/:requestId/analyze
//
// POST:
// /api/payment-requests/:requestId/decline
//
// POST:
// /api/payment-requests/:requestId/accept
//
// ======================================================

app.use(
    "/api/payment-requests",
    paymentRequestRoutes
);


// ======================================================
// DASHBOARD ROUTES
// ======================================================

app.use(
    "/api/dashboard",
    dashboardRoutes
);


// ======================================================
// WHATSAPP ROUTES
// ======================================================

app.use(
    "/api/whatsapp",
    whatsappRoutes
);


// ======================================================
// PAYMENT RISK ENGINE
// ======================================================
//
// POST /api/risk/analyze
//
// ======================================================

app.use(
    "/api/risk",
    riskRoutes
);


// ======================================================
// SCAN & PAY RISK ENGINE
// ======================================================
//
// POST /api/scan-pay/analyze
//
// Uses the same risk engine.
//
// ======================================================

app.use(
    "/api/scan-pay",
    riskRoutes
);


// ======================================================
// MESSAGE ANALYZER
// ======================================================
//
// POST /api/analyzer/*
//
// ======================================================

app.use(
    "/api/analyzer",
    analyzerRoutes
);


// ======================================================
// EVIDENCE LOCKER
// ======================================================
//
// GET:
// /api/evidence?transaction_id=123
//
// POST:
// /api/evidence
//
// DELETE:
// /api/evidence/:id
//
// ======================================================

app.use(
    "/api/evidence",
    evidenceRoutes
);


// ======================================================
// GLOBAL SCAM TIMELINE
// ======================================================
//
// GET:
// /api/scam-timeline
//
// This is the NEW GLOBAL timeline.
//
// It is completely separate from:
// scamtimeline-recovery.html
//
// ======================================================

app.use(
    "/api/scam-timeline",
    scamTimelineRoutes
);


// ======================================================
// SCAN & PAY HEALTH CHECK
// ======================================================

app.get(
    "/api/scan-pay/health",
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "UPI Guardian Scan & Pay API is running",

            endpoint:
                "/api/scan-pay/analyze"

        });

    }
);


// ======================================================
// TRANSACTION HEALTH CHECK
// ======================================================

app.get(
    "/api/transactions/health",
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "UPI Guardian Transactions API is running",

            endpoint:
                "/api/transactions"

        });

    }
);


// ======================================================
// EVIDENCE HEALTH CHECK
// ======================================================

app.get(
    "/api/evidence/health",
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "UPI Guardian Evidence Locker API is running",

            endpoint:
                "/api/evidence"

        });

    }
);


// ======================================================
// GENERAL HEALTH CHECK
// ======================================================

app.get(
    "/api/health",
    (req, res) => {

        return res.status(200).json({

            success: true,

            message:
                "UPI Guardian Backend is running"

        });

    }
);


// ======================================================
// STATIC FRONTEND FILES
// ======================================================

app.use(
    express.static(
        path.join(
            __dirname,
            ".."
        )
    )
);


// ======================================================
// STATIC UPLOAD FILES
// ======================================================
//
// Evidence files are stored in:
//
// backend/uploads/evidence/
//
// They are exposed through:
//
// /uploads/evidence/<filename>
//
// ======================================================

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);


// ======================================================
// API 404 HANDLER
// ======================================================
//
// IMPORTANT:
// This must remain AFTER all valid API routes.
//
// ======================================================

app.use(
    "/api",
    (req, res) => {

        console.log(
            `❌ API NOT FOUND: ${req.method} ${req.originalUrl}`
        );

        return res.status(404).json({

            success: false,

            error:
                "API endpoint not found",

            method:
                req.method,

            path:
                req.originalUrl

        });

    }
);


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
    (err, req, res, next) => {

        console.error(
            "========================================"
        );

        console.error(
            "🛑 UPI GUARDIAN SERVER ERROR"
        );

        console.error(
            "========================================"
        );

        console.error(
            err
        );


        // ------------------------------------------------
        // If response already started
        // ------------------------------------------------

        if (
            res.headersSent
        ) {

            return next(err);

        }


        // ------------------------------------------------
        // Invalid JSON
        // ------------------------------------------------

        if (
            err instanceof SyntaxError &&
            err.status === 400 &&
            err.body
        ) {

            return res.status(400).json({

                success: false,

                error:
                    "Invalid JSON request body",

                details:
                    err.message

            });

        }


        // ------------------------------------------------
        // Multer / upload errors
        // ------------------------------------------------

        if (
            err instanceof Error &&
            (
                err.name === "MulterError" ||
                err.message ===
                    "This file type is not supported."
            )
        ) {

            return res.status(400).json({

                success: false,

                error:
                    err.message ||
                    "File upload error."

            });

        }


        // ------------------------------------------------
        // Generic server error
        // ------------------------------------------------

        const statusCode =
            err.status ||
            err.statusCode ||
            500;

        return res
            .status(statusCode)
            .json({

                success: false,

                error:
                    err.message ||
                    "Internal server error"

            });

    }
);


// ======================================================
// START SERVER
// ======================================================

const PORT =
    process.env.PORT ||
    5000;


app.listen(
    PORT,
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "🛡️  UPI GUARDIAN BACKEND"
        );

        console.log(
            "========================================"
        );

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "----------------------------------------"
        );

        console.log(
            "Available APIs:"
        );

        console.log(
            "  POST /api/auth/*"
        );

        console.log(
            "  GET  /api/dashboard/*"
        );

        console.log(
            "  POST /api/whatsapp/*"
        );

        console.log(
            "  POST /api/risk/analyze"
        );

        console.log(
            "  GET  /api/risk/:analysisId"
        );

        console.log(
            "  POST /api/scan-pay/analyze"
        );

        console.log(
            "  GET  /api/scan-pay/health"
        );

        console.log(
            "  GET  /api/transactions"
        );

        console.log(
            "  GET  /api/transactions/:id"
        );

        console.log(
            "  POST /api/transactions/fake-payment"
        );

        console.log(
            "  POST /api/payments/direct"
        );

        console.log(
            "  POST /api/payments/analysis/:analysisId/decision"
        );

        console.log(
            "  GET  /api/payment-requests"
        );

        console.log(
            "  GET  /api/payment-requests/history"
        );

        console.log(
            "  POST /api/payment-requests/:requestId/analyze"
        );

        console.log(
            "  POST /api/payment-requests/:requestId/decline"
        );

        console.log(
            "  POST /api/payment-requests/:requestId/accept"
        );

        console.log(
            "  GET  /api/transactions/health"
        );

        console.log(
            "  POST /api/analyzer/*"
        );

        console.log(
            "  GET  /api/evidence"
        );

        console.log(
            "  POST /api/evidence"
        );

        console.log(
            "  DELETE /api/evidence/:id"
        );

        console.log(
            "  GET  /api/evidence/health"
        );

        // NEW GLOBAL SCAM TIMELINE
        console.log(
            "  GET  /api/scam-timeline"
        );

        console.log(
            "  GET  /api/health"
        );

        console.log(
            "  GET  /uploads/evidence/*"
        );

        console.log(
            "========================================"
        );

    }
);
