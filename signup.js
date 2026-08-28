const signupBtn = document.getElementById("signupBtn");

signupBtn.addEventListener("click", async () => {

    // Get values from the form
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const terms = document.getElementById("terms").checked;


    // -----------------------------
    // CHECK TERMS
    // -----------------------------

    if (!terms) {
        alert("Please agree to the Terms & Conditions and Privacy Policy.");
        return;
    }


    // -----------------------------
    // CHECK EMPTY FIELDS
    // -----------------------------

    if (!name || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }


    // -----------------------------
    // CHECK PASSWORDS
    // -----------------------------

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }


    // -----------------------------
    // SEND DATA TO BACKEND
    // -----------------------------

    try {

        const response = await fetch(
            "http://localhost:5000/api/auth/signup",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            }
        );


        const data = await response.json();


        // -----------------------------
        // SUCCESS
        // -----------------------------

        if (response.ok) {

            alert("Account created successfully!");

            // Redirect to login page
            window.location.href = "login.html";

        }


        // -----------------------------
        // ERROR FROM BACKEND
        // -----------------------------

        else {

            alert(data.message || "Signup failed.");

        }

    }


    // -----------------------------
    // SERVER CONNECTION ERROR
    // -----------------------------

    catch (error) {

        console.error("Signup error:", error);

        alert(
            "Unable to connect to the server. Please make sure the backend is running."
        );

    }

});