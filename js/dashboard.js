// /root/js/dashboard.js
import { supabase, initializeSupabase as initSupabaseService } from './supabaseClient.js';
import { getEl } from './ui.js'; // getEl is used here
import { handleSendMagicLink, handleLogout, updateUIForAuthState } from './auth.js';
import { initializeControlDomElements, setupSaveListeners } from './configManager.js'; // loadAllConfigs, enable/disable buttons are called from auth.js
import { initializeVisibilityToggles, setupStorageListener } from './visibilityManager.js';

const LOG_PREFIX_DASH_MAIN = "DashboardMain:";

// --- DOMContentLoaded & Main Execution Flow ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event START.");

    // This must be called first as other modules might query DOM elements via getEl
    // or expect overlayControls[n].domElements to be populated when their functions are called.
    initializeControlDomElements(); // From configManager.js

    // Get references to global buttons *inside* DOMContentLoaded
    // These elements are part of the main dashboard structure, not individual overlay controls.
    const sendMagicLnkBtn = getEl('sendMagicLinkButton');
    const logoutBtn = getEl('logoutButton');
    const copyUrlBtn = getEl('copyOverlayUrlButton');
    const authSectEl = getEl('authSection');
    const dashContentEl = getEl('dashboardContent');
    const magicLinkInstrEl = getEl('magicLinkInstructions');
    const initErrElGlobal = getEl('initError'); // For global init error display

    // Initial UI state
    if(authSectEl) authSectEl.style.display = 'block'; // Show auth form by default
    if(dashContentEl) dashContentEl.style.display = 'none'; // Hide dashboard content
    if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Checking authentication status...";


    // Attach event listeners for global auth buttons
    if (sendMagicLnkBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching event listener to sendMagicLinkButton.");
        sendMagicLnkBtn.addEventListener('click', handleSendMagicLink);
    } else { console.error(LOG_PREFIX_DASH_MAIN, "CRITICAL: sendMagicLinkButton (ID: sendMagicLinkButton) NOT FOUND!"); }

    if (logoutBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching event listener to logoutButton.");
        logoutBtn.addEventListener('click', handleLogout);
    } else { console.error(LOG_PREFIX_DASH_MAIN, "CRITICAL: logoutButton (ID: logoutButton) NOT FOUND!"); }

    if (copyUrlBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching event listener to copyOverlayUrlButton.");
        copyUrlBtn.addEventListener('click', async () => {
            const pubOverlayUrlInEl = getEl('publicOverlayUrl'); // Element holding the URL
            const copyUrlFbEl = getEl('copyUrlFeedback');       // Element for "Copied!"/"Failed"
            if (!pubOverlayUrlInEl || !pubOverlayUrlInEl.value) {
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'No URL to copy.';
                console.warn(LOG_PREFIX_DASH_MAIN, "Copy URL: No URL input or value.");
                return;
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
    } else { console.error(LOG_PREFIX_DASH_MAIN, "CRITICAL: copyOverlayUrlButton (ID: copyOverlayUrlButton) NOT FOUND!");}


    const initialized = await initSupabaseService(); // From supabaseClient.js
    
    if (initialized) {
        if(initErrElGlobal) initErrElGlobal.style.display = 'none'; // Hide global init error if successful
        if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Enter your email and click \"Send Magic Link\".";

        setupSaveListeners();       // From configManager.js
        setupStorageListener();     // From visibilityManager.js

        // This must use the supabase client instance from supabaseClient.js module
        // (which is exported as 'supabase')
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(LOG_PREFIX_DASH_MAIN, `Auth state change event: ${event}`, "Session present:", !!session);
            updateUIForAuthState(session?.user || null); // updateUIForAuthState from auth.js
        });

        console.log(LOG_PREFIX_DASH_MAIN, "Checking initial Supabase session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error(LOG_PREFIX_DASH_MAIN, "Error getting initial session:", sessionError);
            const authFeedbackElement = getEl('authFeedback'); // Use getEl for consistency
            if (authFeedbackElement) {
                authFeedbackElement.textContent = "Could not check login status. Try refreshing.";
                authFeedbackElement.className = 'feedback error';
                authFeedbackElement.style.display = 'block';
            }
            updateUIForAuthState(null); // Ensure auth form is shown on error
        } else {
            console.log(LOG_PREFIX_DASH_MAIN, "Initial session result:", session);
            updateUIForAuthState(session?.user || null);
        }
    } else {
        console.warn(LOG_PREFIX_DASH_MAIN, "Supabase not initialized after DOMContentLoaded. Dashboard cannot function.");
        // initErrorEl message is already set by initializeSupabase() in this case.
        const authSectElAgain = getEl('authSection');
        const magicLinkInstrElAgain = getEl('magicLinkInstructions');
        if(authSectElAgain && magicLinkInstrElAgain) {
            authSectElAgain.innerHTML = `<p class="error" style="text-align:center;">Critical error: Could not connect to services. Please check configuration or network.</p>`;
            magicLinkInstrElAgain.style.display = 'none';
        }
    }
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event END.");
});
console.log("Dashboard script (main orchestrator): js/dashboard.js ENDING");
