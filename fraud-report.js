document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       TRUSTED PERSON DATA
    ====================================== */

    const trustedPerson =
        localStorage.getItem("trustedPerson");

    const trustedMobile =
        localStorage.getItem("trustedPersonWhatsapp");


    /* =====================================
       TRUSTED PERSON DISPLAY
    ====================================== */

    const personElement =
        document.getElementById("reportTrustedPerson");

    const mobileElement =
        document.getElementById("reportTrustedMobile");

    const relationshipElement =
        document.getElementById(
            "reportTrustedRelationship"
        );


    if (personElement) {

        personElement.textContent =
            trustedPerson || "Not added";

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

            "Mom": "Mother",
            "Dad": "Father",
            "Best Friend": "Best Friend"

        };

        relationshipElement.textContent =
            relationships[trustedPerson] || "-";

    }


    /* =====================================
       DOWNLOAD FRAUD REPORT
    ====================================== */

    const downloadBtn =
        document.getElementById("downloadBtn");


    if (downloadBtn) {

        downloadBtn.addEventListener("click", () => {

            window.print();

        });

    }


    /* =====================================
       SEND TO TRUSTED PERSON
    ====================================== */

    const notifyBtn =
        document.getElementById("notifyBtn");

    const toast =
        document.getElementById("toast");

    const toastText =
        document.getElementById("toastText");


    if (notifyBtn) {

        notifyBtn.addEventListener(
            "click",
            async () => {

                /* ==========================
                   CHECK TRUSTED PERSON
                ========================== */

                if (!trustedPerson) {

                    showToast(
                        "Please add a trusted person first."
                    );

                    return;

                }


                /* ==========================
                   CHECK WHATSAPP NUMBER
                ========================== */

                if (!trustedMobile) {

                    showToast(
                        "Trusted person's WhatsApp number not found."
                    );

                    return;

                }


                /* ==========================
                   BUTTON LOADING
                ========================== */

                notifyBtn.disabled = true;

                notifyBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Preparing Report...
                `;


                /* ==========================
                   GET REPORT DATA
                ========================== */

                const report = {

                    reportId:
                        getText(
                            ".report-info:nth-child(1) strong"
                        ),

                    date:
                        getText(
                            ".report-info:nth-child(2) strong"
                        ),

                    receiver:
                        getText(
                            ".detail-row:nth-child(1) strong"
                        ),

                    amount:
                        getText(
                            ".detail-row:nth-child(2) strong"
                        ),

                    transactionId:
                        getText(
                            ".detail-row:nth-child(3) strong"
                        ),

                    dateTime:
                        getText(
                            ".detail-row:nth-child(4) strong"
                        ),

                    paymentMethod:
                        getText(
                            ".detail-row:nth-child(5) strong"
                        ),

                    riskScore:
                        getText("#scoreNumber"),

                    riskLevel:
                        getText(".high-risk")

                };


                try {

                    /* ==========================
                       CALL BACKEND
                    ========================== */

                    const response =
                        await fetch(
                            "/api/whatsapp/open",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({

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


                    /* ==========================
                       CHECK RESPONSE
                    ========================== */

                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Unable to prepare WhatsApp message."
                        );

                    }


                    /* ==========================
                       OPEN WHATSAPP
                    ========================== */

                    showToast(
                        "Opening WhatsApp..."
                    );


                    /*
                     * This DOES NOT automatically
                     * send the message.
                     *
                     * WhatsApp opens with the
                     * message pre-filled.
                     *
                     * User presses SEND.
                     */

                    setTimeout(() => {

                        window.location.href =
                            data.chatUrl;

                    }, 500);


                } catch (error) {

                    console.error(
                        "WhatsApp error:",
                        error
                    );


                    showToast(
                        error.message ||
                        "Unable to open WhatsApp."
                    );


                    /* ==========================
                       RESTORE BUTTON
                    ========================== */

                    notifyBtn.disabled = false;

                    notifyBtn.innerHTML = `
                        <i class="fa-regular fa-paper-plane"></i>
                        Send to Trusted Person
                    `;

                }

            }
        );

    }


    /* =====================================
       GET TEXT FROM PAGE
    ====================================== */

    function getText(selector) {

        const element =
            document.querySelector(selector);

        if (!element) {

            return "";

        }

        return element.textContent.trim();

    }


    /* =====================================
       TOAST
    ====================================== */

    function showToast(message) {

        if (!toast || !toastText) {

            alert(message);

            return;

        }


        toastText.textContent =
            message;

        toast.classList.add("show");


        setTimeout(() => {

            toast.classList.remove("show");

        }, 3000);

    }

});