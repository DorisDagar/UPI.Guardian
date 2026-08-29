const express = require("express");

const router = express.Router();

const {
  analyzeMessage,
} = require("../services/messageRiskEngine");

router.post("/analyze", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    // -----------------------------
    // Validate message
    // -----------------------------

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Please enter a message to analyze.",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 1000 characters.",
      });
    }

    // -----------------------------
    // Run Message Risk Engine
    // -----------------------------

    const analysis = analyzeMessage(message);

    // -----------------------------
    // Return result
    // -----------------------------

    return res.json({
      success: true,

      result: {
        score: analysis.score,
        level: analysis.level,
        isPotentialScam: analysis.isPotentialScam,

        riskFactors: analysis.riskFactors,

        detected: analysis.detected,

        messageLength: analysis.messageLength,
      },
    });

  } catch (error) {
    console.error("Message analyzer error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to analyze the message.",
    });
  }
});

module.exports = router;