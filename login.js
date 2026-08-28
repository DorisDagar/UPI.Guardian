const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const API_BASE_URL = window.location.port === "5000" ? "" : "http://localhost:5000";

if (localStorage.getItem("upiGuardianToken")) {
  window.location.replace("dashboard.html");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.querySelector("span").textContent = "Logging in...";

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Login failed.");
      return;
    }

    localStorage.setItem("upiGuardianToken", data.token);
    localStorage.setItem("upiGuardianUser", JSON.stringify(data.user));
    window.location.replace("dashboard.html");
  } catch (error) {
    console.error("Login error:", error);
    alert("Unable to connect to the server. Please make sure the backend is running.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.querySelector("span").textContent = "Login";
  }
});
