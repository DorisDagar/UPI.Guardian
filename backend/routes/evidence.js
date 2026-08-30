const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const pool = require("../config/db");
const requireAuth = require("../middleware/auth");

const router = express.Router();


// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadDirectory = path.join(
    __dirname,
    "..",
    "uploads",
    "evidence"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const baseName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(
                    /[^a-zA-Z0-9_-]/g,
                    "_"
                )
                .substring(0, 80);

        const uniqueName =
            `${Date.now()}-${Math.round(
                Math.random() * 100000
            )}-${baseName}${extension}`;

        cb(null, uniqueName);
    }

});


// ======================================================
// ALLOWED FILE TYPES
// ======================================================

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",

    "application/pdf",

    "text/plain",
    "text/csv",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/octet-stream"
];


const fileFilter = function (req, file, cb) {

    if (
        allowedMimeTypes.includes(
            file.mimetype
        )
    ) {

        cb(null, true);

    } else {

        cb(
            new Error(
                "This file type is not supported."
            )
        );

    }

};


// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({

    storage,

    fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024
    }

});


// ======================================================
// AUTHENTICATION
// ======================================================

router.use(requireAuth);


// ======================================================
// GET EVIDENCE
// GET /api/evidence?transaction_id=123
// ======================================================

router.get("/", async (req, res) => {

    try {

        const userId =
            req.user.userId;

        const transactionId =
            Number(
                req.query.transaction_id
            );


        if (
            !Number.isInteger(transactionId) ||
            transactionId <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A valid transaction_id is required."

            });

        }


        // --------------------------------------------------
        // Verify transaction ownership
        // --------------------------------------------------

        const transactionResult =
            await pool.query(
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
                    transaction_status
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
            transactionResult.rows.length === 0
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Transaction not found."

            });

        }


        // --------------------------------------------------
        // Get evidence
        // --------------------------------------------------

        const evidenceResult =
            await pool.query(
                `
                SELECT
                    id,
                    transaction_id,
                    evidence_type,
                    file_name,
                    file_path,
                    mime_type,
                    file_size,
                    description,
                    evidence_content,
                    security_status,
                    created_at
                FROM evidence
                WHERE transaction_id = $1
                  AND user_id = $2
                ORDER BY created_at DESC
                `,
                [
                    transactionId,
                    userId
                ]
            );


        // --------------------------------------------------
        // Category counts
        // --------------------------------------------------

        const countsResult =
            await pool.query(
                `
                SELECT
                    evidence_type,
                    COUNT(*)::INTEGER AS count
                FROM evidence
                WHERE transaction_id = $1
                  AND user_id = $2
                GROUP BY evidence_type
                `,
                [
                    transactionId,
                    userId
                ]
            );


        const counts = {};


        countsResult.rows.forEach(row => {

            counts[
                row.evidence_type
            ] = row.count;

        });


        return res.status(200).json({

            success: true,

            transaction:
                transactionResult.rows[0],

            evidence:
                evidenceResult.rows,

            counts,

            total:
                evidenceResult.rows.length

        });

    } catch (error) {

        console.error(
            "❌ Getting evidence failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to load evidence."

        });

    }

});


// ======================================================
// UPLOAD FILE EVIDENCE
// POST /api/evidence
//
// multipart/form-data
//
// Fields:
// transaction_id
// evidence_type
// description
// evidence
// ======================================================

