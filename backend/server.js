const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ==========================================
// ROUTE IMPORTS
// ==========================================

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const whatsappRoutes = require("./routes/whatsapp");
const riskRoutes = require("./routes/risk");
const paymentRoutes = require("./routes/payments");
const transactionRoutes = require("./routes/transactions");
const analyzerRoutes = require("./routes/analyzer");

// ==========================================
// CREATE EXPRESS APP
// ==========================================

const app = express();

// ==========================================
// MIDDLEWARE
// ==========================================

// Allow frontend requests
app.use(
    cors({
        origin: true,
        credentials: true
    })
);

// Read JSON request bodies
app.use(
    express.json({
        limit: "10mb"
    })
);

// Read form data
app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);

// ==========================================
// API REQUEST LOGGER
// ==========================================

app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
        console.log(`📡 ${req.method} ${req.originalUrl}`);
    }

    next();
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

app.use("/api/dashboard", dashboardRoutes);

// ==========================================
// WHATSAPP ROUTES
// ==========================================

app.use("/api/whatsapp", whatsappRoutes);

// ==========================================
// PAYMENT RISK ANALYSIS ROUTES
// ==========================================
//
// Example:
// POST /api/risk/analyze
// GET  /api/risk/:analysisId
//
// ==========================================

app.use("/api/risk", riskRoutes);

// ==========================================
// PAYMENT ROUTES
// ==========================================
//
// These routes come from:
// routes/payments.js
//
// ==========================================

app.use("/api/payments", paymentRoutes);

// ==========================================
// TRANSACTION ROUTES
// ==========================================
//
// These routes come from:
// routes/transactions.js
//
// Example:
// POST /api/transactions/fake-payment
//
// ==========================================

app.use("/api/transactions", transactionRoutes);

// ==========================================
// SCAN & PAY RISK ROUTES
// ==========================================
//
// Scan & Pay uses the same risk engine.
//
// Example:
// POST /api/scan-pay/analyze
//
// ==========================================

app.use("/api/scan-pay", riskRoutes);

// ==========================================
// MESSAGE ANALYZER ROUTES
// ==========================================

app.use("/api/analyzer", analyzerRoutes);

// ==========================================
// GENERAL HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "UPI Guardian Backend is running"
    });
});

// ==========================================
// SCAN & PAY HEALTH CHECK
// ==========================================

app.get("/api/scan-pay/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "UPI Guardian Scan & Pay API is running",
        endpoint: "/api/scan-pay/analyze"
    });
});

// ==========================================
// TRANSACTION HEALTH CHECK
// ==========================================

app.get("/api/transactions/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "UPI Guardian Transactions API is running",
        endpoint: "/api/transactions/fake-payment"
    });
});

// ==========================================
// PAYMENT HEALTH CHECK
// ==========================================

app.get("/api/payments/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "UPI Guardian Payments API is running",
        endpoint: "/api/payments"
    });
});

// ==========================================
// STATIC FRONTEND FILES
// ==========================================
//
// Serves HTML, CSS, JavaScript and images from
// the main project directory.
//
// server.js is assumed to be inside the backend
// folder, so ".." points to the main project folder.
//
// ==========================================

app.use(express.static(path.join(__dirname, "..")));

// ==========================================
// API 404 HANDLER
// ==========================================
//
// This must stay after all valid API routes.
//
// ==========================================

app.use("/api", (req, res) => {
    console.log(`❌ API NOT FOUND: ${req.method} ${req.originalUrl}`);

    return res.status(404).json({
        success: false,
        error: "API endpoint not found",
        method: req.method,
        path: req.originalUrl
    });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
//
// This must stay after every route and middleware.
//
// ==========================================

app.use((err, req, res, next) => {
    console.error("========================================");
    console.error("🛑 UPI GUARDIAN SERVER ERROR");
    console.error("========================================");
    console.error(err);

    // Pass the error forward if a response has
    // already been sent.
    if (res.headersSent) {
        return next(err);
    }

    // Handle invalid JSON request bodies.
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        err.body
    ) {
        return res.status(400).json({
            success: false,
            error: "Invalid JSON request body",
            details: err.message
        });
    }

    const statusCode =
        err.status ||
        err.statusCode ||
        500;

    return res.status(statusCode).json({
        success: false,
        error: err.message || "Internal server error"
    });
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("========================================");
    console.log("🛡️  UPI GUARDIAN BACKEND");
    console.log("========================================");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("----------------------------------------");
    console.log("Available APIs:");
    console.log("  POST /api/auth/*");
    console.log("  GET  /api/dashboard/*");
    console.log("  POST /api/whatsapp/*");
    console.log("  POST /api/risk/analyze");
    console.log("  GET  /api/risk/:analysisId");
    console.log("  POST /api/scan-pay/analyze");
    console.log("  GET  /api/scan-pay/health");
    console.log("  POST /api/payments/*");
    console.log("  GET  /api/payments/health");
    console.log("  POST /api/transactions/fake-payment");
    console.log("  GET  /api/transactions/health");
    console.log("  POST /api/analyzer/*");
    console.log("  GET  /api/health");
    console.log("========================================");
});