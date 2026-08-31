/* =========================================
   UPI GUARDIAN
   IMMEDIATE ACTION PAGE
   Dynamic Selected Transaction
========================================= */


/* =========================================
   DOM ELEMENTS
========================================= */

const checkboxes = document.querySelectorAll(".step-checkbox");
const steps = document.querySelectorAll(".step");

const continueButton = document.getElementById("continueButton");
const backButton = document.getElementById("backButton");

const progressPercent = document.getElementById("progressPercent");
const currentStep = document.getElementById("currentStep");


/* =========================================
   TRANSACTION ELEMENTS
========================================= */

const transactionCard =
    document.getElementById("selectedTransactionCard");

const transactionName =
    document.getElementById("transactionName");

const transactionId =
    document.getElementById("transactionId");

const transactionAmount =
    document.getElementById("transactionAmount");

const transactionRisk =
    document.getElementById("transactionRisk");

const transactionRiskText =
    document.getElementById("transactionRiskText");

const transactionRiskIcon =
    document.getElementById("transactionRiskIcon");

const transactionIcon =
    document.getElementById("transactionIcon");

const warningMessage =
    document.getElementById("warningMessage");


/* =========================================
   FORMAT AMOUNT
========================================= */

function formatAmount(amount) {

    if (
        amount === null ||
        amount === undefined ||
        amount === ""
    ) {
        return "₹0";
    }

    /*
     * Remove commas and currency symbols in case
     * the stored amount is something like:
     * "₹50,000" or "50,000"
     */
    const cleanedAmount =
        String(amount)
            .replace(/₹/g, "")
            .replace(/,/g, "")
            .trim();

    const numericAmount =
        Number(cleanedAmount);


    if (Number.isNaN(numericAmount)) {
        return `₹${amount}`;
    }


    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(numericAmount);
}


/* =========================================
   NORMALIZE RISK
========================================= */

function normalizeRisk(risk) {

    if (!risk) {
        return "MEDIUM";
    }

    const normalized =
        String(risk)
            .trim()
            .toUpperCase();


    /*
     * Support different possible values
     */

    if (
        normalized === "HIGH" ||
        normalized === "CRITICAL" ||
        normalized === "DANGER"
    ) {
        return "HIGH";
    }


    if (
        normalized === "LOW" ||
        normalized === "SAFE"
    ) {
        return "LOW";
    }


    return "MEDIUM";
}


/* =========================================
   RISK ICON
========================================= */

function getRiskIcon(risk) {

    if (risk === "HIGH") {

        return "fa-solid fa-triangle-exclamation";

    }


    if (risk === "LOW") {

        return "fa-solid fa-circle-check";

    }


    return "fa-solid fa-circle-exclamation";
}


/* =========================================
   TRANSACTION ICON
========================================= */

function getTransactionIcon(transaction) {

    const name =
        String(
            transaction.name || ""
        ).toLowerCase();

    const category =
        String(
            transaction.category ||
            transaction.receiverCategory ||
            ""
        ).toLowerCase();


    /*
     * Food / restaurant
     */

    if (
        name.includes("food") ||
        name.includes("restaurant") ||
        name.includes("swiggy") ||
        name.includes("zomato") ||
        category.includes("food")
    ) {
        return "fa-utensils";
    }


    /*
     * Shopping / store
     */

    if (
        name.includes("amazon") ||
        name.includes("flipkart") ||
        name.includes("shop") ||
        name.includes("store") ||
        category.includes("shopping") ||
        category.includes("merchant")
    ) {
        return "fa-store";
    }


    /*
     * Electricity / utility
     */

    if (
        name.includes("electricity") ||
        name.includes("power") ||
        name.includes("utility") ||
        category.includes("utility")
    ) {
        return "fa-bolt";
    }


    /*
     * Mobile / telecom
     */

    if (
        name.includes("airtel") ||
        name.includes("jio") ||
        name.includes("vi") ||
        name.includes("mobile") ||
        name.includes("recharge") ||
        category.includes("telecom")
    ) {
        return "fa-mobile-screen-button";
    }


    /*
     * Person
     */

    if (
        category.includes("person") ||
        category.includes("individual")
    ) {
        return "fa-user";
    }


    /*
     * Default
     */

    return "fa-gift";
}


/* =========================================
   LOAD SELECTED TRANSACTION
========================================= */

