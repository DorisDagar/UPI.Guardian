const token = localStorage.getItem("upiGuardianToken");
const API_BASE_URL = window.location.port === "5000" ? "" : "http://localhost:5000";

if (!token) {
  window.location.replace("login.html");
}

function setUser(user) {
  if (!user?.name) return;

  const firstName = user.name.trim().split(/\s+/)[0];
  const initial = firstName.charAt(0).toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = user.name;
  });
  document.querySelectorAll("[data-user-initial]").forEach((element) => {
    element.textContent = initial;
  });

  const greetingElement = document.getElementById("greeting");
  greetingElement.textContent = `${greeting}, ${firstName} `;
  const wave = document.createElement("span");
  wave.textContent = "👋";
  greetingElement.appendChild(wave);
}

function updateDate() {
  document.getElementById("todayLabel").textContent = new Date()
    .toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

function logOut() {
  if (!confirm("Do you want to log out of UPI Guardian?")) return;
  localStorage.removeItem("upiGuardianToken");
  localStorage.removeItem("upiGuardianUser");
  window.location.replace("login.html");
}

async function loadLoggedInUser() {
  try {
    const cachedUser = JSON.parse(localStorage.getItem("upiGuardianUser") || "null");
    setUser(cachedUser);

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Session expired");

    const data = await response.json();
    localStorage.setItem("upiGuardianUser", JSON.stringify(data.user));
    setUser(data.user);
  } catch (error) {
    localStorage.removeItem("upiGuardianToken");
    localStorage.removeItem("upiGuardianUser");
    window.location.replace("login.html");
  }
}

document.querySelectorAll("#topProfile, #sidebarProfile").forEach((profile) => {
  profile.addEventListener("click", logOut);
  profile.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") logOut();
  });
});

const sendMoneyItems = [...document.querySelectorAll("a")].filter((link) =>
  link.textContent.toLowerCase().includes("send money")
);
sendMoneyItems.forEach((link) => {
  link.href = "send%20money.html";
});

updateDate();
loadLoggedInUser();
