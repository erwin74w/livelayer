// /root/js/dashboard.js
import { supabase, initializeSupabase as initSupabaseService } from './supabaseClient.js';
import { getEl } from './ui.js';
import { handleSendMagicLink, handleLogout, updateUIForAuthState, getCurrentUser } from './auth.js';
import { overlayControls, initializeControlDomElements, loadAllConfigs, setupSaveListeners, enableAllDashboardButtons, clearLoadedFlags } from './configManager.js';
import { initializeVisibilityToggles, setupStorageListener } from './visibilityManager.js';

const LOG_PREFIX_DASH_MAIN = "DashboardMain:";

// --- DOMContentLoaded & Main Execution Flow ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event START.");

    // Initialize DOM elements for controls first, as other modules might use them via overlayControls
    initializeControlDomElements();

    // Initial UI state
    const authSectEl = getEl('authSection');
    const dashContentEl = getEl('dashboardContent');
    const magicLinkInstrEl = getEl('magicLinkInstructions');

    if(authSectEl) authSectEl.style.display = 'block';
    if(dashContentEl) dashContentEl.style.display = 'none';
    if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Checking authentication status...";


    // Attach event listeners for auth buttons
    const sendMagicLnkBtn = getEl('sendMagicLinkButton');
    const logoutBtn = getEl('logoutButton');
    const copyUrlBtn = getEl('copyOverlayUrlButton'); // Ensure this element exists in HTML and ID matches

    if (sendMagicLnkBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching event listener to sendMagicLinkButton.");
        sendMagicLnkBtn.addEventListener('click', handleSendMagicLink);
    } else { console.error(LOG_PREFIX_DASH_MAIN, "sendMagicLinkButton NOT FOUND!"); }

    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    else { console.error(LOG_PREFIX_DASH_MAIN, "logoutButton NOT FOUND!"); }

    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', async () => {
            const pubOverlayUrlInEl = getEl('publicOverlayUrl');
            const copyUrlFbEl = getEl('copyUrlFeedback'); // Make sure this element exists in HTML
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


    const initialized = await initSupabaseService(); // Call the imported init function
    
    if (initialized) {
        const initErrEl = getEl('initError');
        if(initErrEl) initErrEl.style.display = 'none';
        if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Enter your email and click \"Send Magic Link\".";

        setupSaveListeners(); // Setup save listeners after supabase is init and elements are known
        setupStorageListener(); // Setup listener for localStorage changes

        // This must use the supabase client instance from supabaseClient.js
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(LOG_PREFIX_DASH_MAIN, `Auth state change event: ${event}`, "Session present:", !!session);
            updateUIForAuthState(session?.user || null); // updateUIForAuthState from auth.js
        });

        console.log(LOG_PREFIX_DASH_MAIN, "Checking initial Supabase session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error(LOG_PREFIX_DASH_MAIN, "Error getting initial session:", sessionError);
            // showAuthFeedback might not be available if ui.js not fully linked or error
            const authFeedbackElement = getEl('authFeedback');
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