function loadSelectedTransaction() {

    const savedTransaction =
        localStorage.getItem("selectedTransaction");


    /* -----------------------------------------
       No transaction selected
    ----------------------------------------- */

    if (!savedTransaction) {

        console.warn(
            "UPI Guardian: No selected transaction found."
        );


        if (transactionName) {
            transactionName.textContent =
                "No transaction selected";
        }


        if (transactionId) {
            transactionId.textContent =
                "Transaction ID: --";
        }


        if (transactionAmount) {
            transactionAmount.textContent =
                "₹0";
        }


        if (transactionRiskText) {
            transactionRiskText.textContent =
                "--";
        }


        if (warningMessage) {
            warningMessage.textContent =
                "Please select a transaction before continuing.";
        }


        if (continueButton) {
            continueButton.disabled = true;
        }


        return;
    }


    let transaction;


    /* -----------------------------------------
       Parse transaction
    ----------------------------------------- */

    try {

        transaction =
            JSON.parse(savedTransaction);

    } catch (error) {

        console.error(
            "UPI Guardian: Could not read selected transaction.",
            error
        );


        if (transactionName) {
            transactionName.textContent =
                "Unable to load transaction";
        }


        if (transactionId) {
            transactionId.textContent =
                "Transaction ID: --";
        }


        if (transactionAmount) {
            transactionAmount.textContent =
                "₹0";
        }


        return;
    }


    console.log(
        "UPI Guardian: Selected transaction:",
        transaction
    );


    /* =========================================
       TRANSACTION NAME
    ========================================= */

    const name =
        transaction.name ||
        transaction.receiverName ||
        transaction.merchantName ||
        transaction.payee ||
        "Unknown Transaction";


    if (transactionName) {

        transactionName.textContent =
            name;

    }


    /* =========================================
       TRANSACTION ID
    ========================================= */

    const id =
        transaction.id ||
        transaction.transactionId ||
        transaction.reference ||
        transaction.txnId ||
        localStorage.getItem(
            "selectedTransactionId"
        );


    if (transactionId) {

        if (id) {

            transactionId.textContent =
                `Transaction ID: ${id}`;

        } else {

            transactionId.textContent =
                "Transaction ID: --";

        }

    }


    /* =========================================
       AMOUNT
    ========================================= */

    if (transactionAmount) {

        transactionAmount.textContent =
            formatAmount(
                transaction.amount
            );

    }


    /* =========================================
       RISK
    ========================================= */

    const risk =
        normalizeRisk(
            transaction.risk ||
            transaction.riskLevel
        );


    if (transactionRiskText) {

        transactionRiskText.textContent =
            risk;

    }


    /* =========================================
       RISK CLASS
    ========================================= */

    if (transactionRisk) {

        transactionRisk.classList.remove(
            "high",
            "medium",
            "low",
            "safe"
        );


        transactionRisk.classList.add(
            risk.toLowerCase()
        );

    }


    /* =========================================
       RISK ICON
    ========================================= */

    if (transactionRiskIcon) {

        transactionRiskIcon.className =
            getRiskIcon(risk);

    }


    /* =========================================
       TRANSACTION ICON
    ========================================= */

    if (transactionIcon) {

        transactionIcon.className =
            `fa-solid ${getTransactionIcon(transaction)}`;

    }


    /* =========================================
       WARNING MESSAGE
    ========================================= */

    if (warningMessage) {

        if (risk === "HIGH") {

            warningMessage.textContent =
                "This transaction looks highly suspicious. Take these steps immediately.";

        } else if (risk === "MEDIUM") {

            warningMessage.textContent =
                "This transaction may be suspicious. Review it carefully and take the recommended steps.";

        } else {

            warningMessage.textContent =
                "Review this transaction carefully and follow the recommended security steps.";

        }

    }

}


/* =========================================
   UPDATE PROGRESS
========================================= */

function updateProgress() {

    const totalSteps =
        checkboxes.length;


    let completedSteps = 0;


    checkboxes.forEach(
        (checkbox, index) => {

            const step =
                steps[index];


            if (checkbox.checked) {

                completedSteps++;


                if (step) {

                    step.classList.add(
                        "completed"
                    );

                }

            } else {

                if (step) {

                    step.classList.remove(
                        "completed"
                    );

                }

            }

        }
    );


    /* -----------------------------------------
       Percentage
    ----------------------------------------- */

    const percentage =
        totalSteps > 0
            ? Math.round(
                (completedSteps / totalSteps) * 100
            )
            : 0;


    if (progressPercent) {

        progressPercent.textContent =
            percentage;

    }


    /* -----------------------------------------
       Continue button
    ----------------------------------------- */

    if (continueButton) {

        continueButton.disabled =
            completedSteps !== totalSteps;

    }

}


/* =========================================
   CHECKBOX EVENTS
========================================= */

checkboxes.forEach(
    (checkbox) => {

        checkbox.addEventListener(
            "change",
            updateProgress
        );

    }
);


/* =========================================
   BACK BUTTON
========================================= */

if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "select-transaction.html";

        }
    );

}


/* =========================================
   CONTINUE BUTTON
========================================= */

if (continueButton) {

    continueButton.addEventListener(
        "click",
        function () {

            /*
             * Prevent continuing until all
             * immediate-action steps are completed.
             */

            if (continueButton.disabled) {
                return;
            }


            /*
             * Keep the selected transaction
             * available for the next page.
             */

            const selectedTransaction =
                localStorage.getItem(
                    "selectedTransaction"
                );


            if (selectedTransaction) {

                localStorage.setItem(
                    "recoveryTransaction",
                    selectedTransaction
                );

            }


            /*
             * Continue to next recovery step.
             */

            window.location.href =
                "trusted-person-recovery.html";

        }
    );

}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadSelectedTransaction();

        updateProgress();

    }
);
