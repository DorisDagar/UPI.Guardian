// ======================================================
// UPI GUARDIAN — SCAN & PAY
// ======================================================

const API_BASE_URL = "http://localhost:5000";

const $ = (id) => document.getElementById(id);

let currentPayment = null;
let currentAnalysis = null;

let cameraStream = null;
let cameraTimer = null;

// ======================================================
// DEMO QR
// ======================================================

const demoPayload =
    "upi://pay?pa=claim-prize@upi&pn=Prize%20Claims%20Desk&am=9999.00&cu=INR&tn=Refund%20verification";

// ======================================================
// AUTH TOKEN
// ======================================================

function getAuthToken() {
    return (
        localStorage.getItem("upiGuardianToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        ""
    );
}

// ======================================================
// UI HELPERS
// ======================================================

function showToast(message) {
    const el = $("toast");

    if (!el) {
        return;
    }

    el.textContent = message;
    el.classList.remove("hidden");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        el.classList.add("hidden");
    }, 3000);
}

function showError(message) {
    const el = $("errorBox");

    if (!el) {
        return;
    }

    el.textContent = message;
    el.classList.remove("hidden");
}

function clearError() {
    const el = $("errorBox");

    if (!el) {
        return;
    }

    el.textContent = "";
    el.classList.add("hidden");
}

function formatMoney(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(number);
}

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );
}

// ======================================================
// SAFE NUMBER HELPER
// ======================================================

function firstNumber(object, keys) {
    if (!object || typeof object !== "object") {
        return null;
    }

    for (const key of keys) {
        const value = Number(object[key]);

        if (Number.isFinite(value)) {
            return value;
        }
    }

    return null;
}

// ======================================================
// UPI QR PARSER
// ======================================================

function parseUpiPayload(payload) {
    const raw = String(payload || "").trim();

    if (!raw) {
        throw new Error(
            "The QR code did not contain readable data."
        );
    }

    // Check whether this is a UPI QR
    if (!/^upi:\/\//i.test(raw)) {
        return {
            raw,
            upiId: "",
            name: "",
            amount: null,
            note: "",
            currency: "INR",
            type: "Non-UPI QR"
        };
    }

    let url;

    try {
        url = new URL(raw);
    } catch (error) {
        throw new Error(
            "The QR contains invalid UPI payment data."
        );
    }

    const params = url.searchParams;

    const amountValue =
        params.get("am");

    return {
        raw,

        upiId:
            params.get("pa") || "",

        name:
            params.get("pn") || "",

        amount:
            amountValue &&
            Number.isFinite(
                Number(amountValue)
            )
                ? Number(amountValue)
                : null,

        note:
            params.get("tn") ||
            params.get("t") ||
            "",

        currency:
            params.get("cu") ||
            "INR",

        type:
            "UPI payment QR"
    };
}

// ======================================================
// POPULATE PAYMENT DETAILS
// ======================================================

function populatePayment(
    data,
    source = "QR image"
) {
    currentPayment = data;
    currentAnalysis = null;

    $("emptyState")?.classList.add(
        "hidden"
    );

    $("analysisLayout")?.classList.remove(
        "hidden"
    );

    // --------------------------------------------------
    // RECEIVER
    // --------------------------------------------------

    $("receiverName").textContent =
        data.name ||
        "Receiver name unavailable";

    $("receiverUpi").textContent =
        data.upiId ||
        "UPI ID unavailable";

    const avatarSource =
        data.name ||
        data.upiId ||
        "?";

    $("receiverAvatar").textContent =
        avatarSource
            .trim()
            .charAt(0)
            .toUpperCase();

    // --------------------------------------------------
    // QR DETAILS
    // --------------------------------------------------

    $("qrAmount").textContent =
        data.amount !== null &&
        data.amount !== undefined
            ? formatMoney(data.amount)
            : "Not specified";

    $("qrNote").textContent =
        data.note ||
        "No note provided";

    $("qrType").textContent =
        data.type ||
        "UPI payment";

    $("qrSource").textContent =
        source;

    // --------------------------------------------------
    // AMOUNT
    // --------------------------------------------------

    $("payAmount").value =
        data.amount !== null &&
        data.amount !== undefined
            ? data.amount
            : "";

    if (
        data.amount !== null &&
        data.amount !== undefined
    ) {
        $("amountHint").textContent =
            "The QR contains a fixed amount. UPI Guardian will compare it with your transaction history.";
    } else {
        $("amountHint").textContent =
            "This QR does not contain a fixed amount. Enter the amount before analysis.";
    }

    // --------------------------------------------------
    // PAYMENT INTENT
    // --------------------------------------------------

    $("intentText").textContent =
        data.note
            ? `The QR includes the payment note "${data.note}". UPI Guardian will analyze this context for scam indicators.`
            : "No payment note was embedded in this QR. UPI Guardian will rely more heavily on receiver and transaction-history signals.";

    // --------------------------------------------------
    // RESET ANALYSIS UI
    // --------------------------------------------------

    if ($("signalList")) {
        $("signalList").innerHTML = "";
    }

    clearError();

    $("riskTitle").textContent =
        "Waiting for analysis";

    $("riskScore").textContent =
        "—";

    $("riskSummary").textContent =
        "Analyze the payment to see how UPI Guardian evaluates it.";

    $("riskCard").className =
        "card risk-card";

    $("riskMeter").style.width =
        "0%";

    $("riskReasons").innerHTML =
        "";

    $("actionCard")?.classList.add(
        "hidden"
    );

    $("blockBtn")?.classList.add(
        "hidden"
    );

    $("proceedBtn")?.classList.add(
        "hidden"
    );

    $("comparisonAmount").textContent =
        "—";

    $("comparisonAverage").textContent =
        "—";

    $("comparisonCount").textContent =
        "—";

    $("comparisonRatio").textContent =
        "—";

    $("usualRange").textContent =
        "—";

    if ($("rangeMarker")) {
        $("rangeMarker").style.left =
            "50%";
    }

    // --------------------------------------------------
    // SCROLL
    // --------------------------------------------------

    const workspace =
        document.querySelector(".workspace");

    if (workspace) {
        window.scrollTo({
            top:
                workspace.offsetTop -
                100,
            behavior: "smooth"
        });
    }
}

