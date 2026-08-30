const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  analyzeMessage,
  analyzeScreenshot,
} = require("../services/messageRiskEngine");


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only PNG, JPG and JPEG images are allowed."
        )
      );
    }
  },
});


// ============================================================
// ANALYZE MESSAGE / SCREENSHOT
// ============================================================

router.post(
  "/analyze",
  upload.single("screenshot"),

  async (req, res) => {
    try {

      // --------------------------------------------------------
      // GET TEXT MESSAGE
      // --------------------------------------------------------

      const message =
        String(
          req.body?.message || ""
        ).trim();

      let analysis;


      // ========================================================
      // OPTION 1 — SCREENSHOT
      // ========================================================

      if (req.file) {

        console.log(
          "📷 Screenshot received. Sending to Gemini..."
        );

        analysis =
          await analyzeScreenshot({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
          });

        console.log(
          "✅ Screenshot analysis completed."
        );
      }


      // ========================================================
      // OPTION 2 — PASTED MESSAGE
      // ========================================================

      else if (message) {

        // ------------------------------------------------------
        // MESSAGE LENGTH VALIDATION
        // ------------------------------------------------------

        if (message.length > 1000) {
          return res.status(400).json({
            success: false,

            message:
              "Message cannot exceed 1000 characters.",
          });
        }

        console.log(
          "💬 Message received. Sending to Gemini..."
        );

        analysis =
          await analyzeMessage(message);

        console.log(
          "✅ Message analysis completed."
        );
      }


      // ========================================================
      // NOTHING PROVIDED
      // ========================================================

      else {

        return res.status(400).json({
          success: false,

          message:
            "Please enter a message or upload a screenshot.",
        });
      }


      // ========================================================
      // SEND RESULT TO FRONTEND
      // ========================================================

      return res.status(200).json({

        success: true,

        result: {

          score:
            analysis.score,

          level:
            analysis.level,

          isPotentialScam:
            analysis.isPotentialScam,

          explanation:
            analysis.explanation,

          riskFactors:
            analysis.riskFactors,

          detected:
            analysis.detected,

          detectedElements:
            analysis.detectedElements,

          recommendations:
            analysis.recommendations,

          messageLength:
            analysis.messageLength,
        },
      });

    }

    // ========================================================
    // ERROR HANDLING
    // ========================================================

    catch (error) {

      console.error(
        "\n❌ Message analyzer error:"
      );

      console.error(
        error.message
      );


      // ------------------------------------------------------
      // MULTER FILE SIZE ERROR
      // ------------------------------------------------------

      if (
        error instanceof multer.MulterError
      ) {

        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {

          return res.status(400).json({
            success: false,

            message:
              "Screenshot is too large. Maximum size is 5 MB.",
          });
        }

        return res.status(400).json({
          success: false,

          message:
            "Unable to process the uploaded screenshot.",
        });
      }


      // ------------------------------------------------------
      // INVALID FILE TYPE
      // ------------------------------------------------------

      if (
        error.message &&
        error.message.includes(
          "Only PNG, JPG and JPEG"
        )
      ) {

        return res.status(400).json({
          success: false,

          message:
            "Only PNG, JPG and JPEG images are allowed.",
        });
      }


      // ------------------------------------------------------
      // GEMINI / OTHER ERRORS
      // ------------------------------------------------------

      return res.status(500).json({

        success: false,

        message:
          error.message ||
          "Unable to analyze the message.",
      });
    }
  }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;