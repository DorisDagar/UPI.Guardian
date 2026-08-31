
// ======================================================
// UPI GUARDIAN — GLOBAL SCAM TIMELINE
// ======================================================


// ======================================================
// AUTH
// ======================================================

const token =
    localStorage.getItem(
        "upiGuardianToken"
    );


if (!token) {

    window.location.replace(
        "login.html"
    );

}


// ======================================================
// API BASE URL
// ======================================================

const API_BASE_URL =
    window.location.port === "5000"
        ? ""
        : "http://localhost:5000";


// ======================================================
// STATE
// ======================================================

const state = {

    events: [],

    filteredEvents: [],

    filter: "all",

    search: "",

};


// ======================================================
// DOM
// ======================================================

const timelineContainer =
    document.getElementById(
        "timelineContainer"
    );

const eventCount =
    document.getElementById(
        "eventCount"
    );

const statusElement =
    document.getElementById(
        "status"
    );

const searchInput =
    document.getElementById(
        "searchInput"
    );

const filters =
    document.querySelectorAll(
        ".filter"
    );

const modal =
    document.getElementById(
        "eventModal"
    );

const modalIcon =
    document.getElementById(
        "modalIcon"
    );

const modalType =
    document.getElementById(
        "modalType"
    );

const modalTitle =
    document.getElementById(
        "modalTitle"
    );

const modalTime =
    document.getElementById(
        "modalTime"
    );

