document.addEventListener("DOMContentLoaded", () => {

    const personCards =
        document.querySelectorAll(".person-card");

    const recoveryButton =
        document.getElementById("recoveryBtn");

    const continueButton =
    document.getElementById("continueBtn");

    const whatsappInput =
    document.getElementById("trustedWhatsapp");


    let selectedPerson = "Mom";


    /* =====================================
       TRUSTED PERSON SELECTION
    ====================================== */

    personCards.forEach(card => {

        card.addEventListener("click", () => {

            // Remove selection from all cards
            personCards.forEach(item => {

                item.classList.remove("selected");

                const radio =
                    item.querySelector(".radio");

                radio.classList.remove("checked");

                radio.innerHTML = "";

                const label =
                    item.querySelector(".selected-label");

                if (label) {
                    label.remove();
                }

            });


            // Select clicked card
            card.classList.add("selected");


            const radio =
                card.querySelector(".radio");

            radio.classList.add("checked");

            radio.innerHTML =
                '<i class="fa-solid fa-check"></i>';


            // Add Selected label
            const personInfo =
                card.querySelector(".person-info");

            const label =
                document.createElement("div");

            label.className = "selected-label";

            label.textContent = "Selected";

            personInfo.appendChild(label);


            // Save selected person
            selectedPerson =
                card.dataset.person;

        });

    });



    /* =====================================
       ADD TO RECOVERY
       THEN OPEN EVIDENCE LOCKER
    ====================================== */

    recoveryButton.addEventListener("click", () => {

    if (!selectedPerson) {

        alert("Please select a trusted person.");

        return;
    }


    const whatsappNumber =
        whatsappInput.value.trim();


    // Check if number was entered
    if (!whatsappNumber) {

        alert(
            "Please enter the trusted person's WhatsApp number."
        );

        whatsappInput.focus();

        return;
    }


    // Check Indian 10-digit number
    if (!/^[6-9]\d{9}$/.test(whatsappNumber)) {

        alert(
            "Please enter a valid 10 digit WhatsApp number."
        );

        whatsappInput.focus();

        return;
    }


    // Save trusted person
    localStorage.setItem(
        "trustedPerson",
        selectedPerson
    );


    // Save WhatsApp number
    localStorage.setItem(
        "trustedPersonWhatsapp",
        whatsappNumber
    );


    // Show success
    recoveryButton.innerHTML = `
        <i class="fa-solid fa-circle-check"></i>
        <span>Added to Recovery</span>
    `;


    recoveryButton.disabled = true;


    // Continue to Evidence Locker
    setTimeout(() => {

        window.location.href =
            "evidence-locker.html";

    }, 600);

});




    /* =====================================
       CONTINUE WITHOUT TRUSTED PERSON
    ====================================== */

    continueButton.addEventListener("click", () => {

        const confirmContinue =
            confirm(
                "Continue without adding a trusted person?"
            );


        if (!confirmContinue) {
            return;
        }


        continueButton.textContent =
            "Continuing...";


        continueButton.style.color =
            "#7fbcff";


        setTimeout(() => {

            window.location.href =
                "evidence-locker.html";

        }, 600);

    });

});