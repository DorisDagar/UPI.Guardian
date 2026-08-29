const startRecovery = document.getElementById("startRecovery");

if (startRecovery) {

    startRecovery.addEventListener("click", function () {

        /*
         * Step 1 of Recovery Mode
         * User will identify the suspicious transaction.
         */

        window.location.href = "select-transaction.html";

    });

}


/* =========================================
   BACK TO DASHBOARD
========================================= */

const backDashboard = document.getElementById("backDashboard");

if (backDashboard) {

    backDashboard.addEventListener("click", function () {

        window.location.href = "dashboard.html";

    });

}