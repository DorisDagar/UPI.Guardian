/* =====================================================
   UPI GUARDIAN
   SCAM TIMELINE - DYNAMIC JAVASCRIPT
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       API CONFIGURATION
    ================================================= */

    const API_BASE_URL =
        window.location.port === "5000"
            ? ""
            : "http://localhost:5000";


    /* =================================================
       AUTH TOKEN
    ================================================= */

    const token =
        localStorage.getItem("upiGuardianToken");


    if (!token) {

        alert("Please login to continue.");

        window.location.href =
            "login.html";

        return;
    }


    /* =================================================
       SELECTED TRANSACTION
    ================================================= */

    const selectedTransactionId =
        localStorage.getItem(
            "selectedTransactionId"
        );


    if (!selectedTransactionId) {

        alert(
            "No transaction selected."
        );

        window.location.href =
            "select-transaction.html";

        return;
    }


    console.log(
        "🔐 Scam Timeline transaction:",
        selectedTransactionId
    );


    /* =================================================
       DOM ELEMENTS
    ================================================= */

    const timeline =
        document.getElementById(
            "timeline"
        );

    const recoveryContainer =
        document.getElementById(
            "recoveryEvents"
        );

    const reportButton =
        document.getElementById(
            "reportButton"
        );

    const currentStep =
        document.getElementById(
            "currentStep"
        );

    const progressPercentage =
        document.getElementById(
            "progressPercentage"
        );


    /* =================================================
       INCIDENT STATE
    ================================================= */

    let incident = {

        transaction: "",

        amount: 0,

        transactionId: "",

        databaseId:
            selectedTransactionId,

        risk: "",

        duration: "—",

        recoveryStep: 5,

        totalSteps: 6,

        evidenceCount: 0

    };


    /* =================================================
       CATEGORY LABELS
    ================================================= */

    const categoryLabels = {

        transaction_details:
            "Transaction Details",

        payment_screenshot:
            "Payment Screenshot",

        scam_message:
            "Scam Message",

        suspicious_link:
            "Suspicious Link",

        qr_code_details:
            "QR Code Details",

        call_details:
            "Call Details",

        other:
            "Other Evidence"

    };


    /* =================================================
       FORMAT CURRENCY
    ================================================= */

    function formatCurrency(
        amount
    ) {

        const numericAmount =
            Number(amount);


        if (
            !Number.isFinite(
                numericAmount
            )
        ) {

            return "₹0";

        }


        return new Intl.NumberFormat(
            "en-IN",
            {
                style:
                    "currency",

                currency:
                    "INR",

                maximumFractionDigits:
                    2
            }
        ).format(
            numericAmount
        );

    }


    /* =================================================
       FORMAT DATE
    ================================================= */

    function formatDateTime(
        value
    ) {

        if (!value) {

            return "Time unavailable";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Time unavailable";

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric"
            }
        ) +
        " • " +
        date.toLocaleTimeString(
            "en-IN",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    }


    /* =================================================
       FORMAT TIME ONLY
    ================================================= */

    function formatTime(
        value
    ) {

        if (!value) {

            return "—";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "—";

        }


        return date.toLocaleTimeString(
            "en-IN",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    }


    /* =================================================
       RISK LABEL
    ================================================= */

    function getRiskLabel(
        risk
    ) {

        const value =
            String(
                risk || ""
            ).toLowerCase();


        if (
            value === "high"
        ) {

            return "HIGH";

        }


        if (
            value === "safe"
        ) {

            return "SAFE";

        }


        return "MEDIUM";

    }


    /* =================================================
       RISK CSS CLASS
    ================================================= */

    function getRiskClass(
        risk
    ) {

        const value =
            String(
                risk || ""
            ).toLowerCase();


        if (
            value === "high"
        ) {

            return "high-risk";

        }


        if (
            value === "safe"
        ) {

            return "safe-risk";

        }


        return "medium-risk";

    }


    /* =================================================
       EVIDENCE ICON
    ================================================= */

    function getEvidenceIcon(
        evidenceType
    ) {

        switch (
            evidenceType
        ) {

            case "transaction_details":

                return {
                    symbol: "₹",
                    className: "orange-icon"
                };


            case "payment_screenshot":

                return {
                    symbol: "▣",
                    className: "blue-icon"
                };


            case "scam_message":

                return {
                    symbol: "✉",
                    className: "blue-icon"
                };


            case "suspicious_link":

                return {
                    symbol: "↗",
                    className: "purple-icon"
                };


            case "qr_code_details":

                return {
                    symbol: "▦",
                    className: "purple-icon"
                };


            case "call_details":

                return {
                    symbol: "☎",
                    className: "purple-icon"
                };


            default:

                return {
                    symbol: "↑",
                    className: "blue-icon"
                };

        }

    }


    /* =================================================
       HTML ESCAPE
    ================================================= */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =================================================
       CREATE TRANSACTION EVENT
    ================================================= */

    function createTransactionEvent(
        transaction
    ) {

        if (!timeline) {

            return null;

        }


        const eventElement =
            document.createElement(
                "div"
            );


        eventElement.className =
            "timeline-event";


        const risk =
            String(
                transaction.risk_level ||
                "medium"
            ).toLowerCase();


        const riskLabel =
            getRiskLabel(
                risk
            );


        eventElement.innerHTML = `

            <div class="time">

                ${escapeHtml(
                    formatTime(
                        transaction.transaction_time
                    )
                )}

            </div>


            <div class="timeline-marker">

                <div class="event-icon orange-icon">

                    <span>
                        ₹
                    </span>

                </div>

            </div>


            <div class="event-content payment-content">

                <h3>
                    Payment made:
                    ${escapeHtml(
                        formatCurrency(
                            transaction.amount
                        )
                    )}
                </h3>

                <p>
                    Transaction with
                    ${escapeHtml(
                        transaction.receiver_name ||
                        "Unknown Receiver"
                    )}

                    •
                    ${escapeHtml(
                        riskLabel
                    )} risk
                </p>

            </div>

        `;


        return eventElement;

    }


    /* =================================================
       CREATE EVIDENCE EVENT
    ================================================= */

    function createEvidenceEvent(
        evidence
    ) {

        const eventElement =
            document.createElement(
                "div"
            );


        eventElement.className =
            "timeline-event";


        const iconData =
            getEvidenceIcon(
                evidence.evidence_type
            );


        const categoryLabel =
            categoryLabels[
                evidence.evidence_type
            ] ||
            "Evidence";


        let title =
            `${categoryLabel} added`;


        let description =
            "";


        /*
         * Text evidence
         */

        if (
            evidence.evidence_content &&
            !evidence.file_path
        ) {

            const content =
                String(
                    evidence.evidence_content
                ).trim();


            const preview =
                content.length > 100
                    ? `${content.substring(
                        0,
                        100
                    )}...`
                    : content;


            description =
                preview;

        }


        /*
         * File evidence
         */

        else if (
            evidence.file_name
        ) {

            description =
                evidence.file_name;

        }


        else {

            description =
                "Evidence preserved for this incident";

        }


        eventElement.innerHTML = `

            <div class="time">

                ${escapeHtml(
                    formatTime(
                        evidence.created_at
                    )
                )}

            </div>


            <div class="timeline-marker">

                <div class="event-icon ${iconData.className}">

                    <span>
                        ${iconData.symbol}
                    </span>

                </div>

            </div>


            <div class="event-content">

                <h3>
                    ${escapeHtml(
                        title
                    )}
                </h3>

                <p>
                    ${escapeHtml(
                        description
                    )}
                </p>

            </div>

        `;


        /*
         * Add preview capability.
         */

        eventElement.style.cursor =
            "pointer";


        eventElement.addEventListener(
            "click",
            () => {

                previewEvidence(
                    evidence
                );

            }
        );


        return eventElement;

    }


    /* =================================================
       CREATE RECOVERY EVENT
    ================================================= */

    function createRecoveryEvent(
        event,
        index
    ) {

        const eventElement =
            document.createElement(
                "div"
            );


        eventElement.className =
            "timeline-event recovery-event";


        eventElement.style.animationDelay =
            `${index * 0.12}s`;


        eventElement.innerHTML = `

            <div class="time">

                ${escapeHtml(
                    event.time
                )}

            </div>


            <div class="timeline-marker">

                <div class="event-icon blue-icon">

                    <span>
                        ${escapeHtml(
                            event.icon
                        )}
                    </span>

                </div>

            </div>


            <div class="event-content">

                <h3>
                    ${escapeHtml(
                        event.title
                    )}
                </h3>


                <p>
                    ${escapeHtml(
                        event.description
                    )}
                </p>

            </div>

        `;


        return eventElement;

    }


    /* =================================================
       RENDER DYNAMIC TIMELINE
    ================================================= */

    function renderTimeline(
        transaction,
        evidenceList
    ) {

        if (!timeline) {

            return;

        }


        /*
         * Remove old hardcoded events.
         */

        timeline.innerHTML = "";


        /*
         * Transaction event
         */

        const transactionEvent =
            createTransactionEvent(
                transaction
            );


        if (transactionEvent) {

            timeline.appendChild(
                transactionEvent
            );

        }


        /*
         * Evidence events.
         *
         * Database already returns newest first.
         * Reverse it so the timeline is chronological.
         */

        const chronologicalEvidence =
            [
                ...(evidenceList || [])
            ].reverse();


        chronologicalEvidence.forEach(
            evidence => {

                const event =
                    createEvidenceEvent(
                        evidence
                    );


                timeline.appendChild(
                    event
                );

            }
        );


        /*
         * If nothing exists beyond the transaction.
         */

        if (
            chronologicalEvidence.length === 0
        ) {

            const emptyEvent =
                document.createElement(
                    "div"
                );


            emptyEvent.className =
                "timeline-event";


            emptyEvent.innerHTML = `

                <div class="time">
                    —
                </div>


                <div class="timeline-marker">

                    <div class="event-icon blue-icon">

                        <span>
                            +
                        </span>

                    </div>

                </div>


                <div class="event-content">

                    <h3>
                        No additional evidence yet
                    </h3>

                    <p>
                        Add screenshots, messages,
                        links or other evidence in
                        the Evidence Locker.
                    </p>

                </div>

            `;


            timeline.appendChild(
                emptyEvent
            );

        }

    }


    /* =================================================
       RECOVERY EVENTS
    ================================================= */

    function renderRecoveryEvents() {

        if (!recoveryContainer) {

            return;

        }


        recoveryContainer.innerHTML = "";


        /*
         * These events represent actions in the
         * recovery process itself.
         *
         * They are separate from evidence events.
         */

        const recoveryEvents = [

            {
                time:
                    "Recovery",

                title:
                    "Transaction identified",

                description:
                    "Suspicious transaction selected for recovery",

                icon:
                    "↗"
            },

            {
                time:
                    "Recovery",

                title:
                    "Evidence reviewed",

                description:
                    `${incident.evidenceCount} evidence item(s) associated with this incident`,

                icon:
                    "✓"
            }

        ];


        recoveryEvents.forEach(
            (event, index) => {

                recoveryContainer.appendChild(
                    createRecoveryEvent(
                        event,
                        index
                    )
                );

            }
        );

    }


    /* =================================================
       UPDATE INCIDENT SUMMARY
    ================================================= */

    function updateIncidentSummary(
        transaction,
        evidenceList
    ) {

        if (!transaction) {

            return;

        }


        incident.transaction =
            transaction.receiver_name ||
            "Unknown Receiver";


        incident.amount =
            Number(
                transaction.amount
            ) || 0;


        incident.transactionId =
            transaction.transaction_reference ||
            String(
                transaction.id
            );


        incident.databaseId =
            transaction.id;


        incident.risk =
            getRiskLabel(
                transaction.risk_level
            );


        incident.evidenceCount =
            Array.isArray(
                evidenceList
            )
                ? evidenceList.length
                : 0;


        /*
         * Store for Fraud Report.
         */

        localStorage.setItem(
            "upiGuardianIncident",
            JSON.stringify(
                incident
            )
        );


        /*
         * Update existing HTML summary.
         */

        updateSummaryDom(
            transaction,
            evidenceList
        );

    }


    /* =================================================
       UPDATE SUMMARY DOM
    ================================================= */

    function updateSummaryDom(
        transaction,
        evidenceList
    ) {

        /*
         * Amount
         */

        const amountStrong =
            findStatValue(
                "Amount"
            );


        if (amountStrong) {

            amountStrong.textContent =
                formatCurrency(
                    transaction.amount
                );

        }


        /*
         * Risk
         */

        const riskStrong =
            findStatValue(
                "Risk"
            );


        if (riskStrong) {

            riskStrong.textContent =
                getRiskLabel(
                    transaction.risk_level
                );

            riskStrong.className =
                getRiskClass(
                    transaction.risk_level
                );

        }


        /*
         * Duration cannot be calculated reliably
         * from the current transaction/evidence schema.
         */

        const durationStrong =
            findStatValue(
                "Duration"
            );


        if (durationStrong) {

            durationStrong.textContent =
                "—";

        }


        /*
         * Summary text
         */

        const summaryText =
            document.querySelector(
                ".summary-text"
            );


        /*
         * There are two summary-text blocks.
         * First one belongs to Incident Summary.
         */

        if (
            summaryText
        ) {

            const types =
                new Set(
                    (
                        evidenceList ||
                        []
                    ).map(
                        evidence =>
                            evidence.evidence_type
                    )
                );


            const evidenceDescriptions = [];


            if (
                types.has(
                    "scam_message"
                )
            ) {

                evidenceDescriptions.push(
                    "a scam message"
                );

            }


            if (
                types.has(
                    "suspicious_link"
                )
            ) {

                evidenceDescriptions.push(
                    "a suspicious link"
                );

            }


            if (
                types.has(
                    "payment_screenshot"
                )
            ) {

                evidenceDescriptions.push(
                    "payment evidence"
                );

            }


            let summary =
                `The incident involves a payment of ${
                    formatCurrency(
                        transaction.amount
                    )
                } to ${
                    transaction.receiver_name ||
                    "an unknown receiver"
                }.`;


            if (
                evidenceDescriptions.length > 0
            ) {

                summary +=
                    ` Evidence includes ${
                        formatEvidenceList(
                            evidenceDescriptions
                        )
                    }.`;

            }


            summaryText.textContent =
                summary;

        }


        /*
         * Update scam pattern.
         */

        updateScamPattern(
            evidenceList
        );

    }


    /* =================================================
       FIND STAT VALUE
    ================================================= */

    function findStatValue(
        label
    ) {

        const stats =
            document.querySelectorAll(
                ".stat"
            );


        for (
            const stat
            of stats
        ) {

            const span =
                stat.querySelector(
                    "span"
                );


            if (
                span &&
                span.textContent
                    .trim() === label
            ) {

                return stat.querySelector(
                    "strong"
                );

            }

        }


        return null;

    }


    /* =================================================
       FORMAT EVIDENCE LIST
    ================================================= */

    function formatEvidenceList(
        items
    ) {

        if (
            items.length === 1
        ) {

            return items[0];

        }


        if (
            items.length === 2
        ) {

            return `${items[0]} and ${items[1]}`;

        }


        return `${items
            .slice(
                0,
                -1
            )
            .join(", ")}, and ${
                items[items.length - 1]
            }`;

    }


    /* =================================================
       UPDATE SCAM PATTERN
    ================================================= */

    function updateScamPattern(
        evidenceList
    ) {

        const patternText =
            document.querySelector(
                ".pattern-card .summary-text"
            );


        if (!patternText) {

            return;

        }


        const types =
            new Set(
                (
                    evidenceList ||
                    []
                ).map(
                    evidence =>
                        evidence.evidence_type
                )
            );


        const hasMessage =
            types.has(
                "scam_message"
            );


        const hasLink =
            types.has(
                "suspicious_link"
            );


        const hasPayment =
            types.has(
                "payment_screenshot"
            ) ||
            types.has(
                "transaction_details"
            );


        if (
            hasMessage &&
            hasLink &&
            hasPayment
        ) {

            patternText.textContent =
                "The collected evidence shows a reward or social-engineering pattern involving a suspicious message, a suspicious link and payment-related evidence.";

        } else if (
            hasMessage &&
            hasLink
        ) {

            patternText.textContent =
                "The collected evidence contains both a suspicious message and suspicious link, which may indicate a social-engineering attempt.";

        } else if (
            hasMessage
        ) {

            patternText.textContent =
                "A suspicious message has been preserved as evidence for this incident.";

        } else if (
            hasLink
        ) {

            patternText.textContent =
                "A suspicious link has been preserved as evidence for this incident.";

        } else {

            patternText.textContent =
                "The available evidence has been collected and organized for review.";

        }

    }


    /* =================================================
       PREVIEW EVIDENCE
    ================================================= */

    function previewEvidence(
        evidence
    ) {

        /*
         * Text evidence
         */

        if (
            evidence.evidence_content &&
            !evidence.file_path
        ) {

            const preview =
                window.open(
                    "",
                    "_blank",
                    "width=750,height=650"
                );


            if (!preview) {

                alert(
                    "Please allow pop-ups to preview evidence."
                );

                return;

            }


            const title =
                categoryLabels[
                    evidence.evidence_type
                ] ||
                "Evidence";


            preview.document.write(`
                <!DOCTYPE html>

                <html>

                <head>

                    <title>
                        ${escapeHtml(title)}
                    </title>

                    <style>

                        body {
                            background: #02091b;
                            color: #eaf0f8;
                            font-family: Arial, sans-serif;
                            padding: 30px;
                        }

                        .box {
                            max-width: 700px;
                            margin: auto;
                            background: #081735;
                            border: 1px solid #315b99;
                            border-radius: 14px;
                            padding: 25px;
                        }

                        h2 {
                            margin-top: 0;
                        }

                        .content {
                            background: #06132b;
                            border-radius: 9px;
                            padding: 20px;
                            white-space: pre-wrap;
                            line-height: 1.6;
                            word-break: break-word;
                        }

                    </style>

                </head>

                <body>

                    <div class="box">

                        <h2>
                            ${escapeHtml(title)}
                        </h2>

                        <div class="content">
                            ${escapeHtml(
                                evidence.evidence_content
                            )}
                        </div>

                    </div>

                </body>

                </html>
            `);


            preview.document.close();

            return;

        }


        /*
         * File evidence
         */

        if (
            !evidence.file_path
        ) {

            alert(
                "Preview is not available."
            );

            return;

        }


        const cleanPath =
            String(
                evidence.file_path
            )
                .replace(
                    /^backend[\\/]/,
                    ""
                )
                .replace(
                    /\\/g,
                    "/"
                );


        const url =
            `${API_BASE_URL}/${cleanPath}`;


        window.open(
            url,
            "_blank"
        );

    }


    /* =================================================
       LOAD TIMELINE DATA
    ================================================= */

    async function loadTimelineData() {

        try {

            console.log(
                "📡 Loading Scam Timeline data..."
            );


            const response =
                await fetch(
                    `${API_BASE_URL}/api/evidence?transaction_id=${encodeURIComponent(
                        selectedTransactionId
                    )}`,
                    {

                        method:
                            "GET",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            Accept:
                                "application/json"

                        }

                    }
                );


            const data =
                await response.json();


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "upiGuardianToken"
                );


                alert(
                    "Your session has expired."
                );


                window.location.href =
                    "login.html";


                return;

            }


            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    "Unable to load timeline."
                );

            }


            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.message ||
                    "Timeline data could not be loaded."
                );

            }


            const transaction =
                data.transaction;


            const evidenceList =
                Array.isArray(
                    data.evidence
                )
                    ? data.evidence
                    : [];


            console.log(
                "✅ Timeline transaction:",
                transaction
            );


            console.log(
                "✅ Timeline evidence:",
                evidenceList
            );


            /*
             * Update state
             */

            updateIncidentSummary(
                transaction,
                evidenceList
            );


            /*
             * Render timeline
             */

            renderTimeline(
                transaction,
                evidenceList
            );


            /*
             * Render recovery events
             */

            renderRecoveryEvents();


            /*
             * Update report button
             */

            updateProgress();

        } catch (error) {

            console.error(
                "❌ Scam Timeline load failed:",
                error
            );


            showError(
                error.message ||
                "Unable to load Scam Timeline."
            );

        }

    }


    /* =================================================
       UPDATE RECOVERY PROGRESS
    ================================================= */

    function updateProgress() {

        const step =
            5;


        const total =
            6;


        if (currentStep) {

            currentStep.textContent =
                step;

        }


        if (progressPercentage) {

            const percentage =
                Math.round(
                    (step / total) *
                    100
                );


            progressPercentage.textContent =
                `${percentage}% Complete`;

        }

    }


    /* =================================================
       ERROR MESSAGE
    ================================================= */

    function showError(
        message
    ) {

        if (!timeline) {

            alert(
                message
            );

            return;

        }


        timeline.innerHTML = `

            <div
                class="timeline-event"
            >

                <div class="time">
                    !
                </div>

                <div class="timeline-marker">

                    <div class="event-icon red-icon">

                        <span>
                            !
                        </span>

                    </div>

                </div>

                <div class="event-content">

                    <h3>
                        Unable to load timeline
                    </h3>

                    <p>
                        ${escapeHtml(
                            message
                        )}
                    </p>

                </div>

            </div>

        `;

    }


    /* =================================================
       REPORT BUTTON
    ================================================= */

    if (reportButton) {

        reportButton.addEventListener(
            "click",
            () => {

                /*
                 * Save latest incident data.
                 */

                localStorage.setItem(
                    "upiGuardianIncident",
                    JSON.stringify(
                        incident
                    )
                );


                window.location.href =
                    "fraud-report.html";

            }
        );

    }


    /* =================================================
       INITIALIZE
    ================================================= */

    loadTimelineData();

});
