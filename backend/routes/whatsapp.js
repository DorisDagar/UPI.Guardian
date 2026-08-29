const express = require("express");

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Validate Indian WhatsApp Number
|--------------------------------------------------------------------------
*/

function normalizePhone(phone) {

    if (!phone) {
        return null;
    }

    let number = String(phone).replace(/\D/g, "");


    // 919876543210 → 9876543210
    if (number.startsWith("91") && number.length === 12) {
        number = number.substring(2);
    }


    // Indian mobile number
    if (!/^[6-9]\d{9}$/.test(number)) {
        return null;
    }


    // WhatsApp international format
    return `91${number}`;
}


/*
|--------------------------------------------------------------------------
| Create Fraud Report WhatsApp Message
|--------------------------------------------------------------------------
*/

function createFraudMessage(trustedPerson, report) {

    return `🚨 UPI Guardian Fraud Alert

Hello ${trustedPerson},

A suspicious UPI transaction has been detected.

📌 Fraud Incident Report

Report ID: ${report.reportId}
Date: ${report.date}

Receiver: ${report.receiver}
Amount: ${report.amount}
Transaction ID: ${report.transactionId}
Date & Time: ${report.dateTime}
Payment Method: ${report.paymentMethod}

Risk Score: ${report.riskScore}/100
Risk Level: ${report.riskLevel}

The transaction has been flagged by UPI Guardian.

Please contact me immediately and do not make any further payment.

— UPI Guardian`;
}


/*
|--------------------------------------------------------------------------
| POST /api/whatsapp/open
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This does NOT automatically send WhatsApp messages.
|
| It only opens WhatsApp with the message pre-filled.
|
| The user must press SEND inside WhatsApp.
|
*/

router.post("/open", (req, res) => {

    try {

        const {
            phone,
            trustedPerson,
            report
        } = req.body;


        /*
        |--------------------------------------------------------------------------
        | Validate phone
        |--------------------------------------------------------------------------
        */

        const normalizedPhone =
            normalizePhone(phone);


        if (!normalizedPhone) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter a valid 10 digit Indian WhatsApp number."

            });

        }


        /*
        |--------------------------------------------------------------------------
        | Validate report
        |--------------------------------------------------------------------------
        */

        if (!report) {

            return res.status(400).json({

                success: false,

                message:
                    "Fraud report data is missing."

            });

        }


        /*
        |--------------------------------------------------------------------------
        | Create message
        |--------------------------------------------------------------------------
        */

        const message =
            createFraudMessage(
                trustedPerson || "Trusted Person",
                report
            );


        /*
        |--------------------------------------------------------------------------
        | Create WhatsApp URL
        |--------------------------------------------------------------------------
        */

        const chatUrl =
            `https://wa.me/${normalizedPhone}` +
            `?text=${encodeURIComponent(message)}`;


        /*
        |--------------------------------------------------------------------------
        | Send URL back to frontend
        |--------------------------------------------------------------------------
        */

        return res.status(200).json({

            success: true,

            chatUrl

        });


    } catch (error) {

        console.error(
            "WhatsApp error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to open WhatsApp."

        });

    }

});


module.exports = router;