router.post(
    "/",
    upload.array(
        "evidence",
        10
    ),
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const transactionId =
                Number(
                    req.body.transaction_id
                );

            const evidenceType =
                String(
                    req.body.evidence_type ||
                    "other"
                )
                    .trim()
                    .toLowerCase();


            // --------------------------------------------------
            // Validate transaction ID
            // --------------------------------------------------

            if (
                !Number.isInteger(transactionId) ||
                transactionId <= 0
            ) {

                return cleanupUploadedFiles(
                    req.files,
                    res,
                    400,
                    "A valid transaction_id is required."
                );

            }


            // --------------------------------------------------
            // Allowed evidence types
            // --------------------------------------------------

            const allowedTypes = [
                "transaction_details",
                "payment_screenshot",
                "scam_message",
                "suspicious_link",
                "qr_code_details",
                "call_details",
                "other"
            ];


            if (
                !allowedTypes.includes(
                    evidenceType
                )
            ) {

                return cleanupUploadedFiles(
                    req.files,
                    res,
                    400,
                    "Invalid evidence type."
                );

            }


            // --------------------------------------------------
            // Check files
            // --------------------------------------------------

            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select at least one file."

                });

            }


            // --------------------------------------------------
            // Verify transaction ownership
            // --------------------------------------------------

            const transactionResult =
                await pool.query(
                    `
                    SELECT id
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
                transactionResult.rows.length === 0
            ) {

                return cleanupUploadedFiles(
                    req.files,
                    res,
                    404,
                    "Transaction not found."
                );

            }


            // --------------------------------------------------
            // Insert uploaded files
            // --------------------------------------------------

            const savedEvidence = [];


            for (
                const file of req.files
            ) {

                const relativePath =
                    path
                        .relative(
                            path.join(
                                __dirname,
                                ".."
                            ),
                            file.path
                        )
                        .replace(
                            /\\/g,
                            "/"
                        );


                const result =
                    await pool.query(
                        `
                        INSERT INTO evidence (
                            user_id,
                            transaction_id,
                            evidence_type,
                            file_name,
                            file_path,
                            mime_type,
                            file_size,
                            description,
                            evidence_content,
                            security_status
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
                            $10
                        )
                        RETURNING
                            id,
                            transaction_id,
                            evidence_type,
                            file_name,
                            file_path,
                            mime_type,
                            file_size,
                            description,
                            evidence_content,
                            security_status,
                            created_at
                        `,
                        [
                            userId,
                            transactionId,
                            evidenceType,
                            file.originalname,
                            relativePath,
                            file.mimetype,
                            file.size,
                            req.body.description || null,
                            null,
                            "verified"
                        ]
                    );


                savedEvidence.push(
                    result.rows[0]
                );

            }


            console.log(
                "✅ File evidence saved:",
                savedEvidence
            );


            return res.status(201).json({

                success: true,

                message:
                    `${savedEvidence.length} evidence item(s) saved successfully.`,

                evidence:
                    savedEvidence

            });

        } catch (error) {

            console.error(
                "❌ File evidence upload failed:",
                error
            );


            await cleanupFiles(
                req.files
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save evidence.",

                error:
                    error.message

            });

        }

    }
);


// ======================================================
// SAVE TEXT EVIDENCE
// POST /api/evidence/text
//
// JSON body:
//
// {
//    transaction_id: 2,
//    evidence_type: "scam_message",
//    content: "....",
//    description: "...."
// }
//
// ======================================================

router.post(
    "/text",
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const transactionId =
                Number(
                    req.body?.transaction_id
                );

            const evidenceType =
                String(
                    req.body?.evidence_type ||
                    ""
                )
                    .trim()
                    .toLowerCase();

            const content =
                String(
                    req.body?.content ||
                    ""
                ).trim();

            const description =
                String(
                    req.body?.description ||
                    ""
                ).trim() || null;


            // --------------------------------------------------
            // Validate transaction
            // --------------------------------------------------

            if (
                !Number.isInteger(transactionId) ||
                transactionId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A valid transaction_id is required."

                });

            }


            // --------------------------------------------------
            // Text categories
            // --------------------------------------------------

            const allowedTextTypes = [
                "scam_message",
                "suspicious_link",
                "call_details",
                "qr_code_details",
                "other"
            ];


            if (
                !allowedTextTypes.includes(
                    evidenceType
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This evidence type cannot be saved as text."

                });

            }


            // --------------------------------------------------
            // Content validation
            // --------------------------------------------------

            if (
                !content ||
                content.length < 2
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter some evidence content."

                });

            }


            if (
                content.length > 10000
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Evidence text must be 10,000 characters or fewer."

                });

            }


            // --------------------------------------------------
            // Validate URL for suspicious links
            // --------------------------------------------------

            if (
                evidenceType ===
                "suspicious_link"
            ) {

                try {

                    const url =
                        new URL(
                            content
                        );


                    if (
                        ![
                            "http:",
                            "https:"
                        ].includes(
                            url.protocol
                        )
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Please enter a valid HTTP or HTTPS link."

                        });

                    }

                } catch (urlError) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Please enter a valid URL."

                    });

                }

            }


            // --------------------------------------------------
            // Verify transaction ownership
            // --------------------------------------------------

            const transactionResult =
                await pool.query(
                    `
                    SELECT id
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
                transactionResult.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Transaction not found."

                });

            }


            // --------------------------------------------------
            // Generate display file name
            // --------------------------------------------------

            let fileName = null;


            if (
                evidenceType ===
                "scam_message"
            ) {

                fileName =
                    "Scam Message";

            } else if (
                evidenceType ===
                "suspicious_link"
            ) {

                fileName =
                    "Suspicious Link";

            } else if (
                evidenceType ===
                "call_details"
            ) {

                fileName =
                    "Call Details";

            } else if (
                evidenceType ===
                "qr_code_details"
            ) {

                fileName =
                    "QR Code Details";

            } else {

                fileName =
                    "Text Evidence";

            }


            // --------------------------------------------------
            // Save text evidence
            // --------------------------------------------------

            const result =
                await pool.query(
                    `
                    INSERT INTO evidence (
                        user_id,
                        transaction_id,
                        evidence_type,
                        file_name,
                        file_path,
                        mime_type,
                        file_size,
                        description,
                        evidence_content,
                        security_status
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
                        $10
                    )
                    RETURNING
                        id,
                        transaction_id,
                        evidence_type,
                        file_name,
                        file_path,
                        mime_type,
                        file_size,
                        description,
                        evidence_content,
                        security_status,
                        created_at
                    `,
                    [
                        userId,
                        transactionId,
                        evidenceType,
                        fileName,
                        null,
                        "text/plain",
                        Buffer.byteLength(
                            content,
                            "utf8"
                        ),
                        description,
                        content,
                        "verified"
                    ]
                );


            console.log(
                "✅ Text evidence saved:",
                result.rows[0]
            );


            return res.status(201).json({

                success: true,

                message:
                    "Evidence saved successfully.",

                evidence:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "❌ Text evidence save failed:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to save text evidence.",

                error:
                    error.message

            });

        }

    }
);


