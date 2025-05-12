// /root/js/auth.js
import { supabase } from './supabaseClient.js'; // We'll create supabaseClient.js next
import { showAuthFeedback } from './ui.js';
import { loadAllConfigs, initializeVisibilityToggles, enableAllDashboardButtons, disableAllDashboardButtons, clearLoadedFlags } from './configManager.js'; // Will import functions from configManager

const LOG_PREFIX_AUTH = "DashboardAuth:";
let currentUser = null;

export function getCurrentUser() {
    return currentUser;
}

export async function handleSendMagicLink() {
    const authEmailInputEl = document.getElementById('authEmail'); // Consider passing this from main dashboard.js
    const sendMagicLinkButtonEl = document.getElementById('sendMagicLinkButton');

    console.log(LOG_PREFIX_AUTH, "handleSendMagicLink called.");
    if (!supabase) { // Check if supabase (the global from CDN) is available
        showAuthFeedback("Supabase library not loaded.", false);
        console.error(LOG_PREFIX_AUTH, "Supabase global not ready.");
        return;
    }
     if (!supabase.auth) { // Check if auth module is available
        showAuthFeedback("Supabase auth module not ready.", false);
        console.error(LOG_PREFIX_AUTH, "Supabase auth not ready.");
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

    const redirectTo = window.location.href;
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
    const logoutButtonEl = document.getElementById('logoutButton'); // Consider passing
    if (!supabase || !supabase.auth) { console.warn(LOG_PREFIX_AUTH, "Logout: Supabase client/auth not ready."); return; }
    console.log(LOG_PREFIX_AUTH, "Attempting logout...");
    if(logoutButtonEl) logoutButtonEl.disabled = true;

    const { error } = await supabase.auth.signOut();

    if(logoutButtonEl) logoutButtonEl.disabled = false;
    if (error) {
        console.error(LOG_PREFIX_AUTH, "Error during logout:", error);
        // showConfigFeedback(getEl('initError'), `Logout error: ${error.message}`, false); // getEl might not be available if ui.js not imported here
    } else {
        console.log(LOG_PREFIX_AUTH, "Logout successful.");
        currentUser = null;
        // UI update handled by onAuthStateChange in dashboard.js
    }
}

export function updateUIForAuthState(user) {
    console.log(LOG_PREFIX_AUTH, "updateUIForAuthState called with user:", user ? user.id : 'null');
    currentUser = user;

    const authSectionEl = document.getElementById('authSection');
    const dashboardContentEl = document.getElementById('dashboardContent');
    const userEmailDisplayEl = document.getElementById('userEmailDisplay');
    const publicOverlayUrlEl = document.getElementById('publicOverlayUrl');

    if (user) {
        console.log(LOG_PREFIX_AUTH, "User IS authenticated. Showing dashboard content.");
        if(authSectionEl) authSectionEl.style.display = 'none';
        if(dashboardContentEl) dashboardContentEl.style.display = 'block';
        if(userEmailDisplayEl) userEmailDisplayEl.textContent = user.email || user.id;

        const baseDomain = window.location.origin;
        const pathSegments = window.location.pathname.split('/');
        pathSegments.pop();
        const basePath = pathSegments.join('/');
        const userSpecificOverlayUrl = `${baseDomain}${basePath}/index.html?user=${user.id}`;
        if(publicOverlayUrlEl) publicOverlayUrlEl.value = userSpecificOverlayUrl;

        enableAllDashboardButtons(); // Call function from configManager

        if (dashboardContentEl && dashboardContentEl.dataset.configsLoaded !== "true") {
            console.log(LOG_PREFIX_AUTH, "Loading configs and initializing toggles for the first time in this session.");
            loadAllConfigs(); // From configManager.js
            initializeVisibilityToggles(); // From visibilityManager.js
            dashboardContentEl.dataset.configsLoaded = "true";
        } else {
            console.log(LOG_PREFIX_AUTH, "Configs already loaded for this session, skipping reload.");
        }
    } else {
        console.log(LOG_PREFIX_AUTH, "User IS NOT authenticated. Showing auth section.");
        if(authSectionEl) authSectionEl.style.display = 'block';
        if(dashboardContentEl) {
            dashboardContentEl.style.display = 'none';
            dashboardContentEl.dataset.configsLoaded = "false";
        }
        disableAllDashboardButtons(); // Call function from configManager
    }
}
