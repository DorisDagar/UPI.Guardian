const express = require("express");
const multer = require("multer");

const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const {
  analyzeMessage,
  analyzeScreenshot,
} = require("../services/messageRiskEngine");

const router = express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================
//
// Every scam-message analysis is linked to the currently
// logged-in user using the JWT userId.
// ============================================================

router.use(requireAuth);


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
      // GET LOGGED-IN USER
      // --------------------------------------------------------

      const userId = req.user.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unable to identify the logged-in user.",
        });
      }


      // --------------------------------------------------------
      // GET TEXT MESSAGE
      // --------------------------------------------------------

      const message =
        String(
          req.body?.message || ""
        ).trim();

      let analysis;
      let inputType;


      // ========================================================
      // OPTION 1 — SCREENSHOT
      // ========================================================

      if (req.file) {

        inputType = "screenshot";

        console.log(
          `📷 Screenshot received from user ${userId}. Sending to Gemini...`
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

        inputType = "text";

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
          `💬 Message received from user ${userId}. Sending to Gemini...`
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
      // SAVE AI ANALYSIS TO DATABASE
      // ========================================================
      //
      // This stores BOTH:
      // 1. Pasted text analysis
      // 2. Screenshot analysis
      //
      // inside the same scam_message_analyses table.
      // ========================================================

      const insertResult = await pool.query(
        `
          INSERT INTO scam_message_analyses (
            user_id,
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
            ai_provider,
            ai_model,
            analyzed_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8::jsonb,
            $9::jsonb,
            $10::jsonb,
            $11::jsonb,
            $12::jsonb,
            $13::jsonb,
            $14,
            $15,
            CURRENT_TIMESTAMP
          )
          RETURNING id, analyzed_at
        `,
        [
          userId,

          inputType,

          // For pasted text, save the actual message.
          // For screenshot analysis, messageRiskEngine currently
          // does not perform OCR, so this will remain null.
          message || null,

          analysis.score,

          analysis.level,

          analysis.isPotentialScam,

          analysis.explanation,

          JSON.stringify(
            analysis.riskFactors || []
          ),

          JSON.stringify(
            analysis.detectedElements || []
          ),

          JSON.stringify(
            analysis.recommendations || []
          ),

          JSON.stringify(
            analysis.detected?.urls || []
          ),

          JSON.stringify(
            analysis.detected?.upiIds || []
          ),

          JSON.stringify(
            analysis.detected?.phoneNumbers || []
          ),

          "Google Gemini",

          process.env.GEMINI_MODEL ||
            "gemini-3.7-flash",
        ]
      );


      const savedAnalysisId =
        insertResult.rows[0].id;

      const analyzedAt =
        insertResult.rows[0].analyzed_at;


      console.log(
        `💾 Scam analysis saved successfully. ID: ${savedAnalysisId}, User: ${userId}`
      );


      // ========================================================
      // SEND RESULT TO FRONTEND
      // ========================================================

      return res.status(200).json({

        success: true,

        analysisId:
          savedAnalysisId,

        analyzedAt,

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
      // DATABASE ERROR
      // ------------------------------------------------------

      if (
        error.code
      ) {

        console.error(
          "Database error code:",
          error.code
        );

        return res.status(500).json({
          success: false,

          message:
            "The analysis was generated, but it could not be saved. Please try again.",
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