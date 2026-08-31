/* =========================================
   UPI GUARDIAN
   SELECT SUSPICIOUS TRANSACTION
   Dynamic PostgreSQL Version
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       API CONFIGURATION
    ========================================= */

    const API_BASE_URL =
        window.location.port === "5000"
            ? ""
            : "http://localhost:5000";


    /* =========================================
       DOM ELEMENTS
    ========================================= */

    const transactionsContainer =
        document.getElementById(
            "transactionsContainer"
        );

    const transactionsLoading =
        document.getElementById(
            "transactionsLoading"
        );

    const transactionsError =
        document.getElementById(
            "transactionsError"
        );

    const transactionsEmpty =
        document.getElementById(
            "transactionsEmpty"
        );

    const retryTransactionsBtn =
        document.getElementById(
            "retryTransactionsBtn"
        );

    const selectedText =
        document.getElementById(
            "selectedText"
        );

    const continueBtn =
        document.getElementById(
            "continueBtn"
        );


    /* =========================================
       AUTH TOKEN
    ========================================= */

    const token =
        localStorage.getItem(
            "upiGuardianToken"
        );


    if (!token) {

        console.error(
            "❌ Authentication token not found."
        );

        showError(
            "Your session has expired. Please login again."
        );

        return;

    }


    /* =========================================
       STATE
    ========================================= */

    let transactions = [];

    let selectedTransaction = null;


    /* =========================================
       FORMAT CURRENCY
    ========================================= */

    function formatCurrency(amount) {

        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(
                numericAmount
            )
        ) {
            return "₹ 0";
        }

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        ).format(numericAmount);

    }


    /* =========================================
       FORMAT DATE
    ========================================= */

    function formatDate(dateValue) {

        if (!dateValue) {
            return "Date unavailable";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "Date unavailable";
        }

        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ) +
        ", " +
        date.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =========================================
       RISK LABEL
    ========================================= */

    function getRiskLabel(riskLevel) {

        const risk =
            String(
                riskLevel || "medium"
            ).toLowerCase();


        if (risk === "high") {
            return "HIGH RISK";
        }


        if (risk === "safe") {
            return "SAFE";
        }


        return "MEDIUM RISK";

    }


    /* =========================================
       RISK CLASS
    ========================================= */

    function getRiskClass(riskLevel) {

        const risk =
            String(
                riskLevel || "medium"
            ).toLowerCase();


        if (
            ["high", "medium", "safe"]
            .includes(risk)
        ) {
            return risk;
        }


        return "medium";

    }


    /* =========================================
       RISK ICON
    ========================================= */

    function getRiskIcon(riskLevel) {

        const risk =
            String(
                riskLevel || "medium"
            ).toLowerCase();


        if (risk === "high") {

            return `
                <i class="fa-solid fa-triangle-exclamation"></i>
            `;

        }


        if (risk === "safe") {

            return `
                <i class="fa-regular fa-circle-check"></i>
            `;

        }


        return `
            <i class="fa-solid fa-circle-exclamation"></i>
        `;

    }


    /* =========================================
       TRANSACTION ICON
    ========================================= */

    function getTransactionIcon(transaction) {

        const category =
            String(
                transaction.receiver_category || ""
            ).toLowerCase();


        const name =
            String(
                transaction.receiver_name || ""
            ).toLowerCase();


        if (
            category.includes("food") ||
            name.includes("food") ||
            name.includes("delivery") ||
            name.includes("restaurant")
        ) {

            return {
                icon:
                    "fa-bag-shopping",
                className:
                    "food-icon"
            };

        }


        if (
            category.includes("store") ||
            category.includes("merchant") ||
            name.includes("store") ||
            name.includes("shop")
        ) {

            return {
                icon:
                    "fa-store",
                className:
                    "store-icon"
            };

        }


        if (
            category.includes("person") ||
            category.includes("individual")
        ) {

            return {
                icon:
                    "fa-user",
                className:
                    "person-icon"
            };

        }


        return {

            icon:
                "fa-gift",

            className:
                "gift-icon"

        };

    }


    /* =========================================
       PAYMENT METHOD DISPLAY
    ========================================= */

    function getPaymentMethod(transaction) {

        const paymentMethod =
            transaction.payment_method ||
            "UPI";

        const bankName =
            transaction.bank_name ||
            "";

        if (bankName) {

            return `${paymentMethod} • ${bankName}`;

        }

        return paymentMethod;

    }


    /* =========================================
       SHOW / HIDE STATES
    ========================================= */

    function showLoading() {

        if (transactionsLoading) {

            transactionsLoading.style.display =
                "flex";

        }

        if (transactionsError) {

            transactionsError.style.display =
                "none";

        }

        if (transactionsEmpty) {

            transactionsEmpty.style.display =
                "none";

        }

    }


    function showError(message) {

        if (transactionsLoading) {

            transactionsLoading.style.display =
                "none";

        }

        if (transactionsEmpty) {

            transactionsEmpty.style.display =
                "none";

        }

        if (transactionsError) {

            transactionsError.style.display =
                "flex";

            const errorText =
                transactionsError.querySelector(
                    "span"
                );

            if (errorText) {

                errorText.textContent =
                    message;

            }

        }

    }


    function showEmpty() {

        if (transactionsLoading) {

            transactionsLoading.style.display =
                "none";

        }

        if (transactionsError) {

            transactionsError.style.display =
                "none";

        }

        if (transactionsEmpty) {

            transactionsEmpty.style.display =
                "flex";

        }

    }


    function hideStates() {

        if (transactionsLoading) {

            transactionsLoading.style.display =
                "none";

        }

        if (transactionsError) {

            transactionsError.style.display =
                "none";

        }

        if (transactionsEmpty) {

            transactionsEmpty.style.display =
                "none";

        }

    }


    /* =========================================
       LOAD TRANSACTIONS
    ========================================= */

    async function loadTransactions() {

        showLoading();


        if (continueBtn) {

            continueBtn.disabled =
                true;

        }


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/transactions?limit=20`,
                    {
                        method: "GET",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,

                            Accept:
                                "application/json"
                        }
                    }
                );


            let data = null;


            try {

                data =
                    await response.json();

            } catch (jsonError) {

                console.error(
                    "❌ Invalid server response:",
                    jsonError
                );

            }


            /* =====================================
               AUTH FAILURE
            ===================================== */

            if (
                response.status === 401 ||
                response.status === 403
            ) {

                localStorage.removeItem(
                    "upiGuardianToken"
                );

                showError(
                    "Your session has expired. Please login again."
                );

                return;

            }


            /* =====================================
               OTHER SERVER ERRORS
            ===================================== */

            if (!response.ok) {

                throw new Error(
                    data?.message ||
                    data?.error ||
                    `Server returned ${response.status}`
                );

            }


            /* =====================================
               VALIDATE RESPONSE
            ===================================== */

            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.message ||
                    "Unable to load transactions."
                );

            }


            transactions =
                Array.isArray(
                    data.transactions
                )
                    ? data.transactions
                    : [];


            console.log(
                "✅ Transactions loaded:",
                transactions
            );


            /* =====================================
               EMPTY
            ===================================== */

            if (
                transactions.length === 0
            ) {

                selectedTransaction =
                    null;

                updateSelectedText();

                showEmpty();

                return;

            }


            hideStates();


            /* =====================================
               RENDER TRANSACTIONS
            ===================================== */

            renderTransactions(
                transactions
            );


            /* =====================================
               RESTORE PREVIOUS SELECTION
            ===================================== */

            restoreSelectedTransaction();


        } catch (error) {

            console.error(
                "❌ Loading transactions failed:",
                error
            );


            showError(
                error.message ||
                "Unable to load transactions."
            );

        }

    }


    /* =========================================
       RENDER TRANSACTIONS
    ========================================= */

    function renderTransactions(
        transactionList
    ) {

        if (!transactionsContainer) {

            console.error(
                "❌ transactionsContainer not found."
            );

            return;

        }


        const existingCards =
            transactionsContainer.querySelectorAll(
                ".transaction-card"
            );


        existingCards.forEach(
            card => {

                card.remove();

            }
        );


        transactionList.forEach(
            transaction => {

                const card =
                    createTransactionCard(
                        transaction
                    );


                transactionsContainer.appendChild(
                    card
                );

            }
        );

    }


    /* =========================================
       CREATE TRANSACTION CARD
    ========================================= */

    function createTransactionCard(
        transaction
    ) {

        const card =
            document.createElement(
                "div"
            );


        const risk =
            getRiskClass(
                transaction.risk_level
            );


        const riskLabel =
            getRiskLabel(
                transaction.risk_level
            );


        const iconData =
            getTransactionIcon(
                transaction
            );


        /*
         * IMPORTANT:
         *
         * We DO NOT automatically select
         * the first transaction here.
         *
         * Selection is handled separately
         * by restoreSelectedTransaction().
         */

        card.className =
            "transaction-card";


        /* =====================================
           DATABASE ID
        ===================================== */

        card.dataset.id =
            String(
                transaction.id
            );


        /* =====================================
           BASIC TRANSACTION DATA
        ===================================== */

        card.dataset.name =
            transaction.receiver_name ||
            "Unknown Receiver";


        card.dataset.amount =
            String(
                transaction.amount || 0
            );


        card.dataset.risk =
            riskLabel;


        card.dataset.reference =
            transaction.transaction_reference ||
            "";


        card.dataset.upiId =
            transaction.receiver_upi_id ||
            "";


        card.dataset.paymentMethod =
            transaction.payment_method ||
            "UPI";


        card.dataset.bankName =
            transaction.bank_name ||
            "";


        card.dataset.transactionTime =
            transaction.transaction_time ||
            "";


        card.innerHTML = `

            <div class="transaction-main">

                <div
                    class="transaction-icon ${iconData.className}"
                >

                    <i
                        class="fa-solid ${iconData.icon}"
                    ></i>

                </div>


                <div class="transaction-info">

                    <h3>
                        ${escapeHtml(
                            transaction.receiver_name ||
                            "Unknown Receiver"
                        )}
                    </h3>

                    <p>

                        <i
                            class="fa-regular fa-calendar"
                        ></i>

                        ${escapeHtml(
                            formatDate(
                                transaction.transaction_time
                            )
                        )}

                    </p>

                </div>

            </div>


            <div class="transaction-detail">

                <span>

                    <i
                        class="fa-solid fa-hashtag"
                    ></i>

                    Transaction ID

                </span>

                <strong>
                    ${escapeHtml(
                        transaction.transaction_reference ||
                        `#${transaction.id}`
                    )}
                </strong>

            </div>


            <div class="transaction-detail">

                <span>

                    <i
                        class="fa-solid fa-wallet"
                    ></i>

                    Payment Method

                </span>

                <strong>
                    ${escapeHtml(
                        getPaymentMethod(
                            transaction
                        )
                    )}
                </strong>

            </div>


            <div class="amount">

                ${escapeHtml(
                    formatCurrency(
                        transaction.amount
                    )
                )}

            </div>


            <div class="risk ${risk}">

                ${getRiskIcon(
                    transaction.risk_level
                )}

                ${escapeHtml(
                    riskLabel
                )}

            </div>


            <button
                class="select-btn"
                type="button"
            >
                Select
            </button>


            <div class="radio">

                <i
                    class="fa-solid fa-check"
                ></i>

            </div>

        `;


        /* =====================================
           CARD CLICK
        ===================================== */

        card.addEventListener(
            "click",
            function () {

                selectTransaction(
                    transaction,
                    card
                );

            }
        );


        /* =====================================
           SELECT BUTTON
        ===================================== */

        const selectButton =
            card.querySelector(
                ".select-btn"
            );


        if (selectButton) {

            selectButton.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    selectTransaction(
                        transaction,
                        card
                    );

                }
            );

        }


        return card;

    }


    /* =========================================
       SELECT TRANSACTION
    ========================================= */

    function selectTransaction(
        transaction,
        card
    ) {

        if (
            !transaction ||
            !transaction.id
        ) {

            console.error(
                "❌ Cannot select transaction without an ID:",
                transaction
            );

            return;

        }


        /* =====================================
           REMOVE OLD SELECTION
        ===================================== */

        const allCards =
            transactionsContainer.querySelectorAll(
                ".transaction-card"
            );


        allCards.forEach(
            currentCard => {

                currentCard.classList.remove(
                    "selected"
                );


                const radio =
                    currentCard.querySelector(
                        ".radio"
                    );


                if (radio) {

                    radio.classList.remove(
                        "selected-radio"
                    );

                }

            }
        );


        /* =====================================
           SELECT CURRENT CARD
        ===================================== */

        card.classList.add(
            "selected"
        );


        const radio =
            card.querySelector(
                ".radio"
            );


        if (radio) {

            radio.classList.add(
                "selected-radio"
            );

        }


        /* =====================================
           UPDATE STATE
        ===================================== */

        selectedTransaction =
            transaction;


        /* =====================================
           SAVE TO LOCAL STORAGE
        ===================================== */

        saveSelectedTransaction(
            transaction
        );


        /* =====================================
           UPDATE TEXT
        ===================================== */

        updateSelectedText();


        /* =====================================
           ENABLE CONTINUE
        ===================================== */

        if (continueBtn) {

            continueBtn.disabled =
                false;

        }


        console.log(
            "✅ Transaction selected and saved:",
            transaction
        );

    }


    /* =========================================
       SAVE SELECTED TRANSACTION
    ========================================= */

    function saveSelectedTransaction(
        transaction
    ) {

        const selectedData = {

            /*
             * PostgreSQL transaction ID
             */

            id:
                transaction.id,


            /*
             * Receiver
             */

            name:
                transaction.receiver_name ||
                "",


            /*
             * Amount
             */

            amount:
                String(
                    transaction.amount ?? ""
                ),


            /*
             * Risk
             */

            risk:
                getRiskLabel(
                    transaction.risk_level
                ),


            riskLevel:
                transaction.risk_level ||
                "",


            /*
             * Transaction reference
             */

            reference:
                transaction.transaction_reference ||
                "",


            /*
             * Receiver UPI ID
             */

            upiId:
                transaction.receiver_upi_id ||
                "",


            /*
             * Payment method
             */

            paymentMethod:
                transaction.payment_method ||
                "UPI",


            /*
             * Bank
             */

            bankName:
                transaction.bank_name ||
                "",


            /*
             * Transaction time
             */

            transactionTime:
                transaction.transaction_time ||
                "",


            /*
             * Transaction status
             */

            transactionStatus:
                transaction.transaction_status ||
                "",


            /*
             * Risk reason
             */

            riskReason:
                transaction.risk_reason ||
                "",


            /*
             * Receiver category
             */

            receiverCategory:
                transaction.receiver_category ||
                "person"

        };


        /* =====================================
           MAIN TRANSACTION OBJECT
        ===================================== */

        localStorage.setItem(
            "selectedTransaction",
            JSON.stringify(
                selectedData
            )
        );


        /* =====================================
           TRANSACTION ID
        ===================================== */

        localStorage.setItem(
            "selectedTransactionId",
            String(
                transaction.id
            )
        );


        console.log(
            "💾 selectedTransaction:",
            localStorage.getItem(
                "selectedTransaction"
            )
        );


        console.log(
            "💾 selectedTransactionId:",
            localStorage.getItem(
                "selectedTransactionId"
            )
        );

    }


    /* =========================================
       RESTORE PREVIOUS SELECTION
    ========================================= */

    function restoreSelectedTransaction() {

        const savedId =
            localStorage.getItem(
                "selectedTransactionId"
            );


        /*
         * Nothing previously selected.
         *
         * Do NOT automatically select the first
         * transaction.
         */

        if (!savedId) {

            selectedTransaction =
                null;

            updateSelectedText();


            if (continueBtn) {

                continueBtn.disabled =
                    true;

            }


            return;

        }


        /* =====================================
           FIND TRANSACTION
        ===================================== */

        const savedTransaction =
            transactions.find(
                transaction =>
                    String(
                        transaction.id
                    ) ===
                    String(
                        savedId
                    )
            );


        /*
         * Saved transaction no longer exists.
         */

        if (!savedTransaction) {

            console.warn(
                "⚠️ Previously selected transaction was not found."
            );


            localStorage.removeItem(
                "selectedTransaction"
            );


            localStorage.removeItem(
                "selectedTransactionId"
            );


            selectedTransaction =
                null;


            updateSelectedText();


            if (continueBtn) {

                continueBtn.disabled =
                    true;

            }


            return;

        }


        /* =====================================
           FIND CARD
        ===================================== */

        const cards =
            transactionsContainer.querySelectorAll(
                ".transaction-card"
            );


        let matchingCard = null;


        cards.forEach(
            card => {

                if (
                    String(
                        card.dataset.id
                    ) ===
                    String(
                        savedTransaction.id
                    )
                ) {

                    matchingCard =
                        card;

                }

            }
        );


        if (!matchingCard) {

            console.warn(
                "⚠️ Matching transaction card not found."
            );

            return;

        }


        /* =====================================
           RESTORE SELECTION
        ===================================== */

        selectedTransaction =
            savedTransaction;


        matchingCard.classList.add(
            "selected"
        );


        const radio =
            matchingCard.querySelector(
                ".radio"
            );


        if (radio) {

            radio.classList.add(
                "selected-radio"
            );

        }


        updateSelectedText();


        if (continueBtn) {

            continueBtn.disabled =
                false;

        }


        /*
         * Re-save the latest version of the
         * transaction returned by PostgreSQL.
         */

        saveSelectedTransaction(
            savedTransaction
        );


        console.log(
            "🔄 Previous transaction restored:",
            savedTransaction
        );

    }


    /* =========================================
       UPDATE SELECTED TEXT
    ========================================= */

    function updateSelectedText() {

        if (!selectedText) {
            return;
        }


        if (!selectedTransaction) {

            selectedText.textContent =
                "0 transactions selected";

            return;

        }


        selectedText.textContent =
            "1 transaction selected";

    }


    /* =========================================
       CONTINUE BUTTON
    ========================================= */

    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            function () {

                if (
                    !selectedTransaction
                ) {

                    alert(
                        "Please select a transaction first."
                    );

                    return;

                }


                if (
                    !selectedTransaction.id
                ) {

                    console.error(
                        "❌ Selected transaction has no database ID:",
                        selectedTransaction
                    );


                    alert(
                        "Unable to identify the selected transaction."
                    );

                    return;

                }


                /*
                 * Save one final time before
                 * navigating to Immediate Action.
                 */

                saveSelectedTransaction(
                    selectedTransaction
                );


                console.log(
                    "➡️ Opening Immediate Action for:",
                    selectedTransaction
                );


                window.location.href =
                    "immediate-action.html";

            }
        );

    }


    /* =========================================
       RETRY
    ========================================= */

    if (retryTransactionsBtn) {

        retryTransactionsBtn.addEventListener(
            "click",
            function () {

                loadTransactions();

            }
        );

    }


    /* =========================================
       HTML ESCAPE
    ========================================= */

    function escapeHtml(value) {

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


    /* =========================================
       INITIALIZE
    ========================================= */

    loadTransactions();

});