// ======================================================
// QR IMAGE DECODER
// ======================================================

function decodeImage(file) {
    return new Promise(
        (resolve, reject) => {
            if (!file) {
                reject(
                    new Error(
                        "No QR image was selected."
                    )
                );
                return;
            }

            if (
                typeof jsQR !==
                "function"
            ) {
                reject(
                    new Error(
                        "QR decoder library could not be loaded."
                    )
                );
                return;
            }

            const image =
                new Image();

            const objectUrl =
                URL.createObjectURL(
                    file
                );

            image.onload = () => {
                try {
                    const maxSize =
                        1600;

                    const largestDimension =
                        Math.max(
                            image.width,
                            image.height
                        );

                    const scale =
                        Math.min(
                            1,
                            maxSize /
                                largestDimension
                        );

                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        Math.max(
                            1,
                            Math.round(
                                image.width *
                                    scale
                            )
                        );

                    canvas.height =
                        Math.max(
                            1,
                            Math.round(
                                image.height *
                                    scale
                            )
                        );

                    const context =
                        canvas.getContext(
                            "2d",
                            {
                                willReadFrequently:
                                    true
                            }
                        );

                    if (!context) {
                        throw new Error(
                            "Unable to process the QR image."
                        );
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const imageData =
                        context.getImageData(
                            0,
                            0,
                            canvas.width,
                            canvas.height
                        );

                    const code =
                        jsQR(
                            imageData.data,
                            imageData.width,
                            imageData.height,
                            {
                                inversionAttempts:
                                    "attemptBoth"
                            }
                        );

                    URL.revokeObjectURL(
                        objectUrl
                    );

                    if (!code) {
                        reject(
                            new Error(
                                "No readable QR code was found. Try a clearer screenshot or crop the QR."
                            )
                        );
                        return;
                    }

                    resolve(
                        code.data
                    );
                } catch (error) {
                    URL.revokeObjectURL(
                        objectUrl
                    );

                    reject(error);
                }
            };

            image.onerror = () => {
                URL.revokeObjectURL(
                    objectUrl
                );

                reject(
                    new Error(
                        "The selected image could not be opened."
                    )
                );
            };

            image.src =
                objectUrl;
        }
    );
}

// ======================================================
// CAMERA
// ======================================================

async function startCamera() {
    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
            .getUserMedia
    ) {
        showToast(
            "Camera access is not supported in this browser."
        );
        return;
    }

    if (
        typeof jsQR !==
        "function"
    ) {
        showToast(
            "QR scanner library is not available."
        );
        return;
    }

    $("cameraModal")?.classList.remove(
        "hidden"
    );

    $("cameraStatus").textContent =
        "Requesting camera access...";

    try {
        cameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        facingMode: {
                            ideal:
                                "environment"
                        }
                    },
                    audio: false
                }
            );

        const video =
            $("cameraVideo");

        if (!video) {
            throw new Error(
                "Camera preview could not be initialized."
            );
        }

        video.srcObject =
            cameraStream;

        await video
            .play()
            .catch(
                () => {}
            );

        $("cameraStatus").textContent =
            "Point your camera at a UPI QR code.";

        clearInterval(
            cameraTimer
        );

        cameraTimer =
            setInterval(
                scanCameraFrame,
                220
            );
    } catch (error) {
        console.error(
            "Camera error:",
            error
        );

        $("cameraStatus").textContent =
            "Camera access was blocked. Please allow camera permission or use Upload QR.";

        if (cameraStream) {
            cameraStream
                .getTracks()
                .forEach(
                    (track) =>
                        track.stop()
                );

            cameraStream = null;
        }
    }
}

