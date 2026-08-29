const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const whatsappRoutes = require("./routes/whatsapp");

// ADDED: Import the payment-risk routes.
const riskRoutes = require("./routes/risk");

const app = express();


// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json());


// ===============================
// ROUTES
// ===============================

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/whatsapp", whatsappRoutes);

// ADDED: Register the payment-risk API.
app.use("/api/risk", riskRoutes);

// Serve the existing HTML, CSS, JavaScript and image files.
app.use(express.static(path.join(__dirname, "..")));


// ===============================
// TEST ROUTE
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        message: "UPI Guardian Backend is running"
    });
});


// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});