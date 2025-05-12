// /root/js/ui.js
const LOG_PREFIX_DASH_UI = "DashboardUI:";

export function getEl(id) {
    const el = document.getElementById(id);
    // if (!el) {
    //     console.warn(LOG_PREFIX_DASH_UI, `Element with ID '${id}' not found.`);
    // }
    return el;
}

export function showAuthFeedback(message, isSuccess, duration = isSuccess ? 4000 : 7000) {
    const el = getEl('authFeedback'); // Assumes 'authFeedback' ID exists in HTML
    if (!el) { console.error(LOG_PREFIX_DASH_UI, "authFeedbackEl not found for message:", message); return; }
    el.textContent = message;
    el.className = 'feedback ' + (isSuccess ? 'success' : 'error');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, duration);
}

export function showConfigFeedback(element, message, isSuccess) {
    if (!element) { console.warn(LOG_PREFIX_DASH_UI, "Feedback element for config not provided. Message:", message); return; }
    element.textContent = message;
    element.className = 'feedback ' + (isSuccess ? 'success' : 'error');
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 4000);
}

// Add other UI specific helper functions here if needed
