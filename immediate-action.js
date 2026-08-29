/* =========================================
   UPI GUARDIAN - RECOVERY PAGE
========================================= */

const checkboxes =
    document.querySelectorAll(".step-checkbox");

const steps =
    document.querySelectorAll(".step");

const continueButton =
    document.getElementById("continueButton");

const progressPercent =
    document.getElementById("progressPercent");

const backButton =
    document.getElementById("backButton");


/* =========================================
   UPDATE PROGRESS
========================================= */

function updateProgress() {

    const totalSteps = checkboxes.length;

    let completedSteps = 0;

    checkboxes.forEach((checkbox, index) => {

        const step = steps[index];

        if (checkbox.checked) {

            completedSteps++;

            step.classList.add("completed");

        } else {

            step.classList.remove("completed");

        }

    });


    const percentage =
        Math.round(
            (completedSteps / totalSteps) * 100
        );

    progressPercent.textContent = percentage;


    /*
     * Enable Continue button only
     * when all 4 steps are complete.
     */

    continueButton.disabled =
        completedSteps !== totalSteps;
}


/* =========================================
   CHECKBOX EVENTS
========================================= */

checkboxes.forEach((checkbox) => {

    checkbox.addEventListener(
        "change",
        updateProgress
    );

});


/* =========================================
   BACK TO TRANSACTION
========================================= */

backButton.addEventListener(
    "click",
    function () {

        window.location.href = "select-transaction.html";

    }
);


/* =========================================
   CONTINUE TO TRUSTED PERSON RECOVERY
========================================= */

continueButton.addEventListener(
    "click",
    function () {

        if (continueButton.disabled) {
            return;
        }

        window.location.href =
            "trusted-person-recovery.html";

    }
);


/* =========================================
   INITIALIZE
========================================= */

updateProgress();