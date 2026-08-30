"use strict";

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       API CONFIGURATION
    ===================================================== */

    const API_BASE_URL =
        window.location.port === "5000"
            ? ""
            : "http://localhost:5000";


    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const token =
        localStorage.getItem("upiGuardianToken");


    if (!token) {

        alert(
            "Please login to continue."
        );

        window.location.href =
            "login.html";

        return;
    }


    /* =====================================================
       SELECTED TRANSACTION
    ===================================================== */

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
        "🔐 Fraud Report transaction:",
        selectedTransactionId
    );


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const downloadBtn =
        document.getElementById(
            "downloadBtn"
        );

    const notifyBtn =
        document.getElementById(
            "notifyBtn"
        );

    const toast =
        document.getElementById(
            "toast"
        );

    const toastText =
        document.getElementById(
            "toastText"
        );


    /* =====================================================
       TRUSTED PERSON
    ===================================================== */

    const trustedPerson =
        localStorage.getItem(
            "trustedPerson"
        );

    const trustedMobile =
        localStorage.getItem(
            "trustedPersonWhatsapp"
        );


    const personElement =
        document.getElementById(
            "reportTrustedPerson"
        );

    const mobileElement =
        document.getElementById(
            "reportTrustedMobile"
        );

    const relationshipElement =
        document.getElementById(
            "reportTrustedRelationship"
        );


    updateTrustedPerson();


    function updateTrustedPerson() {

        if (personElement) {

            personElement.textContent =
                trustedPerson ||
                "Not added";

        }


        if (mobileElement) {

            if (trustedMobile) {

                mobileElement.textContent =
                    "+91 ••••••" +
                    trustedMobile.slice(-4);

            } else {

                mobileElement.textContent =
                    "Not available";

            }

        }


        if (relationshipElement) {

            const relationships = {

                "Mom":
                    "Mother",

                "Dad":
                    "Father",

                "Best Friend":
                    "Best Friend"

            };


            relationshipElement.textContent =
                relationships[
                    trustedPerson
                ] ||
                "-";

        }

    }


    /* =====================================================
       REPORT STATE
    ===================================================== */

    let reportData = {

        reportId:
            "",

        date:
            "",

        receiver:
            "",

        amount:
            "",

        transactionId:
            "",

        dateTime:
            "",

        paymentMethod:
            "",

        bankName:
            "",

        riskScore:
            "Not available",

        riskLevel:
            "Not available",

        riskReason:
            "",

        evidenceCount:
            0,

        evidence:
            []

    };


    /* =====================================================
       RISK CHART
    ===================================================== */

    let riskChart = null;


    /* =====================================================
       FORMAT CURRENCY
    ===================================================== */

    function formatCurrency(
        value
    ) {

        const amount =
            Number(value);


        if (
            !Number.isFinite(amount)
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
                    amount % 1 === 0
                        ? 0
                        : 2
            }
        ).format(
            amount
        );

    }


    /* =====================================================
       FORMAT DATE & TIME
    ===================================================== */

    function formatDateTime(
        value
    ) {

        if (!value) {

            return "Not available";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "Not available";

        }


        return new Intl.DateTimeFormat(
            "en-IN",
            {
                day:
                    "2-digit",

                month:
                    "short",

                year:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit"
            }
        ).format(
            date
        );

    }


    /* =====================================================
       FORMAT TIME
    ===================================================== */

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


        return new Intl.DateTimeFormat(
            "en-IN",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        ).format(
            date
        );

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );

    }


    /* =====================================================
       GET EVIDENCE TITLE
    ===================================================== */

    function getEvidenceTitle(
        evidenceType
    ) {

        const titles = {

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


        return (
            titles[
                evidenceType
            ] ||
            "Evidence"
        );

    }


    /* =====================================================
       GET RISK LEVEL
    ===================================================== */

    function getRiskLevel(
        value
    ) {

        const risk =
            String(
                value ||
                ""
            ).toLowerCase();


        if (
            risk.includes("high") ||
            risk.includes("critical")
        ) {

            return "high";

        }


        if (
            risk.includes("medium") ||
            risk.includes("moderate")
        ) {

            return "medium";

        }


        if (
            risk.includes("safe") ||
            risk.includes("low")
        ) {

            return "low";

        }


        return "medium";

    }


    /* =====================================================
       GET RISK LABEL
    ===================================================== */

    function getRiskLabel(
        value
    ) {

        const level =
            getRiskLevel(
                value
            );


        if (
            level === "high"
        ) {

            return "HIGH RISK";

        }


        if (
            level === "low"
        ) {

            return "LOW RISK";

        }


        return "MEDIUM RISK";

    }


    /* =====================================================
       UPDATE REPORT HEADER
    ===================================================== */

    function updateReportHeader(
        transaction
    ) {

        const reportInfo =
            document.querySelectorAll(
                ".report-info strong"
            );


        const generatedDate =
            new Date();


        const reportId =
            `UG-FIR-${generatedDate
                .getFullYear()}-${String(
                transaction.id
            ).padStart(
                4,
                "0"
            )}`;


        reportData.reportId =
            reportId;


        reportData.date =
            new Intl.DateTimeFormat(
                "en-IN",
                {
                    day:
                        "2-digit",

                    month:
                        "short",

                    year:
                        "numeric"
                }
            ).format(
                generatedDate
            );


        if (
            reportInfo[0]
        ) {

            reportInfo[0].textContent =
                reportId;

        }


        if (
            reportInfo[1]
        ) {

            reportInfo[1].textContent =
                reportData.date;

        }

    }


    /* =====================================================
       UPDATE TRANSACTION DETAILS
    ===================================================== */

    function updateTransactionDetails(
        transaction
    ) {

        const detailRows =
            document.querySelectorAll(
                ".transaction-details .detail-row"
            );


        if (
            detailRows[0]
        ) {

            detailRows[0]
                .querySelector("strong")
                ?.replaceChildren(
                    document.createTextNode(
                        transaction.receiver_name ||
                        "Unknown Receiver"
                    )
                );

        }


        if (
            detailRows[1]
        ) {

            detailRows[1]
                .querySelector("strong")
                ?.replaceChildren(
                    document.createTextNode(
                        formatCurrency(
                            transaction.amount
                        )
                    )
                );

        }


        if (
            detailRows[2]
        ) {

            detailRows[2]
                .querySelector("strong")
                ?.replaceChildren(
                    document.createTextNode(
                        transaction.transaction_reference ||
                        String(
                            transaction.id
                        )
                    )
                );

        }


        if (
            detailRows[3]
        ) {

            detailRows[3]
                .querySelector("strong")
                ?.replaceChildren(
                    document.createTextNode(
                        formatDateTime(
                            transaction.transaction_time
                        )
                    )
                );

        }


        if (
            detailRows[4]
        ) {

            const paymentMethod =
                transaction.payment_method ||
                "UPI";


            const bankName =
                transaction.bank_name ||
                "";


            detailRows[4]
                .querySelector("strong")
                ?.replaceChildren(
                    document.createTextNode(
                        bankName
                            ? `${paymentMethod} • ${bankName}`
                            : paymentMethod
                    )
                );

        }


        reportData.receiver =
            transaction.receiver_name ||
            "";

        reportData.amount =
            formatCurrency(
                transaction.amount
            );

        reportData.transactionId =
            transaction.transaction_reference ||
            String(
                transaction.id
            );

        reportData.dateTime =
            formatDateTime(
                transaction.transaction_time
            );

        reportData.paymentMethod =
            transaction.payment_method ||
            "UPI";

        reportData.bankName =
            transaction.bank_name ||
            "";

    }


    /* =====================================================
       UPDATE RISK ANALYSIS
    ===================================================== */

    function updateRiskAnalysis(
        riskAnalysis
    ) {

        if (!riskAnalysis) {

            return;

        }


        const score =
            Number(
                riskAnalysis.overallScore
            );


        const validScore =
            Number.isFinite(score)
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        Math.round(score)
                    )
                )
                : null;


        const riskLevel =
            getRiskLevel(
                riskAnalysis.riskLevel
            );


        const riskLabel =
            getRiskLabel(
                riskAnalysis.riskLevel
            );


        /* -----------------------------------------
           SCORE
        ----------------------------------------- */

        const scoreElement =
            document.getElementById(
                "scoreNumber"
            );


        if (scoreElement) {

            scoreElement.textContent =
                validScore !== null
                    ? validScore
                    : "—";

        }


        /* -----------------------------------------
           RISK LEVEL
        ----------------------------------------- */

        const riskElement =
            document.querySelector(
                ".risk-level-section .high-risk"
            );


        if (riskElement) {

            riskElement.textContent =
                riskLabel;


            riskElement.classList.remove(
                "high-risk",
                "medium-risk",
                "safe-risk",
                "low-risk"
            );


            if (
                riskLevel === "high"
            ) {

                riskElement.classList.add(
                    "high-risk"
                );

            } else if (
                riskLevel === "low"
            ) {

                riskElement.classList.add(
                    "safe-risk"
                );

            } else {

                riskElement.classList.add(
                    "medium-risk"
                );

            }

        }


        /* -----------------------------------------
           RISK REASONS
        ----------------------------------------- */

        const reasonsContainer =
            document.querySelector(
                ".risk-reasons"
            );


        if (
            reasonsContainer
        ) {

            reasonsContainer
                .querySelectorAll(
                    ".reason"
                )
                .forEach(
                    element =>
                        element.remove()
                );


            const title =
                reasonsContainer.querySelector(
                    ".small-title"
                );


            let reasons =
                Array.isArray(
                    riskAnalysis.riskFactors
                )
                    ? riskAnalysis.riskFactors
                    : [];


            if (
                reasons.length === 0 &&
                riskAnalysis.summary
            ) {

                reasons = [
                    {
                        title:
                            "Risk Engine Summary",

                        description:
                            riskAnalysis.summary
                    }
                ];

            }


            if (
                reasons.length === 0
            ) {

                reasons = [
                    {
                        title:
                            "Transaction risk assessment",

                        description:
                            `The payment was classified as ${riskLabel.toLowerCase()}.`
                    }
                ];

            }


            reasons
                .slice(
                    0,
                    5
                )
                .forEach(
                    reason => {

                        const element =
                            document.createElement(
                                "div"
                            );


                        element.className =
                            "reason";


                        const reasonText =
                            typeof reason ===
                                "string"
                                ? reason
                                : (
                                    reason.description ||
                                    reason.title ||
                                    "Risk indicator detected."
                                );


                        element.innerHTML = `

                            <i class="fa-solid fa-triangle-exclamation"></i>

                            <span>
                                ${escapeHtml(
                                    reasonText
                                )}
                            </span>

                        `;


                        if (
                            title
                        ) {

                            title.insertAdjacentElement(
                                "afterend",
                                element
                            );

                        } else {

                            reasonsContainer.appendChild(
                                element
                            );

                        }

                    }
                );

        }


        /* -----------------------------------------
           INCIDENT SUMMARY
        ----------------------------------------- */

        const summary =
            document.querySelector(
                ".summary-card .summary p"
            );


        if (
            summary &&
            riskAnalysis.summary
        ) {

            summary.textContent =
                riskAnalysis.summary;

        }


        /* -----------------------------------------
           CHART
        ----------------------------------------- */

        updateRiskChart(
            validScore,
            riskLevel
        );


        /* -----------------------------------------
           REPORT STATE
        ----------------------------------------- */

        reportData.riskScore =
            validScore !== null
                ? String(
                    validScore
                )
                : "Not available";


        reportData.riskLevel =
            riskLabel;


        reportData.riskReason =
            riskAnalysis.summary ||
            "";

    }


    /* =====================================================
       FALLBACK RISK
    ===================================================== */

    function updateRiskFallback(
        transaction
    ) {

        const riskLevel =
            getRiskLevel(
                transaction.risk_level
            );


        const riskLabel =
            getRiskLabel(
                transaction.risk_level
            );


        const riskElement =
            document.querySelector(
                ".risk-level-section .high-risk"
            );


        if (
            riskElement
        ) {

            riskElement.textContent =
                riskLabel;

        }


        const scoreElement =
            document.getElementById(
                "scoreNumber"
            );


        if (
            scoreElement
        ) {

            scoreElement.textContent =
                "—";

        }


        const reasonsContainer =
            document.querySelector(
                ".risk-reasons"
            );


        if (
            reasonsContainer
        ) {

            reasonsContainer
                .querySelectorAll(
                    ".reason"
                )
                .forEach(
                    element =>
                        element.remove()
                );


            const reason =
                document.createElement(
                    "div"
                );


            reason.className =
                "reason";


            reason.innerHTML = `

                <i class="fa-solid fa-triangle-exclamation"></i>

                <span>
                    No numeric Risk Engine score is attached to this transaction.
                </span>

            `;


            reasonsContainer.appendChild(
                reason
            );

        }


        updateRiskChart(
            null,
            riskLevel
        );


        reportData.riskScore =
            "Not available";


        reportData.riskLevel =
            riskLabel;


        reportData.riskReason =
            transaction.risk_reason ||
            "";

    }


    /* =====================================================
       UPDATE RISK CHART
    ===================================================== */

    function updateRiskChart(
        score,
        riskLevel
    ) {

        const canvas =
            document.getElementById(
                "riskChart"
            );


        if (
            !canvas ||
            typeof Chart ===
                "undefined"
        ) {

            return;

        }


        if (riskChart) {

            riskChart.destroy();

        }


        let numericScore =
            Number(score);


        if (
            !Number.isFinite(
                numericScore
            )
        ) {

            numericScore =
                0;

        }


        let scoreColor =
            "#ffbd4a";


        if (
            riskLevel === "high"
        ) {

            scoreColor =
                "#ff586c";

        } else if (
            riskLevel === "low"
        ) {

            scoreColor =
                "#55d9b2";

        }


        riskChart =
            new Chart(
                canvas,
                {

                    type:
                        "doughnut",

                    data: {

                        labels: [
                            "Risk",
                            "Remaining"
                        ],

                        datasets: [

                            {

                                data: [
                                    numericScore,
                                    100 -
                                        numericScore
                                ],

                                backgroundColor: [

                                    scoreColor,

                                    "#25344e"

                                ],

                                borderWidth:
                                    0

                            }

                        ]

                    },

                    options: {

                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        rotation:
                            -90,

                        circumference:
                            180,

                        cutout:
                            "72%",

                        plugins: {

                            legend: {
                                display:
                                    false
                            },

                            tooltip: {
                                enabled:
                                    false
                            }

                        }

                    }

                }
            );

    }


    /* =====================================================
       UPDATE EVIDENCE
    ===================================================== */

    function updateEvidenceSection(
        evidenceList
    ) {

        const list =
            document.querySelector(
                ".evidence-card .evidence-list"
            );


        if (!list) {

            return;

        }


        list.innerHTML =
            "";


        if (
            !evidenceList ||
            evidenceList.length === 0
        ) {

            list.innerHTML = `

                <div
                    class="evidence-row"
                    style="justify-content:center;"
                >

                    No evidence collected yet.

                </div>

            `;


            return;

        }


        evidenceList.forEach(
            evidence => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "evidence-row";


                const isText =
                    Boolean(
                        evidence.evidence_content
                    ) &&
                    !evidence.file_path;


                let icon =
                    "fa-regular fa-file";


                let iconClass =
                    "image-icon";


                if (
                    evidence.evidence_type ===
                    "scam_message"
                ) {

                    icon =
                        "fa-regular fa-message";

                } else if (
                    evidence.evidence_type ===
                    "suspicious_link"
                ) {

                    icon =
                        "fa-solid fa-link";

                } else if (
                    evidence.mime_type ===
                    "application/pdf"
                ) {

                    icon =
                        "fa-regular fa-file-pdf";

                    iconClass =
                        "pdf-icon";

                } else if (
                    evidence.mime_type?.startsWith(
                        "image/"
                    )
                ) {

                    icon =
                        "fa-regular fa-image";

                }


                const name =
                    isText
                        ? getEvidenceTitle(
                            evidence.evidence_type
                        )
                        : (
                            evidence.file_name ||
                            "Evidence"
                        );


                row.innerHTML = `

                    <i
                        class="${icon} ${iconClass}"
                    ></i>

                    <span>
                        ${escapeHtml(
                            name
                        )}
                    </span>

                    <div class="attached">

                        <i
                            class="fa-solid fa-check"
                        ></i>

                        Attached

                    </div>

                `;


                list.appendChild(
                    row
                );

            }
        );

    }


    /* =====================================================
       UPDATE REPORT TIMELINE
    ===================================================== */

    function updateReportTimeline(
        transaction,
        evidenceList
    ) {

        const timeline =
            document.querySelector(
                ".timeline-card .timeline"
            );


        if (!timeline) {

            return;

        }


        timeline.innerHTML =
            "";


        /* -----------------------------------------
           TRANSACTION EVENT
        ----------------------------------------- */

        addTimelineEvent(
            timeline,

            transaction.transaction_time,

            `Payment of ${
                formatCurrency(
                    transaction.amount
                )
            } completed`,

            `Transaction with ${
                transaction.receiver_name ||
                "Unknown Receiver"
            }`
        );


        /* -----------------------------------------
           EVIDENCE EVENTS
        ----------------------------------------- */

        const chronologicalEvidence =
            [
                ...(evidenceList || [])
            ].reverse();


        chronologicalEvidence.forEach(
            evidence => {

                const title =
                    `${getEvidenceTitle(
                        evidence.evidence_type
                    )} added`;


                let description =
                    evidence.file_name ||
                    "Evidence preserved";


                if (
                    evidence.evidence_content &&
                    !evidence.file_path
                ) {

                    description =
                        String(
                            evidence.evidence_content
                        )
                            .substring(
                                0,
                                100
                            );

                }


                addTimelineEvent(
                    timeline,

                    evidence.created_at,

                    title,

                    description
                );

            }
        );


        if (
            chronologicalEvidence.length === 0
        ) {

            addTimelineEvent(
                timeline,

                null,

                "No additional evidence",

                "No evidence has been collected for this transaction."
            );

        }

    }


    /* =====================================================
       ADD TIMELINE EVENT
    ===================================================== */

    function addTimelineEvent(
        timeline,
        time,
        title,
        description
    ) {

        const event =
            document.createElement(
                "div"
            );


        event.className =
            "timeline-event";


        event.innerHTML = `

            <div class="timeline-marker"></div>

            <strong>
                ${escapeHtml(
                    formatTime(
                        time
                    )
                )}
            </strong>

            <span class="dash">
                —
            </span>

            <span>
                ${escapeHtml(
                    title
                )}
                ${
                    description
                        ? ` — ${escapeHtml(
                            description
                        )}`
                        : ""
                }
            </span>

        `;


        timeline.appendChild(
            event
        );

    }


    /* =====================================================
       UPDATE INCIDENT SUMMARY
    ===================================================== */

    function updateIncidentSummary(
        transaction,
        evidenceList,
        riskAnalysis
    ) {

        const summary =
            document.querySelector(
                ".summary-card .summary p"
            );


        if (!summary) {

            return;

        }


        let text =
            `The report concerns a payment of ${
                formatCurrency(
                    transaction.amount
                )
            } to ${
                transaction.receiver_name ||
                "an unknown receiver"
            }.`;


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


        const evidenceNames = [];


        if (
            types.has(
                "scam_message"
            )
        ) {

            evidenceNames.push(
                "a scam message"
            );

        }


        if (
            types.has(
                "suspicious_link"
            )
        ) {

            evidenceNames.push(
                "a suspicious link"
            );

        }


        if (
            types.has(
                "payment_screenshot"
            )
        ) {

            evidenceNames.push(
                "payment evidence"
            );

        }


        if (
            evidenceNames.length > 0
        ) {

            text +=
                ` Collected evidence includes ${
                    formatList(
                        evidenceNames
                    )
                }.`;

        }


        if (
            riskAnalysis?.summary
        ) {

            text +=
                ` Risk assessment: ${
                    riskAnalysis.summary
                }.`;

        } else if (
            transaction.risk_reason
        ) {

            text +=
                ` Recorded risk reason: ${
                    transaction.risk_reason
                }.`;

        }


        summary.textContent =
            text;

    }


    /* =====================================================
       FORMAT LIST
    ===================================================== */

    function formatList(
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
                items[
                    items.length - 1
                ]
            }`;

    }


    /* =====================================================
       LOAD REPORT DATA
    ===================================================== */

    async function loadReportData() {

        try {

            console.log(
                "📡 Loading Fraud Report..."
            );


            /* =============================================
               LOAD TRANSACTION + EVIDENCE
            ============================================= */

            const evidenceResponse =
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


            const evidenceData =
                await evidenceResponse.json();


            if (
                evidenceResponse.status === 401 ||
                evidenceResponse.status === 403
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


            if (
                !evidenceResponse.ok ||
                evidenceData.success !== true
            ) {

                throw new Error(
                    evidenceData?.message ||
                    "Unable to load transaction data."
                );

            }


            const transaction =
                evidenceData.transaction;


            const evidence =
                Array.isArray(
                    evidenceData.evidence
                )
                    ? evidenceData.evidence
                    : [];


            console.log(
                "✅ Transaction loaded:",
                transaction
            );


            console.log(
                "✅ Evidence loaded:",
                evidence
            );


            /* =============================================
               LOAD REAL RISK ENGINE ANALYSIS
            ============================================= */

            let riskAnalysis =
                null;


            try {

                console.log(
                    "📡 Loading Risk Engine result..."
                );


                const riskResponse =
                    await fetch(
                        `${API_BASE_URL}/api/risk/transaction/${encodeURIComponent(
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


                const riskData =
                    await riskResponse.json();


                if (
                    riskResponse.status === 401 ||
                    riskResponse.status === 403
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


                if (
                    riskResponse.ok &&
                    riskData.success === true &&
                    riskData.riskAnalysis
                ) {

                    riskAnalysis =
                        riskData.riskAnalysis;


                    console.log(
                        "✅ Real Risk Engine score:",
                        riskAnalysis.overallScore
                    );

                } else {

                    console.warn(
                        "⚠️ No Risk Engine analysis attached:",
                        riskData
                    );

                }

            } catch (riskError) {

                console.warn(
                    "⚠️ Risk analysis request failed:",
                    riskError.message
                );

            }


            /* =============================================
               UPDATE REPORT
            ============================================= */

            updateReportHeader(
                transaction
            );


            updateTransactionDetails(
                transaction
            );


            if (
                riskAnalysis
            ) {

                updateRiskAnalysis(
                    riskAnalysis
                );

            } else {

                updateRiskFallback(
                    transaction
                );

            }


            updateEvidenceSection(
                evidence
            );


            updateReportTimeline(
                transaction,
                evidence
            );


            updateIncidentSummary(
                transaction,
                evidence,
                riskAnalysis
            );


            reportData.evidence =
                evidence;


            reportData.evidenceCount =
                evidence.length;


            /* =============================================
               SAVE INCIDENT DATA
            ============================================= */

            localStorage.setItem(
                "upiGuardianIncident",
                JSON.stringify({

                    ...reportData,

                    databaseId:
                        transaction.id,

                    transactionReference:
                        transaction.transaction_reference,

                    riskAnalysisId:
                        riskAnalysis?.analysisId ||
                        null,

                    overallScore:
                        riskAnalysis?.overallScore ??
                        null,

                    riskLevel:
                        riskAnalysis?.riskLevel ||
                        transaction.risk_level,

                    riskReason:
                        riskAnalysis?.summary ||
                        transaction.risk_reason ||
                        "",

                    riskFactors:
                        riskAnalysis?.riskFactors ||
                        [],

                    recommendations:
                        riskAnalysis?.recommendations ||
                        [],

                    generatedAt:
                        new Date().toISOString()

                })
            );


            console.log(
                "✅ Fraud Incident Report loaded successfully."
            );


        } catch (error) {

            console.error(
                "❌ Fraud Report loading failed:",
                error
            );


            showToast(
                error.message ||
                "Unable to load Fraud Incident Report."
            );

        }

    }


    /* =====================================================
       DOWNLOAD REPORT
    ===================================================== */

    if (
        downloadBtn
    ) {

        downloadBtn.addEventListener(
            "click",
            () => {

                window.print();

            }
        );

    }


    /* =====================================================
       SEND TO TRUSTED PERSON
    ===================================================== */

    if (
        notifyBtn
    ) {

        notifyBtn.addEventListener(
            "click",
            async () => {

                /* -----------------------------------------
                   TRUSTED PERSON
                ----------------------------------------- */

                if (!trustedPerson) {

                    showToast(
                        "Please add a trusted person first."
                    );

                    return;

                }


                /* -----------------------------------------
                   MOBILE
                ----------------------------------------- */

                if (!trustedMobile) {

                    showToast(
                        "Trusted person's WhatsApp number not found."
                    );

                    return;

                }


                /* -----------------------------------------
                   BUTTON LOADING
                ----------------------------------------- */

                const originalContent =
                    notifyBtn.innerHTML;


                notifyBtn.disabled =
                    true;


                notifyBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Preparing Report...
                `;


                try {

                    const report = {

                        reportId:
                            reportData.reportId,

                        date:
                            reportData.date,

                        receiver:
                            reportData.receiver,

                        amount:
                            reportData.amount,

                        transactionId:
                            reportData.transactionId,

                        dateTime:
                            reportData.dateTime,

                        paymentMethod:
                            reportData.bankName
                                ? `${reportData.paymentMethod} • ${reportData.bankName}`
                                : reportData.paymentMethod,

                        riskScore:
                            reportData.riskScore,

                        riskLevel:
                            reportData.riskLevel,

                        riskReason:
                            reportData.riskReason,

                        evidenceCount:
                            reportData.evidenceCount

                    };


                    const response =
                        await fetch(
                            `${API_BASE_URL}/api/whatsapp/open`,
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json",

                                    Authorization:
                                        `Bearer ${token}`

                                },

                                body:
                                    JSON.stringify({

                                        phone:
                                            trustedMobile,

                                        trustedPerson:
                                            trustedPerson,

                                        report:
                                            report

                                    })

                            }
                        );


                    const data =
                        await response.json();


                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Unable to prepare WhatsApp message."
                        );

                    }


                    showToast(
                        "Opening WhatsApp..."
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                data.chatUrl;

                        },
                        500
                    );


                } catch (error) {

                    console.error(
                        "WhatsApp error:",
                        error
                    );


                    showToast(
                        error.message ||
                        "Unable to open WhatsApp."
                    );


                    notifyBtn.disabled =
                        false;


                    notifyBtn.innerHTML =
                        originalContent;

                }

            }
        );

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message
    ) {

        if (
            !toast ||
            !toastText
        ) {

            alert(
                message
            );

            return;

        }


        toastText.textContent =
            message;


        toast.classList.add(
            "show"
        );


        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    loadReportData();

});
