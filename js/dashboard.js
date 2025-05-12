// /root/js/dashboard.js
import { supabase, initializeSupabase as initSupabaseService } from './supabaseClient.js';
import { getEl } from './ui.js'; // Assuming getEl is general enough
import { handleSendMagicLink, handleLogout, updateUIForAuthState } from './auth.js';
import { overlayControls, initializeControlDomElements, loadAllConfigs, setupSaveListeners } from './configManager.js';
import { initializeVisibilityToggles, setupStorageListener } from './visibilityManager.js';

const LOG_PREFIX_DASH_MAIN = "DashboardMain:";

// --- DOMContentLoaded & Main Execution Flow ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event START.");

    // This must be called first as other modules might query DOM elements via getEl
    // or expect overlayControls[n].domElements to be populated.
    initializeControlDomElements();

    // Initial UI state
    const authSectEl = getEl('authSection');
    const dashContentEl = getEl('dashboardContent');
    const magicLinkInstrEl = getEl('magicLinkInstructions');

    if(authSectEl) authSectEl.style.display = 'block';
    if(dashContentEl) dashContentEl.style.display = 'none';
    if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Checking authentication status...";


    // Attach event listeners for global auth buttons
    const sendMagicLnkBtn = getEl('sendMagicLinkButton');
    const logoutBtn = getEl('logoutButton');
    const copyUrlBtn = getEl('copyOverlayUrlButton');

    if (sendMagicLnkBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching event listener to sendMagicLinkButton.");
        sendMagicLnkBtn.addEventListener('click', handleSendMagicLink);
    } else { console.error(LOG_PREFIX_DASH_MAIN, "sendMagicLinkButton NOT FOUND!"); }

    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    else { console.error(LOG_PREFIX_DASH_MAIN, "logoutButton NOT FOUND!"); }

    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', async () => {
            const pubOverlayUrlInEl = getEl('publicOverlayUrl');
            const copyUrlFbEl = getEl('copyUrlFeedback');
            if (!pubOverlayUrlInEl || !pubOverlayUrlInEl.value) {
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'No URL.'; return;
            }
            try {
                await navigator.clipboard.writeText(pubOverlayUrlInEl.value);
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'Copied!';
                setTimeout(() => { if(copyUrlFbEl) copyUrlFbEl.textContent = ''; }, 2000);
            } catch (err) {
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'Copy failed.';
                console.error(LOG_PREFIX_DASH_MAIN, "Failed to copy URL:", err);
            }
        });
    } else { console.error(LOG_PREFIX_DASH_MAIN, "copyOverlayUrlButton NOT FOUND!");}


    const initialized = await initSupabaseService();
    
    if (initialized) {
        const initErrEl = getEl('initError');
        if(initErrEl) initErrEl.style.display = 'none';
        if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Enter your email and click \"Send Magic Link\".";

        setupSaveListeners();
        setupStorageListener();

        // This must use the supabase client instance from supabaseClient.js module
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(LOG_PREFIX_DASH_MAIN, `Auth state change event: ${event}`, "Session present:", !!session);
            updateUIForAuthState(session?.user || null);
        });

        console.log(LOG_PREFIX_DASH_MAIN, "Checking initial Supabase session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error(LOG_PREFIX_DASH_MAIN, "Error getting initial session:", sessionError);
            const authFeedbackElement = getEl('authFeedback'); // Use getEl
            if (authFeedbackElement) {
                authFeedbackElement.textContent = "Could not check login status. Try refreshing.";
                authFeedbackElement.className = 'feedback error';
                authFeedbackElement.style.display = 'block';
            }
            updateUIForAuthState(null);
        } else {
            console.log(LOG_PREFIX_DASH_MAIN, "Initial session result:", session);
            updateUIForAuthState(session?.user || null);
        }
    } else {
        console.warn(LOG_PREFIX_DASH_MAIN, "Supabase not initialized after DOMContentLoaded. Dashboard cannot function.");
        const authSectElAgain = getEl('authSection');
        const magicLinkInstrElAgain = getEl('magicLinkInstructions');
        if(authSectElAgain && magicLinkInstrElAgain) {
            authSectElAgain.innerHTML = `<p class="error" style="text-align:center;">Critical error: Could not connect to services. Please check configuration or network.</p>`;
            magicLinkInstrElAgain.style.display = 'none';
        }
    }
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event END.");
});
console.log("Dashboard script (main orchestrator): ENDING");
