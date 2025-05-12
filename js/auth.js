// /root/js/auth.js
import { supabase } from './supabaseClient.js'; // Imports the initialized client instance
import { showAuthFeedback, getEl } from './ui.js';
import { loadAllConfigs, initializeControlDomElements, enableAllDashboardButtons, disableAllDashboardButtons } from './configManager.js';
import { initializeVisibilityToggles } from './visibilityManager.js';

const LOG_PREFIX_AUTH = "DashboardAuth:";
let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export async function handleSendMagicLink() {
    const authEmailInputEl = getEl('authEmail');
    const sendMagicLinkButtonEl = getEl('sendMagicLinkButton');

    console.log(LOG_PREFIX_AUTH, "handleSendMagicLink called.");
    if (!supabase) {
        showAuthFeedback("Supabase client not initialized.", false);
        console.error(LOG_PREFIX_AUTH, "Supabase client not ready for magic link.");
        return;
    }

    const email = authEmailInputEl ? authEmailInputEl.value.trim() : '';
    if (!email) {
        showAuthFeedback("Please enter your email.", false);
        return;
    }

    console.log(LOG_PREFIX_AUTH, "handleSendMagicLink: Disabling button, email:", email);
    if (sendMagicLinkButtonEl) {
        sendMagicLinkButtonEl.disabled = true;
        sendMagicLinkButtonEl.textContent = 'Sending...';
    }

    const redirectTo = window.location.href; // User should be on dashboard.html
    console.log(LOG_PREFIX_AUTH, "Magic Link redirectTo:", redirectTo);

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: redirectTo }
        });

        if (sendMagicLinkButtonEl) {
            sendMagicLinkButtonEl.disabled = false;
            sendMagicLinkButtonEl.textContent = 'Send Magic Link';
        }

        if (error) {
            console.error(LOG_PREFIX_AUTH, "Magic link error:", error);
            showAuthFeedback(`Error: ${error.message}`, false);
        } else {
            console.log(LOG_PREFIX_AUTH, "Magic link request successful for:", email);
            showAuthFeedback("Magic link sent! Check your email (and spam folder). Click the link to log in here.", true);
        }
    } catch (e) {
         console.error(LOG_PREFIX_AUTH, "Exception in handleSendMagicLink:", e);
         showAuthFeedback("An unexpected error occurred. Please try again.", false);
         if (sendMagicLinkButtonEl) {
            sendMagicLinkButtonEl.disabled = false;
            sendMagicLinkButtonEl.textContent = 'Send Magic Link';
         }
    }
}

export async function handleLogout() {
    const logoutButtonEl = getEl('logoutButton');
    if (!supabase) { console.warn(LOG_PREFIX_AUTH, "Logout: Supabase client not ready."); return; }
    console.log(LOG_PREFIX_AUTH, "Attempting logout...");
    if(logoutButtonEl) logoutButtonEl.disabled = true;

    const { error } = await supabase.auth.signOut();

    if(logoutButtonEl) logoutButtonEl.disabled = false; // Re-enable regardless of error, onAuthStateChange handles UI
    if (error) {
        console.error(LOG_PREFIX_AUTH, "Error during logout:", error);
        // Consider showing feedback using showAuthFeedback or a general error display
    } else {
        console.log(LOG_PREFIX_AUTH, "Logout successful.");
        currentUser = null; // Explicitly clear, though onAuthStateChange should handle
    }
}

export function updateUIForAuthState(user) {
    console.log(LOG_PREFIX_AUTH, "updateUIForAuthState called with user:", user ? user.id : 'null');
    currentUser = user;

    const authSectionEl = getEl('authSection');
    const dashboardContentEl = getEl('dashboardContent');
    const userEmailDisplayEl = getEl('userEmailDisplay');
    const publicOverlayUrlEl = getEl('publicOverlayUrl');

    if (user) {
        console.log(LOG_PREFIX_AUTH, "User IS authenticated. Showing dashboard content.");
        if(authSectionEl) authSectionEl.style.display = 'none';
        if(dashboardContentEl) dashboardContentEl.style.display = 'block';
        if(userEmailDisplayEl) userEmailDisplayEl.textContent = user.email || user.id;

        const baseDomain = window.location.origin;
        const pathSegments = window.location.pathname.split('/');
        pathSegments.pop(); // Remove current filename (dashboard.html)
        const basePath = pathSegments.join('/');
        const userSpecificOverlayUrl = `${baseDomain}${basePath}/index.html?user=${user.id}`;
        if(publicOverlayUrlEl) publicOverlayUrlEl.value = userSpecificOverlayUrl;

        enableAllDashboardButtons();

        if (dashboardContentEl && dashboardContentEl.dataset.configsLoaded !== "true") {
            console.log(LOG_PREFIX_AUTH, "Loading configs and initializing toggles for the first time in this session.");
            loadAllConfigs();
            initializeVisibilityToggles();
            dashboardContentEl.dataset.configsLoaded = "true";
        } else {
            console.log(LOG_PREFIX_AUTH, "Configs already loaded for this session or dashboardContentEl not found, skipping reload.");
        }
    } else {
        console.log(LOG_PREFIX_AUTH, "User IS NOT authenticated. Showing auth section.");
        if(authSectionEl) authSectionEl.style.display = 'block';
        if(dashboardContentEl) {
            dashboardContentEl.style.display = 'none';
            dashboardContentEl.dataset.configsLoaded = "false"; // Reset flag for next login
        }
        disableAllDashboardButtons();
    }
}