const modalContent =
    document.getElementById(
        "modalContent"
    );


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value = "") {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ======================================================
// API
// ======================================================

async function api(path) {

    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
            {

                method:
                    "GET",

                headers: {

                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`,

                },

                cache:
                    "no-store",

            }
        );


    const data =
        await response
            .json()
            .catch(
                () => ({})
            );


    if (
        response.status ===
        401
    ) {

        localStorage.removeItem(
            "upiGuardianToken"
        );

        localStorage.removeItem(
            "upiGuardianUser"
        );

        window.location.replace(
            "login.html"
        );

        throw new Error(
            "Session expired"
        );

    }


    if (!response.ok) {

        throw new Error(
            data.message ||
            data.error ||
            "Unable to load Scam Timeline."
        );

    }


    return data;

}


// ======================================================
// DATE
// ======================================================

function dateObject(value) {

    const date =
        new Date(value);


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


function dayKey(value) {

    const date =
        dateObject(value);


    if (!date) {
        return "unknown";
    }


    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        ),

    ].join("-");

}


// ======================================================
// DATE LABEL
// ======================================================

function dayLabel(value) {

    const date =
        dateObject(value);


    if (!date) {
        return "DATE UNAVAILABLE";
    }


    const now =
        new Date();


    const yesterday =
        new Date(now);


    yesterday.setDate(
        yesterday.getDate() - 1
    );


    if (
        dayKey(date) ===
        dayKey(now)
    ) {

        return "TODAY";

    }


    if (
        dayKey(date) ===
        dayKey(yesterday)
    ) {

        return "YESTERDAY";

    }


    return date
        .toLocaleDateString(
            "en-IN",
            {

                weekday:
                    "long",

                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric",

            }
        )
        .toUpperCase();

}


// ======================================================
// TIME
// ======================================================

function timeLabel(value) {

    const date =
        dateObject(value);


    if (!date) {
        return "Time unavailable";
    }


    return date
        .toLocaleTimeString(
            "en-IN",
            {

                hour:
                    "numeric",

                minute:
                    "2-digit",

            }
        );

}


// ======================================================
// FULL DATE
// ======================================================

function fullDateLabel(value) {

    const date =
        dateObject(value);


    if (!date) {
        return "Date unavailable";
    }


    return date
        .toLocaleString(
            "en-IN",
            {

                weekday:
                    "long",

                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric",

                hour:
                    "numeric",

                minute:
                    "2-digit",

            }
        );

}


// ======================================================
// MONEY
// ======================================================

function money(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return null;

    }


    const amount =
        Number(value);


    if (
        !Number.isFinite(
            amount
        )
    ) {

        return null;

    }


    return new Intl.NumberFormat(
        "en-IN",
        {

            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                0,

        }
    ).format(
        amount
    );

}


// ======================================================
// NORMALIZE TYPE
// ======================================================

function eventType(event) {

    const type =
        String(
            event.type ||
            ""
        ).toLowerCase();


    if (
        type === "transaction"
    ) {

        return "payment";

    }


    return type;

}


// ======================================================
// NORMALIZE RISK
// ======================================================

function eventRisk(event) {

    const risk =
        String(
            event.risk ||
            event.riskLevel ||
            ""
        ).toLowerCase();


    if (
        risk === "high"
    ) {

        return "high";

    }


    if (
        risk === "medium" ||
        risk === "moderate"
    ) {

        return "medium";

    }


    if (
        risk === "safe" ||
        risk === "low"
    ) {

        return "safe";

    }


    return "unknown";

}


// ======================================================
// RISK TEXT
// ======================================================

function riskText(event) {

    const risk =
        eventRisk(event);


    if (
        risk === "high"
    ) {

        return "High risk";

    }


    if (
        risk === "medium"
    ) {

        return "Medium risk";

    }


    if (
        risk === "safe"
    ) {

        return "Safe";

    }


    return "Security event";

}


// ======================================================
// ICON
// ======================================================

function eventIcon(event) {

    if (
        event.icon
    ) {

        return event.icon;

    }


    const type =
        eventType(event);


    const icons = {

        message:
            "message",

        payment:
            "money-bill-transfer",

        qr_scan:
            "qrcode",

        payment_request:
            "inbox",

        protection:
            "shield-halved",

    };


    return (
        icons[type] ||
        "shield-halved"
    );

}


// ======================================================
// TYPE LABEL
// ======================================================

function typeLabel(event) {

    const type =
        eventType(event);


    const labels = {

        message:
            "Message Analyzer",

        payment:
            "Payment",

        qr_scan:
            "QR / Scan",

        payment_request:
            "Payment Request",

        protection:
            "Protection",

    };


    return (
        labels[type] ||
        "Security Event"
    );

}


// ======================================================
// MARKER CLASS
// ======================================================

function markerClass(event) {

    const risk =
        eventRisk(event);


    if (
        risk === "high"
    ) {

        return "high";

    }


    if (
        risk === "medium"
    ) {

        return "medium";

    }


    if (
        risk === "safe"
    ) {

        return "safe";

    }


    return "info";

}


// ======================================================
// ICON CLASS
// ======================================================

function iconClass(event) {

    const risk =
        eventRisk(event);


    if (
        risk === "high"
    ) {

        return "icon-high";

    }


    if (
        risk === "medium"
    ) {

        return "icon-medium";

    }


    if (
        risk === "safe"
    ) {

        return "icon-safe";

    }


    if (
        eventType(event) ===
        "payment_request"
    ) {

        return "icon-purple";

    }


    return "icon-info";

}


// ======================================================
// STATUS CLASS
// ======================================================

function statusClass(value) {

    const status =
        String(
            value || ""
        ).toLowerCase();


    if (
        status.includes(
            "protect"
        ) ||
        status.includes(
            "pause"
        ) ||
        status.includes(
            "allow"
        ) ||
        status.includes(
            "safe"
        )
    ) {

        return "protected";

    }


    if (
        status.includes(
            "block"
        )
    ) {

        return "blocked";

    }


    return "";

}


// ======================================================
// SEARCH TEXT
// ======================================================

function searchableText(event) {

    return [

        event.title,

        event.description,

        event.type,

        event.risk,

        event.riskLevel,

        event.status,

        event.receiverName,

        event.receiverUpiId,

        event.transactionReference,

        event.messageText,

    ]

        .filter(
            (value) =>
                value !== null &&
                value !== undefined
        )

        .join(" ")

        .toLowerCase();

}


// ======================================================
// FILTER
// ======================================================

function applyFilters() {

    const search =
        state.search
            .trim()
            .toLowerCase();


    state.filteredEvents =
        state.events.filter(
            (event) => {

                const type =
                    eventType(
                        event
                    );

                const risk =
                    eventRisk(
                        event
                    );


                let matchesFilter =
                    true;


                if (
                    state.filter ===
                    "high"
                ) {

                    matchesFilter =
                        risk === "high";

                }


                else if (
                    state.filter ===
                    "message"
                ) {

                    matchesFilter =
                        type === "message";

                }


                else if (
                    state.filter ===
                    "payment"
                ) {

                    matchesFilter =
                        type === "payment";

                }


                const matchesSearch =
                    !search ||
                    searchableText(
                        event
                    ).includes(
                        search
                    );


                return (
                    matchesFilter &&
                    matchesSearch
                );

            }
        );


    renderTimeline();

}


// ======================================================
// META
// ======================================================

function buildMeta(event) {

    const html = [];


    const amount =
        money(
            event.amount
        );


    if (amount) {

        html.push(`
            <span>
                <i class="fa-solid fa-indian-rupee-sign"></i>
                ${escapeHtml(amount)}
            </span>
        `);

    }


    if (
        event.receiverUpiId
    ) {

        html.push(`
            <span>
                <i class="fa-solid fa-at"></i>
                ${escapeHtml(
                    event.receiverUpiId
                )}
            </span>
        `);

    }


    if (
        event.receiverName
    ) {

        html.push(`
            <span>
                <i class="fa-solid fa-user"></i>
                ${escapeHtml(
                    event.receiverName
                )}
            </span>
        `);

    }


    if (
        event.inputType
    ) {

        html.push(`
            <span>
                <i class="fa-solid fa-file-lines"></i>
                ${escapeHtml(
                    event.inputType ===
                    "screenshot"
                        ? "Screenshot"
                        : "Text message"
                )}
            </span>
        `);

    }


    return html.join("");

}


// ======================================================
// EVENT CARD
// ======================================================

function eventMarkup(
    event,
    index,
    total
) {

    const risk =
        eventRisk(event);


    const status =
        event.status
            ? String(
                event.status
              )
            : "";


    const meta =
        buildMeta(
            event
        );


    const score =
        event.riskScore !== null &&
        event.riskScore !== undefined
            ? ` · ${escapeHtml(
                String(
                    event.riskScore
                )
              )}/100`
            : "";


    return `

        <article class="timeline-item">

            <div class="event-time">
                ${escapeHtml(
                    timeLabel(
                        event.eventTime
                    )
                )}
            </div>


            <div class="marker-column">

                <div
                    class="marker ${markerClass(
                        event
                    )}"
                ></div>

                ${
                    index <
                    total - 1
                        ? `
                            <div class="connector"></div>
                          `
                        : ""
                }

            </div>


            <div class="timeline-card">

                <div class="card-top">

                    <div class="card-title">

                        <div
                            class="card-icon ${iconClass(
                                event
                            )}"
                        >
                            <i
                                class="fa-solid fa-${escapeHtml(
                                    eventIcon(
                                        event
                                    )
                                )}"
                            ></i>
                        </div>

                        <h3>
                            ${escapeHtml(
                                event.title ||
                                "Security event"
                            )}
                        </h3>

                    </div>

                    <span class="type-label">
                        ${escapeHtml(
                            typeLabel(
                                event
                            )
                        )}
                    </span>

                </div>


                ${
                    event.description
                        ? `
                            <p class="card-description">
                                ${escapeHtml(
                                    event.description
                                )}
                            </p>
                          `
                        : ""
                }


                ${
                    meta
                        ? `
                            <div class="meta">
                                ${meta}
                            </div>
                          `
                        : ""
                }


                <div class="card-bottom">

                    <span
                        class="risk ${risk}"
                    >

                        <i class="fa-solid fa-shield-halved"></i>

                        ${escapeHtml(
                            riskText(
                                event
                            )
                        )}

                        ${score}

                    </span>


                    ${
                        status
                            ? `
                                <span
                                    class="status-text ${statusClass(
                                        status
                                    )}"
                                >
                                    ${escapeHtml(
                                        status
                                    )}
                                </span>
                              `
                            : ""
                    }

                </div>


                <button
                    type="button"
                    class="details-button"
                    data-event-id="${escapeHtml(
                        event.id
                    )}"
                >

                    View details

                    <i class="fa-solid fa-arrow-right"></i>

                </button>

            </div>

        </article>

    `;

}


// ======================================================
// GROUP BY DAY
// ======================================================

function groupEvents(events) {

    const groups =
        new Map();


    events.forEach(
        (event) => {

            const key =
                dayKey(
                    event.eventTime
                );


            if (
                !groups.has(key)
            ) {

                groups.set(
                    key,
                    {

                        label:
                            dayLabel(
                                event.eventTime
                            ),

                        events: [],

                    }
                );

            }


            groups
                .get(key)
                .events
                .push(event);

        }
    );


    return Array.from(
        groups.values()
    );

}


// ======================================================
// RENDER
// ======================================================

function renderTimeline() {

    if (
        !timelineContainer
    ) {

        return;

    }


    const visible =
        state.filteredEvents.length;


    const total =
        state.events.length;


    if (
        statusElement
    ) {

        statusElement.textContent =
            visible === total
                ? `${total} ${
                    total === 1
                        ? "event"
                        : "events"
                  } in your security history.`
                : `Showing ${visible} of ${total} events.`;

    }


    if (
        !visible
    ) {

        timelineContainer.innerHTML = `

            <div class="empty">

                <i class="fa-solid ${
                    state.search
                        ? "fa-magnifying-glass"
                        : "fa-shield-halved"
                }"></i>

                <h3>
                    ${
                        state.search
                            ? "No matching events"
                            : "No security events yet"
                    }
                </h3>

                <p>
                    ${
                        state.search
                            ? "Try another search term."
                            : "Your security activity will appear here as Guardian records it."
                    }
                </p>

            </div>

        `;

        return;

    }


    const groups =
        groupEvents(
            state.filteredEvents
        );


    timelineContainer.innerHTML =
        groups
            .map(
                (group) => `

                    <section class="day-section">

                        <div class="day-heading">
                            <span>
                                ${escapeHtml(
                                    group.label
                                )}
                            </span>
                        </div>

                        ${group.events
                            .map(
                                (
                                    event,
                                    index
                                ) =>
                                    eventMarkup(
                                        event,
                                        index,
                                        group.events.length
                                    )
                            )
                            .join("")}

                    </section>

                `
            )
            .join("");


    timelineContainer
        .querySelectorAll(
            "[data-event-id]"
        )
        .forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        openModal(
                            button.dataset.eventId
                        );

                    }
                );

            }
        );

}


// ======================================================
// LOAD
// ======================================================

async function loadTimeline() {

    if (
        !timelineContainer
    ) {

        return;

    }


    timelineContainer.innerHTML = `

        <div class="loading">

            <div class="spinner"></div>

            <p>
                Loading your security activity...
            </p>

        </div>

    `;


    try {

        const data =
            await api(
                "/api/scam-timeline"
            );


        state.events =
            Array.isArray(
                data.events
            )
                ? data.events
                : [];


        // Newest first
        state.events.sort(
            (a, b) =>
                new Date(
                    b.eventTime
                ) -
                new Date(
                    a.eventTime
                )
        );


        state.filteredEvents =
            [...state.events];


        if (
            eventCount
        ) {

            eventCount.textContent =
                state.events.length;

        }


        if (
            statusElement
        ) {

            statusElement.textContent =
                `${state.events.length} ${
                    state.events.length === 1
                        ? "event"
                        : "events"
                } loaded from your account.`;

        }


        renderTimeline();

    }

    catch (error) {

        console.error(
            "Scam Timeline error:",
            error
        );


        if (
            error.message ===
            "Session expired"
        ) {

            return;

        }


        timelineContainer.innerHTML = `

            <div class="error">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Unable to load Scam Timeline
                </h3>

                <p>
                    ${escapeHtml(
                        error.message ||
                        "Something went wrong while loading your timeline."
                    )}
                </p>

                <button
                    type="button"
                    class="retry"
                    id="retryTimeline"
                >
                    <i class="fa-solid fa-rotate-right"></i>
                    Try again
                </button>

            </div>

        `;


        document
            .getElementById(
                "retryTimeline"
            )
            ?.addEventListener(
                "click",
                loadTimeline
            );

    }

}


// ======================================================
// MODAL
// ======================================================

function openModal(eventId) {

    const event =
        state.events.find(
            (item) =>
                String(
                    item.id
                ) ===
                String(eventId)
        );


    if (
        !event
    ) {

        return;

    }


    if (
        modalIcon
    ) {

        modalIcon.innerHTML = `

            <i class="fa-solid fa-${escapeHtml(
                eventIcon(
                    event
                )
            )}"></i>

        `;

    }


    if (
        modalType
    ) {

        modalType.textContent =
            typeLabel(
                event
            ).toUpperCase();

    }


    if (
        modalTitle
    ) {

        modalTitle.textContent =
            event.title ||
            "Security event";

    }


    if (
        modalTime
    ) {

        modalTime.textContent =
            fullDateLabel(
                event.eventTime
            );

    }


    if (
        modalContent
    ) {

        modalContent.innerHTML =
            detailMarkup(
                event
            );

    }


    if (
        modal
    ) {

        modal.hidden =
            false;

        document.body.style.overflow =
            "hidden";

    }

}


// ======================================================
// DETAILS
// ======================================================

function detailMarkup(event) {

    const sections = [];


    // Risk
    sections.push(`

        <section class="detail-section">

            <h4>
                Risk assessment
            </h4>

            <div class="detail-grid">

                <div class="detail-box">

                    <span>
                        Risk level
                    </span>

                    <strong>
                        ${escapeHtml(
                            riskText(
                                event
                            )
                        )}
                    </strong>

                </div>

                <div class="detail-box">

                    <span>
                        Risk score
                    </span>

                    <strong>
                        ${
                            event.riskScore !== null &&
                            event.riskScore !== undefined
                                ? `${escapeHtml(
                                    String(
                                        event.riskScore
                                    )
                                  )}/100`
                                : "Not available"
                        }
                    </strong>

                </div>

            </div>

        </section>

    `);


    // Payment
    if (
        event.amount !== null &&
        event.amount !== undefined
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Payment details
                </h4>

                <div class="detail-grid">

                    <div class="detail-box">

                        <span>
                            Amount
                        </span>

                        <strong>
                            ${escapeHtml(
                                money(
                                    event.amount
                                ) || "-"
                            )}
                        </strong>

                    </div>


                    ${
                        event.receiverName
                            ? `
                                <div class="detail-box">

                                    <span>
                                        Receiver
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            event.receiverName
                                        )}
                                    </strong>

                                </div>
                              `
                            : ""
                    }


                    ${
                        event.receiverUpiId
                            ? `
                                <div class="detail-box">

                                    <span>
                                        UPI ID
                                    </span>

                                    <strong>
                                        ${escapeHtml(
                                            event.receiverUpiId
                                        )}
                                    </strong>

                                </div>
                              `
                            : ""
                    }

                </div>

            </section>

        `);

    }


    // Message
    if (
        event.messageText
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Message
                </h4>

                <p>
                    ${escapeHtml(
                        event.messageText
                    )}
                </p>

            </section>

        `);

    }


    // Description
    if (
        event.description
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Explanation
                </h4>

                <p>
                    ${escapeHtml(
                        event.description
                    )}
                </p>

            </section>

        `);

    }


    // Risk factors
    if (
        Array.isArray(
            event.riskFactors
        ) &&
        event.riskFactors.length
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Risk factors
                </h4>

                <ul class="detail-list">

                    ${event.riskFactors
                        .map(
                            (item) => `
                                <li>
                                    ${escapeHtml(
                                        item
                                    )}
                                </li>
                            `
                        )
                        .join("")}

                </ul>

            </section>

        `);

    }


    // Detected elements
    if (
        Array.isArray(
            event.detectedElements
        ) &&
        event.detectedElements.length
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Detected scam signals
                </h4>

                <ul class="detail-list">

                    ${event.detectedElements
                        .map(
                            (item) => `
                                <li>
                                    ${escapeHtml(
                                        item
                                    )}
                                </li>
                            `
                        )
                        .join("")}

                </ul>

            </section>

        `);

    }


    // URLs
    if (
        Array.isArray(
            event.detectedUrls
        ) &&
        event.detectedUrls.length
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Detected URLs
                </h4>

                <p>
                    ${escapeHtml(
                        event.detectedUrls.join(
                            ", "
                        )
                    )}
                </p>

            </section>

        `);

    }


    // UPI IDs
    if (
        Array.isArray(
            event.detectedUpiIds
        ) &&
        event.detectedUpiIds.length
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Detected UPI IDs
                </h4>

                <p>
                    ${escapeHtml(
                        event.detectedUpiIds.join(
                            ", "
                        )
                    )}
                </p>

            </section>

        `);

    }


    // Recommendations
    if (
        Array.isArray(
            event.recommendations
        ) &&
        event.recommendations.length
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Guardian recommendations
                </h4>

                <ul class="detail-list">

                    ${event.recommendations
                        .map(
                            (item) => `
                                <li>
                                    ${escapeHtml(
                                        item
                                    )}
                                </li>
                            `
                        )
                        .join("")}

                </ul>

            </section>

        `);

    }


    // Status
    if (
        event.status
    ) {

        sections.push(`

            <section class="detail-section">

                <h4>
                    Guardian status
                </h4>

                <p>
                    ${escapeHtml(
                        String(
                            event.status
                        )
                    )}
                </p>

            </section>

        `);

    }


    return sections.join("");

}


// ======================================================
// CLOSE MODAL
// ======================================================

function closeModal() {

    if (
        modal
    ) {

        modal.hidden =
            true;

        document.body.style.overflow =
            "";

    }

}


// ======================================================
// FILTER BUTTONS
// ======================================================

filters.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                filters.forEach(
                    (item) =>
                        item.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                state.filter =
                    button.dataset.filter ||
                    "all";


                applyFilters();

            }
        );

    }
);


// ======================================================
// SEARCH
// ======================================================

searchInput?.addEventListener(
    "input",
    () => {

        state.search =
            searchInput.value ||
            "";

        applyFilters();

    }
);


// ======================================================
// CLOSE MODAL
// ======================================================

document
    .querySelectorAll(
        "[data-close-modal]"
    )
    .forEach(
        (element) => {

            element.addEventListener(
                "click",
                closeModal
            );

        }
    );


// ======================================================
// ESCAPE KEY
// ======================================================

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Escape"
        ) {

            closeModal();

        }

    }
);


// ======================================================
// START
// ======================================================

loadTimeline();