function scanCameraFrame() {
    const video =
        $("cameraVideo");

    if (
        !video ||
        !video.videoWidth ||
        !video.videoHeight
    ) {
        return;
    }

    const canvas =
        $("cameraCanvas");

    if (!canvas) {
        return;
    }

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;

    const context =
        canvas.getContext(
            "2d",
            {
                willReadFrequently:
                    true
            }
        );

    if (!context) {
        return;
    }

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const imageData =
        context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
        );

    const code =
        jsQR(
            imageData.data,
            imageData.width,
            imageData.height,
            {
                inversionAttempts:
                    "attemptBoth"
            }
        );

    if (code?.data) {
        stopCamera();

        try {
            const payment =
                parseUpiPayload(
                    code.data
                );

            populatePayment(
                payment,
                "Live camera"
            );

            showToast(
                "UPI QR scanned successfully."
            );
        } catch (error) {
            showError(
                error.message ||
                "Unable to read this QR code."
            );
        }
    }
}

function stopCamera() {
    if (cameraTimer) {
        clearInterval(
            cameraTimer
        );

        cameraTimer = null;
    }

    if (cameraStream) {
        cameraStream
            .getTracks()
            .forEach(
                (track) =>
                    track.stop()
            );

        cameraStream = null;
    }

    if ($("cameraVideo")) {
        $("cameraVideo").srcObject =
            null;
    }

    $("cameraModal")?.classList.add(
        "hidden"
    );
}

// ======================================================
// DEMO QR
// ======================================================

function renderDemoQr() {
    const container =
        $("demoQr");

    if (!container) {
        return;
    }

    if (
        typeof QRCode !==
        "function"
    ) {
        container.textContent =
            "QR library unavailable.";

        return;
    }

    container.innerHTML =
        "";

    new QRCode(
        container,
        {
            text:
                demoPayload,

            width:
                200,

            height:
                200,

            correctLevel:
                QRCode.CorrectLevel.M
        }
    );
}

function runDemo() {
    renderDemoQr();

    $("demoModal")?.classList.remove(
        "hidden"
    );
}

// ======================================================
// ANALYZE PAYMENT
// ======================================================

