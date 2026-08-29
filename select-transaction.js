/* =========================================
   UPI GUARDIAN
   SELECT SUSPICIOUS TRANSACTION
========================================= */

const transactionCards = document.querySelectorAll(".transaction-card");
const selectedText = document.getElementById("selectedText");
const continueBtn = document.getElementById("continueBtn");


/* =========================================
   SELECT FIRST TRANSACTION BY DEFAULT
========================================= */

let selectedCard = document.querySelector(".transaction-card.selected");

if (selectedCard) {

    saveTransaction(selectedCard);

}


/* =========================================
   CLICK ON TRANSACTION
========================================= */

transactionCards.forEach(card => {

    card.addEventListener("click", function () {

        /*
         * Remove selected class from EVERY transaction
         */

        transactionCards.forEach(item => {

            item.classList.remove("selected");

        });


        /*
         * Add selected class ONLY
         * to the transaction that was clicked
         */

        this.classList.add("selected");


        /*
         * Update selected card
         */

        selectedCard = this;


        /*
         * Save transaction
         */

        saveTransaction(this);


        /*
         * Update bottom text
         */

        selectedText.textContent =
            "1 transaction selected";

    });

});


/* =========================================
   SAVE SELECTED TRANSACTION
========================================= */

function saveTransaction(card) {

    const transaction = {

        name: card.dataset.name,

        amount: card.dataset.amount,

        risk: card.dataset.risk

    };


    localStorage.setItem(
        "selectedTransaction",
        JSON.stringify(transaction)
    );
}


/* =========================================
   CONTINUE BUTTON
========================================= */

continueBtn.addEventListener("click", function () {

    /*
     * Find currently selected card
     */

    const selected =
        document.querySelector(".transaction-card.selected");


    /*
     * If nothing is selected
     */

    if (!selected) {

        alert("Please select a transaction first.");

        return;

    }


    /*
     * Save selected transaction again
     */

    saveTransaction(selected);


    /*
     * Go to Immediate Action page
     */

    window.location.href =
        "immediate-action.html";

});