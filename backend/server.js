const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");

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