async function analyzePayment() {
    clearError();

    if (!currentPayment) {
        showError(
            "Please scan or upload a QR code first."
        );

        return;
    }

    const amount =
        Number(
            $("payAmount")?.value
        );

    // --------------------------------------------------
    // VALIDATE UPI
    // --------------------------------------------------

    if (
        !currentPayment.upiId ||
        !/^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(
            currentPayment.upiId
        )
    ) {
        showError(
            "This QR does not contain a valid UPI payment address."
        );

        return;
    }

    // --------------------------------------------------
    // VALIDATE AMOUNT
    // --------------------------------------------------

    if (
        !Number.isFinite(
            amount
        ) ||
        amount <= 0
    ) {
        showError(
            "Enter a valid payment amount before analysis."
        );

        return;
    }

    // --------------------------------------------------
    // LOGIN
    // --------------------------------------------------

    const authToken =
        getAuthToken();

    if (!authToken) {
        showError(
            "Please log in before using transaction-history risk analysis."
        );

        setTimeout(() => {
            window.location.href =
                "../login.html";
        }, 1200);

        return;
    }

    const button =
        $("analyzeBtn");

    if (!button) {
        showError(
            "Analyze button could not be found."
        );

        return;
    }

    const originalText =
        button.innerHTML;

    button.disabled =
        true;

    button.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing transaction...';

    try {
        // ==================================================
        // EXISTING RISK API
        // ==================================================

        const apiUrl =
            `${API_BASE_URL}/api/risk/analyze`;

        console.log(
            "========================================"
        );

        console.log(
            "🛡️ SCAN & PAY ANALYSIS"
        );

        console.log(
            "API:",
            apiUrl
        );

        console.log(
            "Receiver:",
            currentPayment.name
        );

        console.log(
            "UPI ID:",
            currentPayment.upiId
        );

        console.log(
            "Amount:",
            amount
        );

        console.log(
            "Payment note:",
            currentPayment.note
        );

        console.log(
            "========================================"
        );

        const response =
            await fetch(
                apiUrl,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${authToken}`
                    },

                    body:
                        JSON.stringify({
                            receiverName:
                                currentPayment.name ||
                                currentPayment.upiId
                                    .split("@")[0],

                            receiverUpiId:
                                currentPayment.upiId,

                            amount,

                            paymentNote:
                                currentPayment.note ||
                                "",

                            source:
                                "scan-pay"
                        })
                }
            );

        const responseText =
            await response.text();

        let data =
            null;

        if (
            responseText &&
            responseText.trim()
        ) {
            try {
                data =
                    JSON.parse(
                        responseText
                    );
            } catch (error) {
                console.error(
                    "Invalid backend response:",
                    responseText
                );

                throw new Error(
                    `Backend returned an invalid response (HTTP ${response.status}).`
                );
            }
        }

        // --------------------------------------------------
        // 401
        // --------------------------------------------------

        if (
            response.status ===
            401
        ) {
            localStorage.removeItem(
                "upiGuardianToken"
            );

            localStorage.removeItem(
                "token"
            );

            localStorage.removeItem(
                "accessToken"
            );

            throw new Error(
                "Your session has expired. Please log in again."
            );
        }

        // --------------------------------------------------
        // OTHER ERRORS
        // --------------------------------------------------

        if (!response.ok) {
            throw new Error(
                data?.message ||
                data?.error ||
                `Payment analysis failed (HTTP ${response.status}).`
            );
        }

        // --------------------------------------------------
        // ANALYSIS
        // --------------------------------------------------

        if (
            !data ||
            !data.analysis
        ) {
            console.error(
                "Unexpected backend response:",
                data
            );

            throw new Error(
                "The backend did not return an analysis result."
            );
        }

        currentAnalysis =
            data.analysis;

        console.log(
            "✅ COMPLETE SCAN & PAY ANALYSIS:",
            data.analysis
        );

        renderAnalysis(
            data.analysis,
            amount
        );

        showToast(
            "Guardian analysis completed."
        );
    } catch (error) {
        console.error(
            "Scan & Pay analysis error:",
            error
        );

        showError(
            error.message ||
            "Unable to analyze this payment."
        );
    } finally {
        button.disabled =
            false;

        button.innerHTML =
            originalText;
    }
}

// ======================================================
// RENDER ANALYSIS
// ======================================================

function renderAnalysis(
    analysis,
    paymentAmount
) {
    const score =
        Number(
            analysis.overallScore
        ) || 0;

    let riskLevel =
        String(
            analysis.riskLevel ||
            "medium"
        ).toLowerCase();

    // Normalize backend risk names
    if (
        riskLevel ===
            "high-risk" ||
        riskLevel ===
            "danger" ||
        riskLevel ===
            "dangerous"
    ) {
        riskLevel =
            "high";
    }

    if (
        riskLevel ===
        "low"
    ) {
        riskLevel =
            "safe";
    }

    if (
        riskLevel !==
            "high" &&
        riskLevel !==
            "medium" &&
        riskLevel !==
            "safe"
    ) {
        riskLevel =
            "medium";
    }

    const summary =
        analysis.summary ||
        "Review the detected indicators before paying.";

    const historical =
        analysis.historicalComparison ||
        {};

    const facts =
        analysis.facts ||
        {};

    const ai =
        analysis.ai ||
        {};

    const breakdown =
        analysis.breakdown ||
        {};

    const riskFactors =
        Array.isArray(
            analysis.riskFactors
        )
            ? analysis.riskFactors
            : [];

    // ==================================================
    // GUARDIAN VERDICT
    // ==================================================

    const titles = {
        high:
            "High Risk — Pause",

        medium:
            "Caution — Verify",

        safe:
            "Looks Safer"
    };

    $("riskTitle").textContent =
        titles[riskLevel];

    $("riskScore").textContent =
        Math.round(score);

    $("riskSummary").textContent =
        summary;

    $("riskMeter").style.width =
        `${Math.min(
            100,
            Math.max(
                0,
                score
            )
        )}%`;

    $("riskCard").className =
        `card risk-card ${riskLevel}`;

    // ==================================================
    // RISK FACTORS
    // ==================================================

    if (
        riskFactors.length >
        0
    ) {
        $("riskReasons").innerHTML =
            riskFactors
                .slice(0, 8)
                .map(
                    (factor) => `
                        <div class="reason">
                            <strong>
                                ${escapeHtml(
                                    factor.title ||
                                    "Risk signal"
                                )}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    factor.description ||
                                    "A risk indicator was detected."
                                )}
                            </small>
                        </div>
                    `
                )
                .join("");
    } else {
        $("riskReasons").innerHTML = `
            <div class="reason">
                <strong>
                    No major risk factor detected
                </strong>

                <small>
                    The payment is consistent with the available risk signals.
                </small>
            </div>
        `;
    }

    // ==================================================
    // AI PAYMENT INTENT
    // ==================================================

    $("intentText").textContent =
        ai.explanation ||
        (
            currentPayment?.note
                ? `Payment note detected: ${currentPayment.note}`
                : "No additional payment-intent explanation was returned by the AI."
        );

    // ==================================================
    // AI SIGNALS
    // ==================================================

    const signals =
        Array.isArray(
            ai.suspiciousSignals
        )
            ? ai.suspiciousSignals
            : [];

    if (
        signals.length >
        0
    ) {
        $("signalList").innerHTML =
            signals
                .slice(0, 10)
                .map(
                    (signal) => `
                        <span class="signal">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            ${escapeHtml(
                                signal
                            )}
                        </span>
                    `
                )
                .join("");
    } else {
        $("signalList").innerHTML = `
            <span
                class="signal"
                style="
                    color:#79dfac;
                    border-color:rgba(54,211,153,.2);
                    background:rgba(54,211,153,.06);
                "
            >
                <i class="fa-solid fa-check"></i>
                No strong scam language detected
            </span>
        `;
    }

    // ==================================================
    // TRANSACTION HISTORY
    // ==================================================

    const historyCount =
        firstNumber(
            historical,
            [
                "historySize",
                "recentTransactionsChecked",
                "transactionCount",
                "transactionsChecked",
                "count",
                "numberOfTransactions"
            ]
        ) ??
        firstNumber(
            facts,
            [
                "historySize",
                "transactionCount",
                "recentTransactionsChecked"
            ]
        ) ??
        0;

    const averageAmount =
        firstNumber(
            historical,
            [
                "averageAmount",
                "usualAverageAmount",
                "average",
                "meanAmount",
                "historicalAverage",
                "typicalAverage"
            ]
        ) ??
        firstNumber(
            facts,
            [
                "averageAmount",
                "average",
                "meanAmount"
            ]
        );

    const amountRatio =
        firstNumber(
            historical,
            [
                "amountRatio",
                "ratio",
                "relativeToAverage",
                "currentToAverageRatio"
            ]
        ) ??
        firstNumber(
            facts,
            [
                "amountRatio",
                "ratio"
            ]
        );

    const minimumAmount =
        firstNumber(
            historical,
            [
                "minimumAmount",
                "minAmount",
                "min",
                "lowestAmount",
                "historicalMinimum"
            ]
        );

    const maximumAmount =
        firstNumber(
            historical,
            [
                "maximumAmount",
                "maxAmount",
                "max",
                "highestAmount",
                "historicalMaximum"
            ]
        );

    // ==================================================
    // COMPARISON
    // ==================================================

    $("comparisonAmount").textContent =
        formatMoney(
            paymentAmount
        );

    $("comparisonCount").textContent =
        historyCount > 0
            ? historyCount
            : "0";

    $("comparisonAverage").textContent =
        averageAmount !==
        null
            ? formatMoney(
                averageAmount
            )
            : "Not available";

    if (
        amountRatio !==
        null
    ) {
        $("comparisonRatio").textContent =
            `${amountRatio.toFixed(
                1
            )}×`;
    } else if (
        averageAmount !==
            null &&
        averageAmount > 0
    ) {
        const calculatedRatio =
            paymentAmount /
            averageAmount;

        $("comparisonRatio").textContent =
            `${calculatedRatio.toFixed(
                1
            )}×`;
    } else {
        $("comparisonRatio").textContent =
            "—";
    }

    // ==================================================
    // HISTORICAL RANGE
    // ==================================================

    if (
        minimumAmount !==
            null &&
        maximumAmount !==
            null
    ) {
        $("usualRange").textContent =
            `${formatMoney(
                minimumAmount
            )} – ${formatMoney(
                maximumAmount
            )}`;
    } else if (
        averageAmount !==
        null
    ) {
        $("usualRange").textContent =
            `Average ${formatMoney(
                averageAmount
            )}`;
    } else {
        $("usualRange").textContent =
            "Insufficient history";
    }

    // ==================================================
    // RANGE MARKER
    // ==================================================

    if (
        minimumAmount !==
            null &&
        maximumAmount !==
            null &&
        maximumAmount >
            minimumAmount &&
        $("rangeMarker")
    ) {
        const percentage =
            (
                (
                    paymentAmount -
                    minimumAmount
                ) /
                (
                    maximumAmount -
                    minimumAmount
                )
            ) *
            100;

        $("rangeMarker").style.left =
            `${Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            )}%`;
    } else if (
        averageAmount !==
            null &&
        averageAmount > 0 &&
        $("rangeMarker")
    ) {
        const ratio =
            paymentAmount /
            averageAmount;

        $("rangeMarker").style.left =
            `${Math.min(
                100,
                Math.max(
                    0,
                    ratio * 50
                )
            )}%`;
    } else if (
        $("rangeMarker")
    ) {
        $("rangeMarker").style.left =
            "50%";
    }

    // ==================================================
    // HISTORY MESSAGE
    // ==================================================

    let historyMessage =
        "";

    if (
        historyCount >
        0
    ) {
        historyMessage =
            `Based on ${historyCount} recent transaction${
                historyCount === 1
                    ? ""
                    : "s"
            } from your PostgreSQL transaction history.`;
    } else {
        historyMessage =
            "No recent transaction history was available for comparison.";
    }

    if (
        averageAmount !==
        null
    ) {
        historyMessage +=
            ` Your historical average payment is ${formatMoney(
                averageAmount
            )}.`;
    }

    if (
        amountRatio !==
            null &&
        amountRatio > 1
    ) {
        historyMessage +=
            ` This payment is approximately ${amountRatio.toFixed(
                1
            )}× your historical average.`;
    }

    $("historyNote").innerHTML = `
        <i class="fa-solid fa-database"></i>
        ${escapeHtml(
            historyMessage
        )}
    `;

    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
        "Historical comparison:",
        historical
    );

    console.log(
        "Factual breakdown:",
        breakdown
    );

    console.log(
        "Facts:",
        facts
    );

    console.log(
        "AI analysis:",
        ai
    );

    // ==================================================
    // ACTION CARD
    // ==================================================

    $("actionCard")?.classList.remove(
        "hidden"
    );

    if (
        riskLevel ===
        "high"
    ) {
        $("actionText").textContent =
            "The payment shows multiple risk indicators. Do not pay until you independently verify the receiver and reason.";
    } else if (
        riskLevel ===
        "medium"
    ) {
        $("actionText").textContent =
            "Some unusual indicators were detected. Verify the receiver and payment purpose before continuing.";
    } else {
        $("actionText").textContent =
            "No major risk indicators were detected. Still confirm the receiver and amount before paying.";
    }

    $("blockBtn")?.classList.toggle(
        "hidden",
        riskLevel !==
            "high"
    );

    $("proceedBtn")?.classList.toggle(
        "hidden",
        riskLevel ===
            "high"
    );

    // ==================================================
    // SAVE LAST ANALYSIS LOCALLY
    // ==================================================

    try {
        localStorage.setItem(
            "upiGuardianLastScanPayAnalysis",
            JSON.stringify({
                analysis,
                qr:
                    currentPayment,
                analyzedAmount:
                    paymentAmount,
                savedAt:
                    new Date().toISOString()
            })
        );
    } catch (error) {
        console.warn(
            "Could not save analysis locally:",
            error
        );
    }
}

// ======================================================
// FAKE PAYMENT SUCCESS SCREEN
// ======================================================

function showFakePaymentSuccess(
    transaction
) {
    const workspace =
        document.querySelector(
            ".workspace"
        );

    if (!workspace) {
        return;
    }

    workspace.innerHTML = `
        <div
            class="card"
            style="
                max-width:700px;
                margin:30px auto;
                text-align:center;
                padding:40px;
            "
        >

            <div
                style="
                    width:80px;
                    height:80px;
                    border-radius:50%;
                    margin:0 auto 20px;
                    display:grid;
                    place-items:center;
                    background:rgba(54,211,153,.12);
                    border:2px solid #36d399;
                    color:#36d399;
                    font-size:34px;
                "
            >
                <i class="fa-solid fa-check"></i>
            </div>

            <span
                class="section-label"
            >
                DEMO PAYMENT COMPLETED
            </span>

            <h2
                style="
                    font-size:28px;
                    margin:10px 0;
                "
            >
                Payment Successful
            </h2>

            <p
                style="
                    color:#9bb3d2;
                    font-size:13px;
                    line-height:1.7;
                    margin-bottom:25px;
                "
            >
                This is a simulated payment.
                No real money was transferred.
            </p>

            <div
                style="
                    background:#091a32;
                    border:1px solid #17385f;
                    border-radius:14px;
                    padding:20px;
                    text-align:left;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        margin-bottom:14px;
                    "
                >
                    <span
                        style="
                            color:#809ab8;
                            font-size:11px;
                        "
                    >
                        Receiver
                    </span>

                    <strong
                        style="
                            font-size:12px;
                            text-align:right;
                        "
                    >
                        ${escapeHtml(
                            transaction.receiverName
                        )}
                    </strong>
                </div>

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        margin-bottom:14px;
                    "
                >
                    <span
                        style="
                            color:#809ab8;
                            font-size:11px;
                        "
                    >
                        UPI ID
                    </span>

                    <strong
                        style="
                            font-size:12px;
                            text-align:right;
                        "
                    >
                        ${escapeHtml(
                            transaction.receiverUpiId
                        )}
                    </strong>
                </div>

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        margin-bottom:14px;
                    "
                >
                    <span
                        style="
                            color:#809ab8;
                            font-size:11px;
                        "
                    >
                        Amount
                    </span>

                    <strong
                        style="
                            font-size:16px;
                            color:#6ce3ad;
                        "
                    >
                        ${formatMoney(
                            transaction.amount
                        )}
                    </strong>
                </div>

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        margin-bottom:14px;
                    "
                >
                    <span
                        style="
                            color:#809ab8;
                            font-size:11px;
                        "
                    >
                        Risk Score
                    </span>

                    <strong
                        style="
                            font-size:13px;
                        "
                    >
                        ${transaction.riskScore}/100
                    </strong>
                </div>

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                    "
                >
                    <span
                        style="
                            color:#809ab8;
                            font-size:11px;
                        "
                    >
                        Transaction ID
                    </span>

                    <strong
                        style="
                            font-size:11px;
                        "
                    >
                        ${escapeHtml(
                            transaction.transactionId
                        )}
                    </strong>
                </div>

            </div>

            <div
                style="
                    display:flex;
                    gap:10px;
                    margin-top:22px;
                "
            >

                <button
                    id="successScanAgain"
                    class="secondary-btn"
                    style="
                        flex:1;
                    "
                >
                    <i class="fa-solid fa-qrcode"></i>
                    Scan Another
                </button>

                <button
                    id="successDashboard"
                    class="analyze-btn"
                    style="
                        flex:1;
                    "
                >
                    <i class="fa-solid fa-house"></i>
                    Dashboard
                </button>

            </div>

        </div>
    `;

    $("successScanAgain")?.addEventListener(
        "click",
        () => {
            window.location.reload();
        }
    );

    $("successDashboard")?.addEventListener(
        "click",
        () => {
            window.location.href =
                "dashboard.html";
        }
    );
}

// ======================================================
// RESET PAGE
// ======================================================

function resetPage() {
    stopCamera();

    $("analysisLayout")?.classList.add(
        "hidden"
    );

    $("emptyState")?.classList.remove(
        "hidden"
    );

    $("actionCard")?.classList.add(
        "hidden"
    );

    $("blockBtn")?.classList.add(
        "hidden"
    );

    $("proceedBtn")?.classList.add(
        "hidden"
    );

    currentPayment = null;
    currentAnalysis = null;

    clearError();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ======================================================
// BUTTON EVENTS
// ======================================================

// Scan QR
$("scanBtn")?.addEventListener(
    "click",
    startCamera
);

// Upload QR
$("uploadBtn")?.addEventListener(
    "click",
    () => {
        $("qrFile")?.click();
    }
);

// Upload image
$("qrFile")?.addEventListener(
    "change",
    async (event) => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        clearError();

        try {
            showToast(
                "Reading QR image..."
            );

            const payload =
                await decodeImage(
                    file
                );

            const payment =
                parseUpiPayload(
                    payload
                );

            populatePayment(
                payment,
                "Uploaded image"
            );

            showToast(
                "QR decoded successfully."
            );
        } catch (error) {
            console.error(
                "QR upload error:",
                error
            );

            showError(
                error.message ||
                "Unable to decode the QR image."
            );
        } finally {
            event.target.value =
                "";
        }
    }
);

// Demo
$("demoBtn")?.addEventListener(
    "click",
    runDemo
);

// Close camera
$("closeCamera")?.addEventListener(
    "click",
    stopCamera
);

// Close demo
$("closeDemo")?.addEventListener(
    "click",
    () => {
        $("demoModal")?.classList.add(
            "hidden"
        );
    }
);

// Use demo
$("useDemoBtn")?.addEventListener(
    "click",
    () => {
        $("demoModal")?.classList.add(
            "hidden"
        );

        try {
            const payment =
                parseUpiPayload(
                    demoPayload
                );

            populatePayment(
                payment,
                "Try Demo"
            );
        } catch (error) {
            showError(
                error.message
            );
        }
    }
);

// Analyze
$("analyzeBtn")?.addEventListener(
    "click",
    analyzePayment
);

// Rescan
$("rescanBtn")?.addEventListener(
    "click",
    resetPage
);

// Don't Pay
$("blockBtn")?.addEventListener(
    "click",
    () => {
        showToast(
            "Payment remains paused. No money was sent."
        );
    }
);

// ======================================================
// CONTINUE TO PAYMENT
// SAVE INTO POSTGRESQL
// ======================================================

$("proceedBtn")?.addEventListener(
    "click",
    async () => {

        clearError();

        // --------------------------------------------------
        // GET PAYMENT DETAILS
        // --------------------------------------------------

        const amount =
            Number(
                $("payAmount")?.value
            );

        const upi =
            currentPayment?.upiId ||
            "";

        const receiverName =
            currentPayment?.name ||
            upi.split("@")[0];

        // --------------------------------------------------
        // VALIDATE
        // --------------------------------------------------

        if (
            !upi ||
            !Number.isFinite(
                amount
            ) ||
            amount <= 0
        ) {
            showError(
                "Please enter a valid receiver and payment amount."
            );

            return;
        }

        // Payment must be analyzed first
        if (!currentAnalysis) {
            showError(
                "Please analyze the payment before continuing."
            );

            return;
        }

        // --------------------------------------------------
        // RISK LEVEL
        // --------------------------------------------------

        let riskLevel =
            String(
                currentAnalysis.riskLevel ||
                "medium"
            ).toLowerCase();

        if (
            riskLevel ===
                "high-risk" ||
            riskLevel ===
                "danger" ||
            riskLevel ===
                "dangerous"
        ) {
            riskLevel =
                "high";
        }

        if (
            riskLevel ===
            "low"
        ) {
            riskLevel =
                "safe";
        }

        // --------------------------------------------------
        // BLOCK HIGH RISK
        // --------------------------------------------------

        if (
            riskLevel ===
            "high"
        ) {
            showError(
                "This payment has been marked high risk. Please do not proceed."
            );

            return;
        }

        // --------------------------------------------------
        // AUTH TOKEN
        // --------------------------------------------------

        const authToken =
            getAuthToken();

        if (!authToken) {
            showError(
                "Please log in before making a payment."
            );

            return;
        }

        // --------------------------------------------------
        // BUTTON
        // --------------------------------------------------

        const button =
            $("proceedBtn");

        if (!button) {
            return;
        }

        const originalText =
            button.innerHTML;

        button.disabled =
            true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Saving Payment...';

        try {

            // --------------------------------------------------
            // SAVE TO POSTGRESQL
            // --------------------------------------------------

            console.log(
                "Saving fake payment to PostgreSQL..."
            );

            const response =
                await fetch(
                    `${API_BASE_URL}/api/transactions/fake-payment`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json",

                            "Authorization":
                                `Bearer ${authToken}`
                        },

                        body:
                            JSON.stringify({
                                receiverName,

                                receiverUpiId:
                                    upi,

                                amount,

                                paymentMethod:
                                    "Scan & Pay",

                                riskLevel,

                                riskReason:
                                    currentAnalysis.summary ||
                                    "Payment analyzed by UPI Guardian.",

                                receiverCategory:
                                    "person"
                            })
                    }
                );

            // --------------------------------------------------
            // READ RESPONSE
            // --------------------------------------------------

            const responseText =
                await response.text();

            let data =
                null;

            if (
                responseText &&
                responseText.trim()
            ) {
                try {
                    data =
                        JSON.parse(
                            responseText
                        );
                } catch (error) {
                    console.error(
                        "Invalid payment response:",
                        responseText
                    );

                    throw new Error(
                        `Backend returned an invalid response (HTTP ${response.status}).`
                    );
                }
            }

            // --------------------------------------------------
            // SESSION EXPIRED
            // --------------------------------------------------

            if (
                response.status ===
                401
            ) {
                localStorage.removeItem(
                    "upiGuardianToken"
                );

                localStorage.removeItem(
                    "token"
                );

                localStorage.removeItem(
                    "accessToken"
                );

                throw new Error(
                    "Your session has expired. Please log in again."
                );
            }

            // --------------------------------------------------
            // SERVER ERROR
            // --------------------------------------------------

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Payment could not be saved (HTTP ${response.status}).`
                );
            }

            // --------------------------------------------------
            // VERIFY DATABASE RESPONSE
            // --------------------------------------------------

            if (
                !data ||
                !data.transaction
            ) {
                console.error(
                    "Unexpected payment response:",
                    data
                );

                throw new Error(
                    "The payment was not saved correctly."
                );
            }

            console.log(
                "✅ PAYMENT SAVED TO POSTGRESQL:",
                data.transaction
            );

            // --------------------------------------------------
            // DATABASE TRANSACTION
            // --------------------------------------------------

            const savedTransaction =
                data.transaction;

            const fakeTransaction = {

                transactionId:
                    savedTransaction.transaction_reference,

                receiverName:
                    savedTransaction.receiver_name,

                receiverUpiId:
                    savedTransaction.receiver_upi_id,

                amount:
                    Number(
                        savedTransaction.amount
                    ),

                paymentNote:
                    currentPayment.note ||
                    "",

                riskScore:
                    Number(
                        currentAnalysis.overallScore
                    ) || 0,

                riskLevel:
                    savedTransaction.risk_level,

                paymentMethod:
                    savedTransaction.payment_method ||
                    "Scan & Pay",

                status:
                    savedTransaction.transaction_status,

                isDemo:
                    true,

                createdAt:
                    savedTransaction.transaction_time
            };

            // --------------------------------------------------
            // OPTIONAL LOCAL COPY
            // --------------------------------------------------

            let transactions = [];

            try {
                transactions =
                    JSON.parse(
                        localStorage.getItem(
                            "upiGuardianDemoTransactions"
                        ) ||
                        "[]"
                    );

                if (
                    !Array.isArray(
                        transactions
                    )
                ) {
                    transactions =
                        [];
                }
            } catch (error) {
                transactions =
                    [];
            }

            transactions.unshift(
                fakeTransaction
            );

            localStorage.setItem(
                "upiGuardianDemoTransactions",
                JSON.stringify(
                    transactions.slice(
                        0,
                        50
                    )
                )
            );

            localStorage.setItem(
                "upiGuardianLastFakePayment",
                JSON.stringify(
                    fakeTransaction
                )
            );

            // --------------------------------------------------
            // SHOW SUCCESS
            // --------------------------------------------------

            showFakePaymentSuccess(
                fakeTransaction
            );

            showToast(
                "Payment saved successfully."
            );

        } catch (error) {

            console.error(
                "❌ Fake payment error:",
                error
            );

            showError(
                error.message ||
                "The demo payment could not be completed."
            );

        } finally {

            button.disabled =
                false;

            button.innerHTML =
                originalText;
        }
    }
);

// ======================================================
// STOP CAMERA BEFORE LEAVING
// ======================================================

window.addEventListener(
    "beforeunload",
    stopCamera
);

// ======================================================
// INITIAL LOAD
// ======================================================

console.log(
    "🛡️ UPI Guardian — Scan & Pay loaded"
);

console.log(
    "Risk API:",
    `${API_BASE_URL}/api/risk/analyze`
);

console.log(
    "Transaction API:",
    `${API_BASE_URL}/api/transactions/fake-payment`
);
