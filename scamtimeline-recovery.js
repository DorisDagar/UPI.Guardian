/* =====================================================
   UPI GUARDIAN
   SCAM TIMELINE - JAVASCRIPT
===================================================== */


/* =====================================================
   INCIDENT DATA
===================================================== */

const incident = {
    transaction: "Lucky Reward UPI",
    amount: 50000,
    transactionId: "TXN123456",
    risk: "HIGH",
    duration: "23 min",
    recoveryStep: 5,
    totalSteps: 6
};


/* =====================================================
   RECOVERY EVENTS
===================================================== */

const recoveryEvents = [

    {
        time: "09:45 AM",
        title: "Transaction reported",
        description: "Fraudulent transaction reported for recovery",
        icon: "↗"
    },

    {
        time: "10:00 AM",
        title: "Trusted person connected",
        description: "Recovery assistance connected with the user",
        icon: "✓"
    },

    {
        time: "10:15 AM",
        title: "Evidence uploaded",
        description: "Transaction and scam evidence submitted",
        icon: "↑"
    }

];


/* =====================================================
   GET ELEMENTS
===================================================== */

const recoveryContainer =
    document.getElementById("recoveryEvents");

const reportButton =
    document.getElementById("reportButton");


/* =====================================================
   RENDER RECOVERY EVENTS
===================================================== */

function renderRecoveryEvents() {

    // Check whether the recovery container exists
    if (!recoveryContainer) {
        return;
    }

    // Clear existing events
    recoveryContainer.innerHTML = "";


    recoveryEvents.forEach((event, index) => {

        const eventElement =
            document.createElement("div");


        eventElement.className =
            "timeline-event recovery-event";


        eventElement.style.animationDelay =
            `${index * 0.12}s`;


        eventElement.innerHTML = `

            <div class="time">
                ${event.time}
            </div>

            <div class="timeline-marker">

                <div class="event-icon blue-icon">

                    <span>
                        ${event.icon}
                    </span>

                </div>

            </div>

            <div class="event-content">

                <h3>
                    ${event.title}
                </h3>

                <p>
                    ${event.description}
                </p>

            </div>

        `;


        recoveryContainer.appendChild(
            eventElement
        );

    });

}


/* =====================================================
   OPEN FRAUD REPORT PAGE
===================================================== */

function openFraudReport() {

    /*
       This opens the separate fraud-report.html page.
    */

    window.location.href = "fraud-report.html";

}


/* =====================================================
   GENERATE FRAUD REPORT BUTTON
===================================================== */

if (reportButton) {

    reportButton.addEventListener(
        "click",
        openFraudReport
    );

}


/* =====================================================
   OPTIONAL:
   STORE INCIDENT DATA FOR FRAUD REPORT PAGE
===================================================== */

function storeIncidentData() {

    localStorage.setItem(
        "upiGuardianIncident",
        JSON.stringify(incident)
    );

}


/* =====================================================
   INITIALIZE
===================================================== */

storeIncidentData();

renderRecoveryEvents();