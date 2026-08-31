document.addEventListener("DOMContentLoaded", () => {


    /* =========================================
       DOM ELEMENTS
    ========================================= */

    const personCards =
        document.querySelectorAll(".person-card");

    const recoveryButton =
        document.getElementById("recoveryBtn");

    const continueButton =
        document.getElementById("continueBtn");

    const whatsappInput =
        document.getElementById("trustedWhatsapp");


    /* =========================================
       TRANSACTION ELEMENTS
    ========================================= */

    const transactionName =
        document.getElementById("transactionName");

    const transactionAmount =
        document.getElementById("transactionAmount");

    const transactionId =
        document.getElementById("transactionId");

    const transactionRisk =
        document.getElementById("transactionRisk");

    const transactionIcon =
        document.getElementById("transactionIcon");


    /* =========================================
       PROGRESS ELEMENTS
    ========================================= */

    const stepTitle =
        document.getElementById("stepTitle");

    const progressPercent =
        document.getElementById("progressPercent");


    /* =========================================
       STATE
    ========================================= */

    let selectedPerson = "Mom";


    /* =========================================
       RECOVERY PROGRESS
    ========================================= */

    if (stepTitle) {

        stepTitle.textContent =
            "Step 3 of 6";

    }


    if (progressPercent) {

        progressPercent.textContent =
            "50% Complete";

    }



    /* =========================================
       LOAD SELECTED TRANSACTION
    ========================================= */

    function loadSelectedTransaction() {


        let selectedTransaction = null;


        try {

            const storedTransaction =
                localStorage.getItem(
                    "selectedTransaction"
                );


            if (storedTransaction) {

                selectedTransaction =
                    JSON.parse(
                        storedTransaction
                    );

            }

        }

        catch (error) {

            console.error(
                "Error reading selected transaction:",
                error
            );

        }



        /* =====================================
           NO TRANSACTION FOUND
        ===================================== */

        if (!selectedTransaction) {


            console.warn(
                "No selected transaction found in localStorage."
            );


            if (transactionName) {

                transactionName.textContent =
                    "No transaction selected";

            }


            if (transactionAmount) {

                transactionAmount.textContent =
                    "₹0";

            }


            if (transactionId) {

                transactionId.textContent =
                    "—";

            }


            if (transactionRisk) {

                transactionRisk.textContent =
                    "UNKNOWN";

                transactionRisk.className =
                    "risk-unknown";

            }


            return;

        }



        console.log(
            "Selected transaction:",
            selectedTransaction
        );



        /* =====================================
           GET TRANSACTION NAME
        ===================================== */

        const name =
            selectedTransaction.name ||
            selectedTransaction.receiver_name ||
            selectedTransaction.receiver ||
            selectedTransaction.merchant ||
            "Unknown Receiver";



        /* =====================================
           GET AMOUNT
        ===================================== */

        const amount =
            Number(
                selectedTransaction.amount || 0
            );



        /* =====================================
           GET TRANSACTION ID
        ===================================== */

        const reference =
            selectedTransaction.reference ||
            selectedTransaction.transaction_reference ||
            selectedTransaction.id ||
            selectedTransaction.transactionId ||
            "—";



        /* =====================================
           GET RISK
        ===================================== */

        const rawRisk =
            selectedTransaction.riskLevel ||
            selectedTransaction.risk ||
            selectedTransaction.risk_level ||
            "unknown";



        /* =====================================
           UPDATE TRANSACTION NAME
        ===================================== */

        if (transactionName) {

            transactionName.textContent =
                name;

        }



        /* =====================================
           UPDATE AMOUNT
        ===================================== */

        if (transactionAmount) {


            transactionAmount.textContent =
                new Intl.NumberFormat(
                    "en-IN",
                    {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0
                    }
                ).format(amount);

        }



        /* =====================================
           UPDATE TRANSACTION ID
        ===================================== */

        if (transactionId) {

            transactionId.textContent =
                reference;

        }



        /* =====================================
           UPDATE RISK
        ===================================== */

        updateRisk(rawRisk);



        /* =====================================
           UPDATE TRANSACTION ICON
        ===================================== */

        updateTransactionIcon(
            selectedTransaction
        );

    }



    /* =========================================
       UPDATE RISK
    ========================================= */

    function updateRisk(rawRisk) {


        if (!transactionRisk) {
            return;
        }


        const risk =
            String(rawRisk)
                .toLowerCase()
                .trim();


        let riskText =
            "UNKNOWN";

        let riskClass =
            "risk-unknown";



        /* HIGH */

        if (
            risk === "high" ||
            risk === "high risk"
        ) {

            riskText =
                "HIGH";

            riskClass =
                "risk-high";

        }



        /* MEDIUM */

        else if (
            risk === "medium" ||
            risk === "medium risk"
        ) {

            riskText =
                "MEDIUM";

            riskClass =
                "risk-medium";

        }



        /* LOW */

        else if (
            risk === "low" ||
            risk === "low risk"
        ) {

            riskText =
                "LOW";

            riskClass =
                "risk-low";

        }



        /* SAFE */

        else if (
            risk === "safe"
        ) {

            riskText =
                "SAFE";

            riskClass =
                "risk-low";

        }



        transactionRisk.textContent =
            riskText;


        transactionRisk.className =
            riskClass;

    }



    /* =========================================
       UPDATE TRANSACTION ICON
    ========================================= */

    function updateTransactionIcon(
        transaction
    ) {


        if (!transactionIcon) {
            return;
        }


        const icon =
            transactionIcon.querySelector(
                ":scope > i"
            );


        if (!icon) {
            return;
        }


        const category =
            String(
                transaction.receiverCategory ||
                transaction.category ||
                transaction.type ||
                transaction.receiver_category ||
                ""
            )
            .toLowerCase();



        let iconClass =
            "fa-receipt";



        /* FOOD */

        if (
            category.includes("food") ||
            category.includes("restaurant") ||
            category.includes("dining")
        ) {

            iconClass =
                "fa-utensils";

        }



        /* SHOPPING */

        else if (
            category.includes("shop") ||
            category.includes("store") ||
            category.includes("merchant")
        ) {

            iconClass =
                "fa-bag-shopping";

        }



        /* PERSON */

        else if (
            category.includes("person") ||
            category.includes("individual") ||
            category.includes("friend")
        ) {

            iconClass =
                "fa-user";

        }



        /* REWARD / GIFT */

        else if (
            category.includes("gift") ||
            category.includes("reward")
        ) {

            iconClass =
                "fa-gift";

        }



        /* BILL */

        else if (
            category.includes("bill") ||
            category.includes("utility")
        ) {

            iconClass =
                "fa-file-invoice-dollar";

        }



        /* TRAVEL */

        else if (
            category.includes("travel") ||
            category.includes("flight") ||
            category.includes("hotel")
        ) {

            iconClass =
                "fa-plane";

        }



        icon.className =
            `fa-solid ${iconClass}`;

    }



    /* =========================================
       LOAD TRANSACTION IMMEDIATELY
    ========================================= */

    loadSelectedTransaction();



    /* =========================================
       TRUSTED PERSON SELECTION
    ========================================= */

    personCards.forEach(card => {


        card.addEventListener(
            "click",
            () => {


                /* Remove selection */

                personCards.forEach(item => {


                    item.classList.remove(
                        "selected"
                    );


                    const radio =
                        item.querySelector(
                            ".radio"
                        );


                    if (radio) {

                        radio.classList.remove(
                            "checked"
                        );

                        radio.innerHTML =
                            "";

                    }


                    const label =
                        item.querySelector(
                            ".selected-label"
                        );


                    if (label) {

                        label.remove();

                    }

                });



                /* Select clicked person */

                card.classList.add(
                    "selected"
                );



                const radio =
                    card.querySelector(
                        ".radio"
                    );


                if (radio) {

                    radio.classList.add(
                        "checked"
                    );

                    radio.innerHTML =
                        '<i class="fa-solid fa-check"></i>';

                }



                /* Add selected label */

                const personInfo =
                    card.querySelector(
                        ".person-info"
                    );


                if (personInfo) {


                    const label =
                        document.createElement(
                            "div"
                        );


                    label.className =
                        "selected-label";


                    label.textContent =
                        "Selected";


                    personInfo.appendChild(
                        label
                    );

                }



                /* Save selected person */

                selectedPerson =
                    card.dataset.person;

            }
        );

    });



    /* =========================================
       WHATSAPP NUMBER INPUT
    ========================================= */

    if (whatsappInput) {


        whatsappInput.addEventListener(
            "input",
            () => {


                /* Allow numbers only */

                whatsappInput.value =
                    whatsappInput.value.replace(
                        /\D/g,
                        ""
                    );


                /* Maximum 10 digits */

                whatsappInput.value =
                    whatsappInput.value.slice(
                        0,
                        10
                    );


                /* Remove invalid state */

                whatsappInput.classList.remove(
                    "invalid"
                );



                /* Valid number */

                if (
                    whatsappInput.value.length ===
                    10
                ) {

                    whatsappInput.classList.add(
                        "valid"
                    );

                }

                else {

                    whatsappInput.classList.remove(
                        "valid"
                    );

                }

            }
        );



        /* =====================================
           BLUR VALIDATION
        ===================================== */

        whatsappInput.addEventListener(
            "blur",
            () => {


                const value =
                    whatsappInput.value.trim();



                if (
                    value.length > 0 &&
                    value.length !== 10
                ) {

                    whatsappInput.classList.add(
                        "invalid"
                    );

                    whatsappInput.classList.remove(
                        "valid"
                    );

                }

                else {

                    whatsappInput.classList.remove(
                        "invalid"
                    );

                }

            }
        );

    }



    /* =========================================
       ADD TO RECOVERY
    ========================================= */

    recoveryButton.addEventListener(
        "click",
        () => {


            /* =================================
               CHECK TRUSTED PERSON
            ================================= */

            if (!selectedPerson) {

                alert(
                    "Please select a trusted person."
                );

                return;

            }



            /* =================================
               CHECK WHATSAPP NUMBER
            ================================= */

            const whatsapp =
                whatsappInput
                    ? whatsappInput.value.trim()
                    : "";



            if (
                whatsapp.length !== 10
            ) {


                if (whatsappInput) {

                    whatsappInput.classList.add(
                        "invalid"
                    );

                    whatsappInput.focus();

                }


                alert(
                    "Please enter a valid 10 digit WhatsApp number."
                );

                return;

            }



            /* =================================
               SAVE TRUSTED PERSON
            ================================= */

            localStorage.setItem(
                "trustedPerson",
                selectedPerson
            );



            /* =================================
               SAVE WHATSAPP NUMBER
            ================================= */

            localStorage.setItem(
                "trustedPersonWhatsapp",
                whatsapp
            );



            /* =================================
               SAVE COMPLETE DETAILS
            ================================= */

            localStorage.setItem(
                "trustedPersonDetails",
                JSON.stringify({

                    name:
                        selectedPerson,

                    whatsapp:
                        `+91${whatsapp}`

                })
            );



            /* =================================
               BUTTON SUCCESS STATE
            ================================= */

            recoveryButton.innerHTML = `
                <i class="fa-solid fa-circle-check"></i>
                <span>Added to Recovery</span>
            `;


            recoveryButton.disabled =
                true;



            /* =================================
               GO TO EVIDENCE LOCKER
            ================================= */

            setTimeout(
                () => {

                    window.location.href =
                        "evidence-locker.html";

                },
                600
            );

        }
    );



    /* =========================================
       CONTINUE WITHOUT TRUSTED PERSON
    ========================================= */

    continueButton.addEventListener(
        "click",
        () => {


            const confirmContinue =
                confirm(
                    "Continue without adding a trusted person?"
                );


            if (!confirmContinue) {
                return;
            }



            /* Button state */

            continueButton.textContent =
                "Continuing...";


            continueButton.style.color =
                "#7fbcff";



            /* =================================
               GO TO EVIDENCE LOCKER
            ================================= */

            setTimeout(
                () => {

                    window.location.href =
                        "evidence-locker.html";

                },
                600
            );

        }
    );

});