// ======================================================
// DELETE EVIDENCE
// DELETE /api/evidence/:id
// ======================================================

router.delete(
    "/:id",
    async (req, res) => {

        try {

            const userId =
                req.user.userId;

            const evidenceId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(evidenceId) ||
                evidenceId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid evidence ID."

                });

            }


            // --------------------------------------------------
            // Find evidence
            // --------------------------------------------------

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        file_path
                    FROM evidence
                    WHERE id = $1
                      AND user_id = $2
                    `,
                    [
                        evidenceId,
                        userId
                    ]
                );


            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Evidence not found."

                });

            }


            const evidence =
                result.rows[0];


            // --------------------------------------------------
            // Delete database record
            // --------------------------------------------------

            await pool.query(
                `
                DELETE FROM evidence
                WHERE id = $1
                  AND user_id = $2
                `,
                [
                    evidenceId,
                    userId
                ]
            );


            // --------------------------------------------------
            // Delete physical file
            // --------------------------------------------------

            if (
                evidence.file_path
            ) {

                const absolutePath =
                    path.join(
                        __dirname,
                        "..",
                        evidence.file_path
                    );


                if (
                    fs.existsSync(
                        absolutePath
                    )
                ) {

                    fs.unlinkSync(
                        absolutePath
                    );

                }

            }


            console.log(
                `🗑️ Evidence ${evidenceId} deleted`
            );


            return res.status(200).json({

                success: true,

                message:
                    "Evidence deleted successfully."

            });

        } catch (error) {

            console.error(
                "❌ Evidence deletion failed:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to delete evidence."

            });

        }

    }
);


// ======================================================
// CLEANUP UPLOADED FILES
// ======================================================

async function cleanupFiles(files) {

    if (!files || files.length === 0) {
        return;
    }


    for (
        const file of files
    ) {

        try {

            if (
                fs.existsSync(
                    file.path
                )
            ) {

                fs.unlinkSync(
                    file.path
                );

            }

        } catch (error) {

            console.error(
                "⚠️ File cleanup failed:",
                error
            );

        }

    }

}


function cleanupUploadedFiles(
    files,
    res,
    statusCode,
    message
) {

    cleanupFiles(files)
        .catch(
            error => {

                console.error(
                    "⚠️ Cleanup failed:",
                    error
                );

            }
        );


    return res.status(
        statusCode
    ).json({

        success: false,

        message

    });

}


// ======================================================
// EXPORT
// ======================================================

module.exports = router;
