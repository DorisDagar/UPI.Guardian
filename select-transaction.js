
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
               RENDER
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


        /*
         * Remove any dynamically generated
         * transaction cards.
         *
         * Keep loading/error/empty elements.
         */

        const existingCards =
            transactionsContainer.querySelectorAll(
                ".transaction-card"
            );


        existingCards.forEach(card => {

            card.remove();

        });


        transactionList.forEach(
            (transaction, index) => {

                const card =
                    createTransactionCard(
                        transaction,
                        index
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
        transaction,
        index
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


        const isSelected =
            index === 0;


        card.className =
            "transaction-card" +
            (
                isSelected
                    ? " selected"
                    : ""
            );


        /*
         * IMPORTANT:
         *
         * data-id is the REAL PostgreSQL
         * transactions.id.
         */

        card.dataset.id =
            String(
                transaction.id
            );


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


            <div class="radio ${
                isSelected
                    ? "selected-radio"
                    : ""
            }">

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
           SELECT BUTTON CLICK
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

        /*
         * Remove previous selection
         */

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


        /*
         * Add selection
         */

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


        /*
         * Save selected transaction
         */

        selectedTransaction =
            transaction;


        saveSelectedTransaction(
            transaction
        );


        /*
         * Update UI
         */

        updateSelectedText();


        if (continueBtn) {

            continueBtn.disabled =
                false;

        }


        console.log(
            "✅ Transaction selected:",
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

            id:
                transaction.id,

            name:
                transaction.receiver_name ||
                "",

            amount:
                String(
                    transaction.amount ?? ""
                ),

            risk:
                getRiskLabel(
                    transaction.risk_level
                ),

            riskLevel:
                transaction.risk_level ||
                "",

            reference:
                transaction.transaction_reference ||
                "",

            upiId:
                transaction.receiver_upi_id ||
                "",

            paymentMethod:
                transaction.payment_method ||
                "UPI",

            bankName:
                transaction.bank_name ||
                "",

            transactionTime:
                transaction.transaction_time ||
                "",

            transactionStatus:
                transaction.transaction_status ||
                "",

            riskReason:
                transaction.risk_reason ||
                "",

            receiverCategory:
                transaction.receiver_category ||
                "person"

        };


        localStorage.setItem(
            "selectedTransaction",
            JSON.stringify(
                selectedData
            )
        );


        /*
         * Also save transaction ID separately.
         *
         * This makes it easy for other Recovery
         * Mode pages to retrieve it.
         */

        localStorage.setItem(
            "selectedTransactionId",
            String(
                transaction.id
            )
        );


        console.log(
            "💾 Selected transaction saved:",
            selectedData
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
         * If nothing was previously selected,
         * select first transaction.
         */

        if (!savedId) {

            const firstCard =
                transactionsContainer.querySelector(
                    ".transaction-card"
                );


            if (
                firstCard &&
                transactions.length > 0
            ) {

                const firstTransaction =
                    transactions.find(
                        transaction =>
                            String(
                                transaction.id
                            ) ===
                            String(
                                firstCard.dataset.id
                            )
                    );


                if (firstTransaction) {

                    selectTransaction(
                        firstTransaction,
                        firstCard
                    );

                }

            }


            return;

        }


        /*
         * Find saved transaction in current list
         */

        const savedTransaction =
            transactions.find(
                transaction =>
                    String(
                        transaction.id
                    ) ===
                    String(savedId)
            );


        if (!savedTransaction) {

            /*
             * Saved transaction no longer exists.
             * Select first one instead.
             */

            localStorage.removeItem(
                "selectedTransactionId"
            );


            const firstCard =
                transactionsContainer.querySelector(
                    ".transaction-card"
                );


            if (
                firstCard &&
                transactions.length > 0
            ) {

                const firstTransaction =
                    transactions.find(
                        transaction =>
                            String(
                                transaction.id
                            ) ===
                            String(
                                firstCard.dataset.id
                            )
                    );


                if (firstTransaction) {

                    selectTransaction(
                        firstTransaction,
                        firstCard
                    );

                }

            }


            return;

        }


        /*
         * Find and activate matching card
         */

        const matchingCard =
            transactionsContainer.querySelector(
                `.transaction-card[data-id="${CSS.escape(
                    String(savedTransaction.id)
                )}"]`
            );


        if (matchingCard) {

            selectTransaction(
                savedTransaction,
                matchingCard
            );

        }

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


                /*
                 * Safety check:
                 * PostgreSQL ID must exist.
                 */

                if (
                    !selectedTransaction.id
                ) {

                    console.error(
                        "❌ Selected transaction is missing database ID:",
                        selectedTransaction
                    );


                    alert(
                        "Unable to identify the selected transaction."
                    );

                    return;

                }


                /*
                 * Save one final time.
                 */

                saveSelectedTransaction(
                    selectedTransaction
                );


                console.log(
                    "➡️ Continuing with transaction ID:",
                    selectedTransaction.id
                );


                /*
                 * Continue to Immediate Action
                 */

                window.location.href =
                    "immediate-action.html";

            }
        );

    }


    /* =========================================
       RETRY BUTTON
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

