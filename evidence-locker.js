/* =========================================================
   UPI GUARDIAN - EVIDENCE LOCKER
   Dynamic + PostgreSQL + File/Text Evidence
========================================================= */

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

        alert("Please login to continue.");

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
            "No transaction has been selected."
        );

        window.location.href =
            "select-transaction.html";

        return;
    }


    console.log(
        "🔐 Evidence Locker transaction:",
        selectedTransactionId
    );


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const uploadCard =
        document.getElementById("uploadCard");

    const browseBtn =
        document.getElementById("browseBtn");

    const fileInput =
        document.getElementById("fileInput");

    const textEvidenceBtn =
        document.getElementById(
            "textEvidenceBtn"
        );

    const evidenceModal =
        document.getElementById(
            "evidenceModal"
        );

    const closeEvidenceModal =
        document.getElementById(
            "closeEvidenceModal"
        );

    const cancelEvidenceBtn =
        document.getElementById(
            "cancelEvidenceBtn"
        );

    const saveTextEvidenceBtn =
        document.getElementById(
            "saveTextEvidenceBtn"
        );

    const textEvidenceType =
        document.getElementById(
            "textEvidenceType"
        );

    const evidenceContent =
        document.getElementById(
            "evidenceContent"
        );

    const evidenceDescription =
        document.getElementById(
            "evidenceDescription"
        );

    const backBtn =
        document.getElementById(
            "backBtn"
        );

    const continueBtn =
        document.getElementById(
            "continueBtn"
        );

    const categories =
        document.querySelectorAll(
            ".category"
        );


    /* =====================================================
       CATEGORY MAP
    ===================================================== */

    const categoryMap = {

        transaction_details:
            "Transaction Details",

        payment_screenshot:
            "Payment Screenshot",

        scam_message:
            "Scam Messages",

        suspicious_link:
            "Suspicious Links",

        qr_code_details:
            "QR Code Details",

        call_details:
            "Call Details",

        other:
            "Other Evidence"

    };


    /* =====================================================
       GET CATEGORY ELEMENT
    ===================================================== */

    function getCategoryElement(
        type
    ) {

        const categoryName =
            categoryMap[type];


        let matchedCategory = null;


        categories.forEach(
            category => {

                const label =
                    category.querySelector(
                        ":scope > span"
                    );


                if (
                    label &&
                    label.textContent.trim() ===
                    categoryName
                ) {

                    matchedCategory =
                        category;

                }

            }
        );


        return matchedCategory;

    }


    /* =====================================================
       GET COUNT ELEMENT
    ===================================================== */

    function getCategoryCountElement(
        type
    ) {

        const category =
            getCategoryElement(type);


        if (!category) {
            return null;
        }


        return category.querySelector(
            ":scope > b"
        );

    }


    /* =====================================================
       UPDATE CATEGORY COUNTS
    ===================================================== */

    function updateCategoryCounts(
        counts
    ) {

        Object.keys(
            categoryMap
        ).forEach(
            type => {

                const countElement =
                    getCategoryCountElement(
                        type
                    );


                if (!countElement) {
                    return;
                }


                countElement.textContent =
                    Number(
                        counts?.[type] || 0
                    );

            }
        );

    }


    /* =====================================================
       TRANSACTION DOM
    ===================================================== */

    const transactionCard =
        document.querySelector(
            ".transaction-card"
        );


    const transactionNameElement =
        transactionCard?.querySelector(
            ".transaction-info strong"
        );


    const transactionAmountElement =
        transactionCard?.querySelector(
            ".transaction-amount"
        );


    const transactionIdElement =
        transactionCard?.querySelector(
            ".transaction-id"
        );


    /* =====================================================
       FORMAT CURRENCY
    ===================================================== */

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
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        ).format(
            numericAmount
        );

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(
        value
    ) {

        if (!value) {
            return "Date unavailable";
        }


        const date =
            new Date(value);


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
        );

    }


    /* =====================================================
       UPDATE TRANSACTION DETAILS
    ===================================================== */

    function updateTransactionDetails(
        transaction
    ) {

        if (!transaction) {
            return;
        }


        if (
            transactionNameElement
        ) {

            transactionNameElement.textContent =
                transaction.receiver_name ||
                "Unknown Receiver";

        }


        if (
            transactionAmountElement
        ) {

            transactionAmountElement.textContent =
                formatCurrency(
                    transaction.amount
                );

        }


        if (
            transactionIdElement
        ) {

            transactionIdElement.textContent =
                `Transaction ID: ${
                    transaction.transaction_reference ||
                    transaction.id
                }`;

        }


        /*
         * Update transaction icon based
         * on receiver category/name.
         */

        const icon =
            transactionCard?.querySelector(
                ".transaction-icon i"
            );


        if (icon) {

            const category =
                String(
                    transaction.receiver_category ||
                    ""
                ).toLowerCase();


            const name =
                String(
                    transaction.receiver_name ||
                    ""
                ).toLowerCase();


            icon.className =
                "fa-solid fa-gift";


            if (
                category.includes("food") ||
                name.includes("food") ||
                name.includes("delivery")
            ) {

                icon.className =
                    "fa-solid fa-bag-shopping";

            } else if (
                category.includes("store") ||
                category.includes("merchant") ||
                name.includes("store") ||
                name.includes("shop")
            ) {

                icon.className =
                    "fa-solid fa-store";

            } else if (
                category.includes("person") ||
                category.includes("individual")
            ) {

                icon.className =
                    "fa-solid fa-user";

            }

        }

    }


    /* =====================================================
       GET FILE ICON
    ===================================================== */

    function getFileIcon(
        mimeType,
        fileName
    ) {

        const mime =
            String(
                mimeType || ""
            ).toLowerCase();


        const name =
            String(
                fileName || ""
            ).toLowerCase();


        if (
            mime.includes("image") ||
            /\.(png|jpg|jpeg|gif|webp)$/i.test(name)
        ) {

            return {
                icon: "fa-image",
                className: "image-file"
            };

        }


        if (
            mime.includes("pdf") ||
            /\.pdf$/i.test(name)
        ) {

            return {
                icon: "fa-file-pdf",
                className: "pdf-file"
            };

        }


        if (
            mime.includes("text") ||
            /\.(txt|csv)$/i.test(name)
        ) {

            return {
                icon: "fa-file-lines",
                className: "text-file"
            };

        }


        return {
            icon: "fa-file",
            className: "text-file"
        };

    }


    /* =====================================================
       GET FILE TYPE
    ===================================================== */

    function getFileTypeLabel(
        mimeType,
        fileName,
        evidenceType
    ) {

        /*
         * Text evidence
         */

        if (
            evidenceType ===
            "scam_message"
        ) {

            return "Text Message";

        }


        if (
            evidenceType ===
            "suspicious_link"
        ) {

            return "Web Link";

        }


        if (
            evidenceType ===
            "call_details"
        ) {

            return "Call Details";

        }


        if (
            evidenceType ===
            "qr_code_details"
        ) {

            return "QR Details";

        }


        const mime =
            String(
                mimeType || ""
            ).toLowerCase();


        const name =
            String(
                fileName || ""
            ).toLowerCase();


        if (
            mime.includes("png") ||
            /\.png$/i.test(name)
        ) {

            return "PNG Image";

        }


        if (
            mime.includes("jpeg") ||
            mime.includes("jpg") ||
            /\.(jpg|jpeg)$/i.test(name)
        ) {

            return "JPG Image";

        }


        if (
            mime.includes("webp") ||
            /\.webp$/i.test(name)
        ) {

            return "WebP Image";

        }


        if (
            mime.includes("pdf") ||
            /\.pdf$/i.test(name)
        ) {

            return "PDF Document";

        }


        if (
            mime.includes("text") ||
            /\.txt$/i.test(name)
        ) {

            return "TXT Document";

        }


        if (
            mime.includes("csv") ||
            /\.csv$/i.test(name)
        ) {

            return "CSV Document";

        }


        return "File";

    }


    /* =====================================================
       EVIDENCE TABLE
    ===================================================== */

    function renderEvidence(
        evidenceList,
        total
    ) {

        const evidenceTable =
            document.querySelector(
                ".evidence-table"
            );


        if (!evidenceTable) {
            return;
        }


        /*
         * Remove all existing evidence rows.
         */

        evidenceTable
            .querySelectorAll(
                ".evidence-row"
            )
            .forEach(
                row => row.remove()
            );


        /*
         * Update count in header.
         */

        const header =
            evidenceTable.querySelector(
                ".col-name"
            );


        if (header) {

            header.innerHTML = `
                <i class="fa-solid fa-shield-halved"></i>
                ${total}
                Evidence Item${total === 1 ? "" : "s"}
                Collected
            `;

        }


        /*
         * Empty state
         */

        if (
            !Array.isArray(
                evidenceList
            ) ||
            evidenceList.length === 0
        ) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "evidence-row";


            row.innerHTML = `
                <div
                    style="
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 25px;
                        color: #8290a8;
                    "
                >
                    <i
                        class="fa-regular fa-folder-open"
                        style="margin-right:8px;"
                    ></i>

                    No evidence uploaded yet.
                </div>
            `;


            evidenceTable.appendChild(
                row
            );


            return;
        }


        /*
         * Render each item.
         */

        evidenceList.forEach(
            evidence => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "evidence-row";


                row.dataset.evidenceId =
                    evidence.id;


                row.dataset.filePath =
                    evidence.file_path ||
                    "";


                row.dataset.mimeType =
                    evidence.mime_type ||
                    "";


                row.dataset.fileName =
                    evidence.file_name ||
                    "";


                row.dataset.content =
                    evidence.evidence_content ||
                    "";


                row.dataset.evidenceType =
                    evidence.evidence_type ||
                    "other";


                const iconData =
                    getFileIcon(
                        evidence.mime_type,
                        evidence.file_name
                    );


                const fileType =
                    getFileTypeLabel(
                        evidence.mime_type,
                        evidence.file_name,
                        evidence.evidence_type
                    );


                const isTextEvidence =
                    !evidence.file_path &&
                    Boolean(
                        evidence.evidence_content
                    );


                const displayName =
                    isTextEvidence
                        ? getTextEvidenceName(
                            evidence
                        )
                        : evidence.file_name;


                /*
                 * Use a message/link icon
                 * for text evidence.
                 */

                let finalIcon =
                    iconData;


                if (
                    evidence.evidence_type ===
                    "scam_message"
                ) {

                    finalIcon = {
                        icon:
                            "fa-message",
                        className:
                            "message-file"
                    };

                }


                if (
                    evidence.evidence_type ===
                    "suspicious_link"
                ) {

                    finalIcon = {
                        icon:
                            "fa-link",
                        className:
                            "text-file"
                    };

                }


                const status =
                    evidence.security_status ===
                    "verified"
                        ? "VERIFIED"
                        : "SECURE";


                const statusClass =
                    evidence.security_status ===
                    "verified"
                        ? "verified"
                        : "secure";


                const statusIcon =
                    evidence.security_status ===
                    "verified"
                        ? "fa-shield-check"
                        : "fa-lock";


                row.innerHTML = `

                    <div class="file-name">

                        <span
                            class="file-icon ${finalIcon.className}"
                        >

                            <i
                                class="fa-solid ${finalIcon.icon}"
                            ></i>

                        </span>

                        <span
                            class="evidence-name"
                            title="${escapeHtml(
                                displayName
                            )}"
                        >
                            ${escapeHtml(
                                displayName
                            )}
                        </span>

                    </div>


                    <div>
                        ${escapeHtml(
                            fileType
                        )}
                    </div>


                    <div>

                        <i
                            class="fa-regular fa-calendar"
                        ></i>

                        ${escapeHtml(
                            formatDate(
                                evidence.created_at
                            )
                        )}

                    </div>


                    <div
                        class="status ${statusClass}"
                    >

                        <i
                            class="fa-solid ${statusIcon}"
                        ></i>

                        ${status}

                    </div>


                    <div class="actions">

                        <button
                            class="preview-btn"
                            type="button"
                            title="Preview evidence"
                        >

                            <i
                                class="fa-regular fa-eye"
                            ></i>

                        </button>


                        <button
                            class="menu-btn"
                            type="button"
                            title="Delete evidence"
                        >

                            <i
                                class="fa-solid fa-ellipsis-vertical"
                            ></i>

                        </button>

                    </div>

                `;


                evidenceTable.appendChild(
                    row
                );

            }
        );


        attachEvidenceActions();

    }


    /* =====================================================
       TEXT EVIDENCE DISPLAY NAME
    ===================================================== */

    function getTextEvidenceName(
        evidence
    ) {

        if (
            evidence.evidence_type ===
            "scam_message"
        ) {

            return "Scam Message";

        }


        if (
            evidence.evidence_type ===
            "suspicious_link"
        ) {

            return "Suspicious Link";

        }


        if (
            evidence.evidence_type ===
            "call_details"
        ) {

            return "Call Details";

        }


        if (
            evidence.evidence_type ===
            "qr_code_details"
        ) {

            return "QR Code Details";

        }


        return "Text Evidence";

    }


    /* =====================================================
       LOAD EVIDENCE
    ===================================================== */

    async function loadEvidence() {

        try {

            console.log(
                "📡 Loading evidence for transaction:",
                selectedTransactionId
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
                    "Unable to load evidence."
                );

            }


            if (
                !data ||
                data.success !== true
            ) {

                throw new Error(
                    data?.message ||
                    "Evidence could not be loaded."
                );

            }


            console.log(
                "✅ Evidence loaded:",
                data
            );


            updateTransactionDetails(
                data.transaction
            );


            updateCategoryCounts(
                data.counts || {}
            );


            renderEvidence(
                data.evidence || [],
                Number(
                    data.total || 0
                )
            );


        } catch (error) {

            console.error(
                "❌ Evidence loading failed:",
                error
            );


            showToast(
                error.message ||
                "Unable to load evidence."
            );

        }

    }


    /* =====================================================
       DETERMINE FILE CATEGORY
    ===================================================== */

    function detectEvidenceType(
        file
    ) {

        const name =
            String(
                file.name || ""
            ).toLowerCase();


        const type =
            String(
                file.type || ""
            ).toLowerCase();


        if (
            type.startsWith("image/")
        ) {

            return "payment_screenshot";

        }


        if (
            type.includes("pdf") ||
            name.endsWith(".pdf")
        ) {

            return "transaction_details";

        }


        if (
            type === "text/plain" ||
            name.endsWith(".txt")
        ) {

            return "other";

        }


        return "other";

    }


    /* =====================================================
       SELECTED CATEGORY
    ===================================================== */

    function getSelectedCategory() {

        const selected =
            document.querySelector(
                ".selected-category"
            );


        if (!selected) {
            return null;
        }


        const label =
            selected.querySelector(
                ":scope > span"
            );


        if (!label) {
            return null;
        }


        const text =
            label.textContent.trim();


        for (
            const [
                key,
                value
            ]
            of Object.entries(
                categoryMap
            )
        ) {

            if (
                value === text
            ) {

                return key;

            }

        }


        return null;

    }


    /* =====================================================
       UPLOAD FILES
    ===================================================== */

    async function uploadFiles(
        files
    ) {

        if (
            !files ||
            files.length === 0
        ) {

            return;

        }


        if (
            files.length > 10
        ) {

            alert(
                "You can upload a maximum of 10 files at once."
            );

            return;

        }


        const selectedCategory =
            getSelectedCategory();


        /*
         * Without selecting a category, we
         * use automatic detection.
         */

        try {

            for (
                const file of files
            ) {

                const evidenceType =
                    selectedCategory ||
                    detectEvidenceType(
                        file
                    );


                const formData =
                    new FormData();


                formData.append(
                    "transaction_id",
                    selectedTransactionId
                );


                formData.append(
                    "evidence_type",
                    evidenceType
                );


                formData.append(
                    "evidence",
                    file
                );


                console.log(
                    "📤 Uploading evidence:",
                    {
                        file:
                            file.name,

                        category:
                            evidenceType
                    }
                );


                const response =
                    await fetch(
                        `${API_BASE_URL}/api/evidence`,
                        {

                            method:
                                "POST",

                            headers: {

                                Authorization:
                                    `Bearer ${token}`

                            },

                            body:
                                formData

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
                        data?.error ||
                        "Evidence upload failed."
                    );

                }


                console.log(
                    "✅ File uploaded:",
                    data
                );

            }


            await loadEvidence();


            showToast(
                "Evidence uploaded successfully."
            );


        } catch (error) {

            console.error(
                "❌ File upload failed:",
                error
            );


            showToast(
                error.message ||
                "Unable to upload evidence."
            );

        }

    }


    /* =====================================================
       OPEN TEXT MODAL
    ===================================================== */

    function openTextModal() {

        if (!evidenceModal) {
            return;
        }


        if (textEvidenceType) {

            textEvidenceType.value =
                "scam_message";

        }


        if (evidenceContent) {

            evidenceContent.value =
                "";

        }


        if (evidenceDescription) {

            evidenceDescription.value =
                "";

        }


        evidenceModal.style.display =
            "flex";


        document.body.style.overflow =
            "hidden";


        setTimeout(
            () => {

                evidenceContent?.focus();

            },
            100
        );

    }


    /* =====================================================
       CLOSE TEXT MODAL
    ===================================================== */

    function closeTextModal() {

        if (!evidenceModal) {
            return;
        }


        evidenceModal.style.display =
            "none";


        document.body.style.overflow =
            "";

    }


    /* =====================================================
       SAVE TEXT EVIDENCE
    ===================================================== */

    async function saveTextEvidence() {

        const evidenceType =
            textEvidenceType?.value;


        const content =
            evidenceContent?.value.trim();


        const description =
            evidenceDescription?.value.trim();


        if (!evidenceType) {

            alert(
                "Please select an evidence type."
            );

            return;

        }


        if (!content) {

            alert(
                "Please enter the evidence."
            );

            evidenceContent?.focus();

            return;

        }


        /*
         * Link validation on frontend.
         */

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

                    throw new Error();

                }

            } catch (error) {

                alert(
                    "Please enter a valid HTTP or HTTPS link."
                );

                evidenceContent?.focus();

                return;

            }

        }


        try {

            if (saveTextEvidenceBtn) {

                saveTextEvidenceBtn.disabled =
                    true;

                saveTextEvidenceBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                `;

            }


            console.log(
                "📝 Saving text evidence:",
                evidenceType
            );


            const response =
                await fetch(
                    `${API_BASE_URL}/api/evidence/text`,
                    {

                        method:
                            "POST",

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json",

                            Accept:
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                transaction_id:
                                    Number(
                                        selectedTransactionId
                                    ),

                                evidence_type:
                                    evidenceType,

                                content:
                                    content,

                                description:
                                    description ||
                                    null

                            })

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
                    data?.error ||
                    "Unable to save evidence."
                );

            }


            console.log(
                "✅ Text evidence saved:",
                data
            );


            closeTextModal();


            await loadEvidence();


            showToast(
                "Evidence saved successfully."
            );


        } catch (error) {

            console.error(
                "❌ Text evidence save failed:",
                error
            );


            showToast(
                error.message ||
                "Unable to save evidence."
            );

        } finally {

            if (saveTextEvidenceBtn) {

                saveTextEvidenceBtn.disabled =
                    false;

                saveTextEvidenceBtn.innerHTML = `
                    <i class="fa-solid fa-cloud-arrow-up"></i>
                    Save Evidence
                `;

            }

        }

    }


    /* =====================================================
       PREVIEW FILE/TEXT EVIDENCE
    ===================================================== */

    function previewEvidence(
        row
    ) {

        if (!row) {
            return;
        }


        const content =
            row.dataset.content || "";


        const evidenceType =
            row.dataset.evidenceType ||
            "";


        const filePath =
            row.dataset.filePath ||
            "";


        const fileName =
            row.dataset.fileName ||
            "";


        /*
         * Text evidence
         */

        if (
            content &&
            !filePath
        ) {

            const previewWindow =
                window.open(
                    "",
                    "_blank",
                    "width=750,height=650"
                );


            if (!previewWindow) {

                alert(
                    "Please allow pop-ups to preview evidence."
                );

                return;

            }


            const title =
                evidenceType ===
                    "scam_message"
                    ? "Scam Message"
                    : evidenceType ===
                        "suspicious_link"
                        ? "Suspicious Link"
                        : "Evidence";


            previewWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>

                    <title>
                        ${escapeHtml(title)}
                    </title>

                    <style>

                        body {
                            margin: 0;
                            padding: 30px;
                            background: #02091b;
                            color: #e8eef8;
                            font-family: Arial, sans-serif;
                        }

                        .box {
                            max-width: 680px;
                            margin: 0 auto;
                            padding: 25px;
                            border-radius: 14px;
                            background: #081735;
                            border: 1px solid #315b99;
                        }

                        h2 {
                            margin-top: 0;
                            color: #ffffff;
                        }

                        .content {
                            white-space: pre-wrap;
                            line-height: 1.6;
                            background: #06122b;
                            padding: 18px;
                            border-radius: 8px;
                            word-break: break-word;
                        }

                        .link {
                            color: #55aaff;
                        }

                    </style>

                </head>

                <body>

                    <div class="box">

                        <h2>
                            ${escapeHtml(title)}
                        </h2>

                        <div class="content">
                            ${escapeHtml(content)}
                        </div>

                    </div>

                </body>
                </html>
            `);


            previewWindow.document.close();

            return;

        }


        /*
         * File evidence
         */

        if (!filePath) {

            alert(
                "Preview is not available for this evidence."
            );

            return;

        }


        const cleanPath =
            String(
                filePath
            )
                .replace(
                    /^backend[\\/]/,
                    ""
                )
                .replace(
                    /\\/g,
                    "/"
                );


        const fileUrl =
            `${API_BASE_URL}/${cleanPath}`;


        console.log(
            "👁️ Previewing:",
            fileUrl
        );


        window.open(
            fileUrl,
            "_blank"
        );

    }


    /* =====================================================
       DELETE EVIDENCE
    ===================================================== */

    async function deleteEvidence(
        evidenceId
    ) {

        const confirmed =
            window.confirm(
                "Delete this evidence permanently?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `${API_BASE_URL}/api/evidence/${evidenceId}`,
                    {

                        method:
                            "DELETE",

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
                    "Unable to delete evidence."
                );

            }


            await loadEvidence();


            showToast(
                "Evidence deleted successfully."
            );


        } catch (error) {

            console.error(
                "❌ Delete failed:",
                error
            );


            showToast(
                error.message ||
                "Unable to delete evidence."
            );

        }

    }


    /* =====================================================
       ATTACH TABLE ACTIONS
    ===================================================== */

    function attachEvidenceActions() {

        const previewButtons =
            document.querySelectorAll(
                ".evidence-row .preview-btn"
            );


        previewButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const row =
                            button.closest(
                                ".evidence-row"
                            );


                        previewEvidence(
                            row
                        );

                    }
                );

            }
        );


        const menuButtons =
            document.querySelectorAll(
                ".evidence-row .menu-btn"
            );


        menuButtons.forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();


                        const row =
                            button.closest(
                                ".evidence-row"
                            );


                        if (!row) {
                            return;
                        }


                        deleteEvidence(
                            row.dataset.evidenceId
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       FILE BROWSE
    ===================================================== */

    if (
        browseBtn &&
        fileInput
    ) {

        browseBtn.addEventListener(
            "click",
            () => {

                fileInput.click();

            }
        );


        fileInput.addEventListener(
            "change",
            async () => {

                const files =
                    Array.from(
                        fileInput.files || []
                    );


                await uploadFiles(
                    files
                );


                fileInput.value =
                    "";

            }
        );

    }


    /* =====================================================
       DRAG & DROP
    ===================================================== */

    if (
        uploadCard
    ) {

        uploadCard.addEventListener(
            "dragover",
            event => {

                event.preventDefault();

                uploadCard.classList.add(
                    "drag-active"
                );

            }
        );


        uploadCard.addEventListener(
            "dragleave",
            () => {

                uploadCard.classList.remove(
                    "drag-active"
                );

            }
        );


        uploadCard.addEventListener(
            "drop",
            async event => {

                event.preventDefault();


                uploadCard.classList.remove(
                    "drag-active"
                );


                const files =
                    Array.from(
                        event.dataTransfer
                            ?.files || []
                    );


                await uploadFiles(
                    files
                );

            }
        );

    }


    /* =====================================================
       OPEN TEXT EVIDENCE MODAL
    ===================================================== */

    if (textEvidenceBtn) {

        textEvidenceBtn.addEventListener(
            "click",
            openTextModal
        );

    }


    /* =====================================================
       CLOSE MODAL BUTTONS
    ===================================================== */

    if (closeEvidenceModal) {

        closeEvidenceModal.addEventListener(
            "click",
            closeTextModal
        );

    }


    if (cancelEvidenceBtn) {

        cancelEvidenceBtn.addEventListener(
            "click",
            closeTextModal
        );

    }


    /* =====================================================
       CLOSE BY CLICKING OVERLAY
    ===================================================== */

    if (evidenceModal) {

        evidenceModal
            .querySelector(
                ".evidence-modal-overlay"
            )
            ?.addEventListener(
                "click",
                closeTextModal
            );

    }


    /* =====================================================
       ESC KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                evidenceModal?.style.display === "flex"
            ) {

                closeTextModal();

            }

        }
    );


    /* =====================================================
       SAVE TEXT EVIDENCE BUTTON
    ===================================================== */

    if (saveTextEvidenceBtn) {

        saveTextEvidenceBtn.addEventListener(
            "click",
            saveTextEvidence
        );

    }


    /* =====================================================
       CATEGORY SELECTION
    ===================================================== */

    categories.forEach(
        category => {

            category.addEventListener(
                "click",
                () => {

                    categories.forEach(
                        item => {

                            item.classList.remove(
                                "selected-category"
                            );

                        }
                    );


                    category.classList.add(
                        "selected-category"
                    );


                    const title =
                        category.querySelector(
                            ":scope > span"
                        );


                    if (title) {

                        console.log(
                            "📂 Selected evidence category:",
                            title.textContent.trim()
                        );

                    }

                }
            );

        }
    );


    /* =====================================================
       BACK BUTTON
    ===================================================== */

    if (backBtn) {

        backBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "trusted-person-recovery.html";

            }
        );

    }


    /* =====================================================
       CONTINUE BUTTON
    ===================================================== */

    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            () => {

                localStorage.setItem(
                    "selectedTransactionId",
                    String(
                        selectedTransactionId
                    )
                );


                window.location.href =
                    "scamtimeline-recovery.html";

            }
        );

    }


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(
        message
    ) {

        let toast =
            document.getElementById(
                "evidenceToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );


            toast.id =
                "evidenceToast";


            Object.assign(
                toast.style,
                {

                    position:
                        "fixed",

                    right:
                        "25px",

                    bottom:
                        "25px",

                    zIndex:
                        "99999",

                    padding:
                        "14px 20px",

                    borderRadius:
                        "10px",

                    background:
                        "#10244d",

                    border:
                        "1px solid #358eff",

                    color:
                        "#ffffff",

                    fontSize:
                        "14px",

                    boxShadow:
                        "0 10px 30px rgba(0,0,0,0.3)"

                }
            );


            document.body.appendChild(
                toast
            );

        }


        toast.textContent =
            message;


        toast.style.display =
            "block";


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                () => {

                    toast.style.display =
                        "none";

                },
                3000
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


    /* =====================================================
       INITIALIZE
    ===================================================== */

    loadEvidence();

});
