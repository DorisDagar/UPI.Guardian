// ==========================================
// UPI GUARDIAN - MESSAGE ANALYZER
// Gemini AI Powered
// Frontend: Live Server (127.0.0.1:5500)
// Backend: Node/Express (localhost:5000)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  // ========================================
  // ELEMENTS
  // ========================================

  const messageInput =
    document.getElementById("message");

  const screenshotInput =
    document.getElementById("screenshot");

  const analyzeButton =
    document.querySelector(".analyze-button");

  const characterCount =
    document.querySelector(".character-count");

  const riskScore =
    document.querySelector(".risk-score span");

  const riskLevel =
    document.querySelector(".risk-copy h3");

  const riskDescription =
    document.querySelector(".risk-copy p");

  const cautionBadge =
    document.querySelector(".caution-badge");

  const riskList =
    document.querySelector(".risk-list");

  const detectedPanel =
    document.querySelector(".detected-panel");


  // ========================================
  // BACKEND URL
  // ========================================

  // Your frontend is running using VS Code
  // Live Server on port 5500.
  //
  // Your backend is running using:
  // node server.js
  //
  // Backend port = 5000

  const API_URL =
    "http://localhost:5000/api/analyzer/analyze";


  // ========================================
  // SAFETY CHECK
  // ========================================

  if (
    !messageInput ||
    !screenshotInput ||
    !analyzeButton
  ) {

    console.error(
      "Message Analyzer: Required HTML elements were not found."
    );

    return;
  }


  // ========================================
  // CHARACTER COUNT
  // ========================================

  if (characterCount) {

    characterCount.textContent =
      `${messageInput.value.length}/1000`;

  }

  messageInput.addEventListener(
    "input",
    () => {

      if (characterCount) {

        characterCount.textContent =
          `${messageInput.value.length}/1000`;

      }

      // If user starts typing,
      // remove selected screenshot.

      if (
        messageInput.value.trim() &&
        screenshotInput.files.length
      ) {

        screenshotInput.value = "";

        removeScreenshotPreview();

      }

    }
  );


  // ========================================
  // SCREENSHOT SELECTION
  // ========================================

  screenshotInput.addEventListener(
    "change",
    () => {

      const file =
        screenshotInput.files[0];

      if (!file) {
        return;
      }


      // ------------------------------------
      // FILE TYPE
      // ------------------------------------

      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg"
      ];

      if (
        !allowedTypes.includes(file.type)
      ) {

        alert(
          "Please upload a PNG, JPG or JPEG image."
        );

        screenshotInput.value = "";

        removeScreenshotPreview();

        return;
      }


      // ------------------------------------
      // FILE SIZE
      // ------------------------------------

      if (
        file.size >
        5 * 1024 * 1024
      ) {

        alert(
          "Screenshot must be smaller than 5MB."
        );

        screenshotInput.value = "";

        removeScreenshotPreview();

        return;
      }


      // ------------------------------------
      // IF MESSAGE EXISTS
      // ------------------------------------

      if (
        messageInput.value.trim()
      ) {

        alert(
          "Please use either a message OR a screenshot, not both."
        );

        screenshotInput.value = "";

        removeScreenshotPreview();

        return;
      }


      showScreenshotPreview(file);

    }
  );


  // ========================================
  // SCREENSHOT PREVIEW
  // ========================================

  function showScreenshotPreview(file) {

    removeScreenshotPreview();

    const reader =
      new FileReader();

    reader.onload = (event) => {

      const uploadBox =
        document.querySelector(
          ".upload-box"
        );

      if (!uploadBox) {
        return;
      }


      const preview =
        document.createElement("div");

      preview.id =
        "screenshot-preview";

      preview.className =
        "screenshot-preview";


      preview.innerHTML = `

        <div class="preview-header">

          <span>
            <i class="fa-solid fa-image"></i>
            Screenshot selected
          </span>

          <button
            type="button"
            id="remove-screenshot"
            aria-label="Remove screenshot"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>

        </div>

        <img
          src="${event.target.result}"
          alt="Selected screenshot"
        >

        <p>${escapeHTML(file.name)}</p>

      `;


      uploadBox.after(preview);


      const removeButton =
        document.getElementById(
          "remove-screenshot"
        );


      if (removeButton) {

        removeButton.addEventListener(
          "click",
          () => {

            screenshotInput.value = "";

            removeScreenshotPreview();

          }
        );

      }

    };


    reader.readAsDataURL(file);

  }


  // ========================================
  // REMOVE SCREENSHOT PREVIEW
  // ========================================

  function removeScreenshotPreview() {

    const preview =
      document.getElementById(
        "screenshot-preview"
      );

    if (preview) {

      preview.remove();

    }

  }


  // ========================================
  // ANALYZE BUTTON
  // ========================================

  analyzeButton.addEventListener(
    "click",
    async () => {

      const message =
        messageInput.value.trim();

      const screenshot =
        screenshotInput.files[0];


      // ====================================
      // VALIDATION
      // ====================================

      if (
        !message &&
        !screenshot
      ) {

        alert(
          "Please paste a message or upload a screenshot."
        );

        return;
      }


      if (
        message &&
        screenshot
      ) {

        alert(
          "Please use either a message OR a screenshot, not both."
        );

        return;
      }


      if (
        message.length > 1000
      ) {

        alert(
          "Message cannot exceed 1000 characters."
        );

        return;
      }


      // ====================================
      // LOADING STATE
      // ====================================

      setLoadingState(true);


      try {

        const formData =
          new FormData();


        // ----------------------------------
        // TEXT MESSAGE
        // ----------------------------------

        if (message) {

          formData.append(
            "message",
            message
          );

        }


        // ----------------------------------
        // SCREENSHOT
        // ----------------------------------

        if (screenshot) {

          if (
            screenshot.size >
            5 * 1024 * 1024
          ) {

            throw new Error(
              "Screenshot must be smaller than 5MB."
            );

          }


          formData.append(
            "screenshot",
            screenshot
          );

        }


        // ==================================
        // SEND REQUEST TO BACKEND
        // ==================================

        console.log(
          "Sending analysis request to:",
          API_URL
        );


        const response =
          await fetch(
            API_URL,
            {
              method: "POST",
              body: formData
            }
          );


        // ==================================
        // READ RAW RESPONSE FIRST
        // ==================================

        const responseText =
          await response.text();


        console.log(
          "Backend HTTP status:",
          response.status
        );

        console.log(
          "Backend raw response:",
          responseText
        );


        // ==================================
        // CONVERT RESPONSE TO JSON
        // ==================================

        let data;

        try {

          data =
            JSON.parse(responseText);

        } catch (jsonError) {

          throw new Error(
            `Backend returned an invalid response. HTTP ${response.status}.`
          );

        }


        // ==================================
        // SERVER ERROR
        // ==================================

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
            "Unable to analyze the message."
          );

        }


        // ==================================
        // UPDATE RESULT
        // ==================================

        updateAnalysis(
          data.result
        );


        // ==================================
        // SCROLL TO RESULT
        // ==================================

        const resultsColumn =
          document.querySelector(
            ".results-column"
          );


        if (resultsColumn) {

          resultsColumn.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }


      } catch (error) {

        console.error(
          "Message Analyzer Error:",
          error
        );


        alert(
          error.message ||
          "Something went wrong while analyzing the message."
        );


      } finally {

        setLoadingState(false);

      }

    }
  );


  // ========================================
  // LOADING STATE
  // ========================================

  function setLoadingState(isLoading) {

    analyzeButton.disabled =
      isLoading;


    if (isLoading) {

      analyzeButton.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        AI is analyzing...
      `;

    } else {

      analyzeButton.innerHTML = `
        <i class="fa-solid fa-shield"></i>
        Analyze Message
      `;

    }

  }


  // ========================================
  // UPDATE COMPLETE ANALYSIS
  // ========================================

  function updateAnalysis(result) {

    if (!result) {
      return;
    }


    // ======================================
    // SCORE
    // ======================================

    const score =
      Number(result.score) || 0;


    if (riskScore) {

      riskScore.textContent =
        `${score}%`;

    }


    // ======================================
    // RISK LEVEL
    // ======================================

    const level =
      result.level || "Low";


    if (riskLevel) {

      riskLevel.textContent =
        `${level} Risk`;

    }


    // ======================================
    // EXPLANATION
    // ======================================

    if (riskDescription) {

      riskDescription.textContent =
        result.explanation ||
        "No detailed explanation was provided.";

    }


    // ======================================
    // APPLY RISK LEVEL CLASS
    // ======================================

    updateRiskLevelClass(level);


    // ======================================
    // CAUTION BADGE
    // ======================================

    if (cautionBadge) {

      if (
        result.isPotentialScam
      ) {

        cautionBadge.innerHTML = `
          <i class="fa-solid fa-circle-exclamation"></i>
          Be cautious!
        `;

        cautionBadge.classList.remove(
          "safe-badge"
        );

        cautionBadge.classList.add(
          "danger-badge"
        );

      } else {

        cautionBadge.innerHTML = `
          <i class="fa-solid fa-circle-check"></i>
          No major scam indicators
        `;

        cautionBadge.classList.remove(
          "danger-badge"
        );

        cautionBadge.classList.add(
          "safe-badge"
        );

      }

    }


    // ======================================
    // RISK FACTORS
    // ======================================

    renderRiskFactors(
      result.riskFactors || []
    );


    // ======================================
    // DETECTED ELEMENTS
    // ======================================

    renderDetectedElements(
      result
    );


    // ======================================
    // RECOMMENDATIONS
    // ======================================

    renderRecommendations(
      result.recommendations || []
    );

  }


  // ========================================
  // UPDATE RISK LEVEL CSS
  // ========================================

  function updateRiskLevelClass(level) {

    const normalized =
      String(level)
        .toLowerCase();


    if (!riskLevel) {
      return;
    }


    riskLevel.classList.remove(
      "risk-low",
      "risk-medium",
      "risk-high",
      "risk-critical"
    );


    riskLevel.classList.add(
      `risk-${normalized}`
    );

  }


  // ========================================
  // RENDER RISK FACTORS
  // ========================================

  function renderRiskFactors(
    factors
  ) {

    if (!riskList) {
      return;
    }


    riskList.innerHTML = "";


    if (
      !Array.isArray(factors) ||
      factors.length === 0
    ) {

      riskList.innerHTML = `
        <li class="empty-result">

          <span>
            <i class="fa-solid fa-circle-check"></i>
            No significant risk factors detected
          </span>

        </li>
      `;

      return;

    }


    factors.forEach(
      (factor) => {

        const item =
          document.createElement(
            "li"
          );


        const factorLevel =
          [
            "low",
            "medium",
            "high",
            "critical"
          ].includes(
            String(
              factor.level || ""
            ).toLowerCase()
          )
            ? String(
                factor.level
              ).toLowerCase()
            : "medium";


        item.innerHTML = `
          <span>

            <i class="risk-dot ${factorLevel}"></i>

            ${escapeHTML(
              factor.title ||
              "Risk indicator"
            )}

          </span>

          <strong
            class="risk-label ${factorLevel}"
          >
            ${capitalize(
              factorLevel
            )}
          </strong>
        `;


        item.title =
          factor.description || "";


        riskList.appendChild(
          item
        );

      }
    );

  }


  // ========================================
  // RENDER DETECTED ELEMENTS
  // ========================================

  function renderDetectedElements(
    result
  ) {

    if (!detectedPanel) {
      return;
    }


    detectedPanel.innerHTML = `
      <h2>Detected Elements</h2>
    `;


    const aiElements =
      Array.isArray(
        result.detectedElements
      )
        ? result.detectedElements
        : [];


    const addedElements =
      new Set();


    // ======================================
    // AI DETECTED ELEMENTS
    // ======================================

    aiElements.forEach(
      (element) => {

        if (
          !element ||
          !element.text
        ) {

          return;

        }


        const key =
          String(
            element.text
          ).toLowerCase();


        if (
          addedElements.has(key)
        ) {

          return;

        }


        addedElements.add(key);


        addDetectedElement(
          element.text,
          element.type ||
            "AI Detection",
          element.description ||
            "Detected by Gemini AI."
        );

      }
    );


    // ======================================
    // EXTRACTED URLS
    // ======================================

    const urls =
      result.detected?.urls || [];


    urls.forEach(
      (url) => {

        const key =
          String(url)
            .toLowerCase();


        if (
          addedElements.has(key)
        ) {

          return;

        }


        addedElements.add(key);


        addDetectedElement(
          url,
          "URL",
          "A web link was found in the message."
        );

      }
    );


    // ======================================
    // UPI IDS
    // ======================================

    const upiIds =
      result.detected?.upiIds || [];


    upiIds.forEach(
      (upi) => {

        const key =
          String(upi)
            .toLowerCase();


        if (
          addedElements.has(key)
        ) {

          return;

        }


        addedElements.add(key);


        addDetectedElement(
          upi,
          "UPI ID",
          "A UPI ID was found in the message."
        );

      }
    );


    // ======================================
    // PHONE NUMBERS
    // ======================================

    const phoneNumbers =
      result.detected?.phoneNumbers || [];


    phoneNumbers.forEach(
      (phone) => {

        const key =
          String(phone)
            .toLowerCase();


        if (
          addedElements.has(key)
        ) {

          return;

        }


        addedElements.add(key);


        addDetectedElement(
          phone,
          "Phone Number",
          "A phone number was found in the message."
        );

      }
    );


    // ======================================
    // EMPTY STATE
    // ======================================

    if (
      addedElements.size === 0
    ) {

      detectedPanel.innerHTML += `
        <div class="empty-detected">

          <i class="fa-solid fa-circle-check"></i>

          <span>
            No specific elements detected.
          </span>

        </div>
      `;

    }

  }


  // ========================================
  // ADD DETECTED ELEMENT
  // ========================================

  function addDetectedElement(
    text,
    type,
    description
  ) {

    const row =
      document.createElement(
        "div"
      );


    row.className =
      "detected-row";


    const icon =
      getDetectedIcon(type);


    row.innerHTML = `
      <span class="detected-icon">
        <i class="${icon}"></i>
      </span>

      <span class="detected-value">
        ${escapeHTML(text)}
      </span>

      <strong>
        ${escapeHTML(type)}
      </strong>
    `;


    row.title =
      description || "";


    detectedPanel.appendChild(
      row
    );

  }


  // ========================================
  // DETECTED ELEMENT ICON
  // ========================================

  function getDetectedIcon(
    type
  ) {

    const value =
      String(type || "")
        .toLowerCase();


    if (
      value.includes("url") ||
      value.includes("link")
    ) {

      return "fa-solid fa-link";

    }


    if (
      value.includes("upi")
    ) {

      return "fa-solid fa-indian-rupee-sign";

    }


    if (
      value.includes("phone") ||
      value.includes("number")
    ) {

      return "fa-solid fa-phone";

    }


    if (
      value.includes("payment") ||
      value.includes("money")
    ) {

      return "fa-solid fa-money-bill-transfer";

    }


    if (
      value.includes("otp") ||
      value.includes("pin") ||
      value.includes("credential")
    ) {

      return "fa-solid fa-key";

    }


    if (
      value.includes("account") ||
      value.includes("kyc")
    ) {

      return "fa-solid fa-user-shield";

    }


    if (
      value.includes("reward") ||
      value.includes("prize")
    ) {

      return "fa-solid fa-gift";

    }


    return "fa-solid fa-triangle-exclamation";

  }


  // ========================================
  // AI RECOMMENDATIONS
  // ========================================

  function renderRecommendations(
    recommendations
  ) {

    if (
      !Array.isArray(
        recommendations
      ) ||
      recommendations.length === 0
    ) {

      return;

    }


    let recommendationPanel =
      document.getElementById(
        "ai-recommendations"
      );


    if (!recommendationPanel) {

      recommendationPanel =
        document.createElement(
          "article"
        );


      recommendationPanel.id =
        "ai-recommendations";


      recommendationPanel.className =
        "panel ai-recommendations";


      detectedPanel.after(
        recommendationPanel
      );

    }


    recommendationPanel.innerHTML = `
      <h2>
        <i class="fa-solid fa-shield-heart"></i>
        AI Safety Recommendations
      </h2>
    `;


    recommendations.forEach(
      (recommendation) => {

        if (
          !recommendation ||
          !recommendation.title
        ) {

          return;

        }


        const item =
          document.createElement(
            "div"
          );


        item.className =
          "recommendation-item";


        item.innerHTML = `
          <div class="recommendation-icon">
            <i class="fa-solid fa-check"></i>
          </div>

          <div>

            <h3>
              ${escapeHTML(
                recommendation.title
              )}
            </h3>

            <p>
              ${escapeHTML(
                recommendation.description || ""
              )}
            </p>

          </div>
        `;


        recommendationPanel.appendChild(
          item
        );

      }
    );

  }


  // ========================================
  // CAPITALIZE
  // ========================================

  function capitalize(
    value
  ) {

    const text =
      String(value || "");


    return (
      text.charAt(0).toUpperCase() +
      text.slice(1)
    );

  }


  // ========================================
  // ESCAPE HTML
  // ========================================

  function escapeHTML(
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

});