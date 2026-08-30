document.addEventListener("DOMContentLoaded", function () {

    /* ==========================================
       BACK BUTTON
       Opens trust person recover.html
    ========================================== */

    const backBtn = document.getElementById("backBtn");

    if (backBtn) {
        backBtn.addEventListener("click", function () {
            window.location.href = "trust person recover.html";
        });
    }


    /* ==========================================
       CONTINUE BUTTON
       Opens scamtimeline.html
    ========================================== */

    const continueBtn = document.getElementById("continueBtn");

    if (continueBtn) {
        continueBtn.addEventListener("click", function () {
            window.location.href = "scamtimeline-recovery.html";
        });
    }


    /* ==========================================
       FILE UPLOAD
    ========================================== */

    const browseBtn = document.getElementById("browseBtn");
    const fileInput = document.getElementById("fileInput");
    const uploadCard = document.getElementById("uploadCard");


    if (browseBtn && fileInput) {

        browseBtn.addEventListener("click", function () {
            fileInput.click();
        });


        fileInput.addEventListener("change", function () {

            const files = Array.from(fileInput.files);

            if (files.length === 0) {
                return;
            }

            console.log("Selected files:");

            files.forEach(function (file) {
                console.log(file.name);
            });

        });

    }


    /* ==========================================
       DRAG AND DROP
    ========================================== */

    if (uploadCard && fileInput) {

        uploadCard.addEventListener("dragover", function (event) {

            event.preventDefault();

            uploadCard.classList.add("drag-active");

        });


        uploadCard.addEventListener("dragleave", function () {

            uploadCard.classList.remove("drag-active");

        });


        uploadCard.addEventListener("drop", function (event) {

            event.preventDefault();

            uploadCard.classList.remove("drag-active");

            const files = Array.from(
                event.dataTransfer.files
            );

            if (files.length === 0) {
                return;
            }

            console.log("Dropped files:");

            files.forEach(function (file) {
                console.log(file.name);
            });

        });

    }


    /* ==========================================
       EVIDENCE CATEGORY CLICK
    ========================================== */

    const categories =
        document.querySelectorAll(".category");


    categories.forEach(function (category) {

        category.addEventListener("click", function () {

            const title =
                category.querySelector(":scope > span");

            if (title) {

                console.log(
                    "Selected category:",
                    title.textContent.trim()
                );

            }

        });

    });


    /* ==========================================
       PREVIEW BUTTONS
    ========================================== */

    const previewButtons =
        document.querySelectorAll(".preview-btn");


    previewButtons.forEach(function (button) {

        button.addEventListener("click", function (event) {

            event.stopPropagation();

            const row =
                button.closest(".evidence-row");

            if (!row) {
                return;
            }

            const file =
                row.querySelector(".file-name");

            if (file) {

                console.log(
                    "Preview:",
                    file.textContent.trim()
                );

            }

        });

    });


    /* ==========================================
       MORE OPTIONS BUTTONS
    ========================================== */

    const menuButtons =
        document.querySelectorAll(".menu-btn");


    menuButtons.forEach(function (button) {

        button.addEventListener("click", function (event) {

            event.stopPropagation();

            const row =
                button.closest(".evidence-row");

            if (!row) {
                return;
            }

            const file =
                row.querySelector(".file-name");

            if (file) {

                console.log(
                    "Options:",
                    file.textContent.trim()
                );

            }

        });

    });

});