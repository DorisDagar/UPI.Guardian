const express = require("express");
const cors = require("cors");
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


// ===============================
// TEST ROUTE
// ===============================

app.get("/", (req, res) => {
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