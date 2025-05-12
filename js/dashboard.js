// /root/js/dashboard.js
import { supabase, initializeSupabase as initSupabaseService } from './supabaseClient.js';
import { getEl } from './ui.js'; // Assuming getEl is general enough
import { handleSendMagicLink, handleLogout, updateUIForAuthState } from './auth.js';
import { overlayControls, initializeControlDomElements, loadAllConfigs, setupSaveListeners } from './configManager.js';
import { initializeVisibilityToggles, setupStorageListener } from './visibilityManager.js';

const LOG_PREFIX_DASH_MAIN = "DashboardMain:";
console.log(LOG_PREFIX_DASH_MAIN, "Script loaded and parsed."); // Earliest log

// --- DOMContentLoaded & Main Execution Flow ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event START.");

    // This must be called first as other modules might query DOM elements via getEl
    // or expect overlayControls[n].domElements to be populated.
    console.log(LOG_PREFIX_DASH_MAIN, "Calling initializeControlDomElements...");
    initializeControlDomElements();
    console.log(LOG_PREFIX_DASH_MAIN, "initializeControlDomElements complete.");


    // Initial UI state
    const authSectEl = getEl('authSection');
    const dashContentEl = getEl('dashboardContent');
    const magicLinkInstrEl = getEl('magicLinkInstructions');

    if(authSectEl) authSectEl.style.display = 'block';
    if(dashContentEl) dashContentEl.style.display = 'none';
    if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Checking authentication status...";


    // Attach event listeners for global auth buttons
    console.log(LOG_PREFIX_DASH_MAIN, "Attempting to get sendMagicLinkButton element...");
    const sendMagicLnkBtn = getEl('sendMagicLinkButton');
    console.log(LOG_PREFIX_DASH_MAIN, "sendMagicLinkButton element is:", sendMagicLnkBtn); // <<< CRITICAL LOG

    if (sendMagicLnkBtn) {
        console.log(LOG_PREFIX_DASH_MAIN, "Attaching 'click' event listener to sendMagicLinkButton.");
        sendMagicLnkBtn.addEventListener('click', handleSendMagicLink);
        console.log(LOG_PREFIX_DASH_MAIN, "'click' event listener ATTACHED to sendMagicLinkButton."); // <<< CRITICAL LOG
    } else {
        console.error(LOG_PREFIX_DASH_MAIN, "CRITICAL ERROR: sendMagicLinkButton (ID: sendMagicLinkButton) NOT FOUND in DOM! Cannot attach listener.");
    }

    const logoutBtn = getEl('logoutButton');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log(LOG_PREFIX_DASH_MAIN, "Event listener attached to logoutButton.");
    } else { console.error(LOG_PREFIX_DASH_MAIN, "logoutButton NOT FOUND!"); }

    const copyUrlBtn = getEl('copyOverlayUrlButton');
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
        console.log(LOG_PREFIX_DASH_MAIN, "Event listener attached to copyOverlayUrlButton.");
    } else { console.error(LOG_PREFIX_DASH_MAIN, "copyOverlayUrlButton NOT FOUND!");}


    console.log(LOG_PREFIX_DASH_MAIN, "Calling initSupabaseService...");
    const initialized = await initSupabaseService();
    console.log(LOG_PREFIX_DASH_MAIN, "initSupabaseService returned:", initialized);
    
    if (initialized && supabase) { // Also check if supabase client is not null
        const initErrEl = getEl('initError');
        if(initErrEl) initErrEl.style.display = 'none';
        if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Enter your email and click \"Send Magic Link\".";

        console.log(LOG_PREFIX_DASH_MAIN, "Setting up save listeners and storage listener...");
        setupSaveListeners();
        setupStorageListener();
        console.log(LOG_PREFIX_DASH_MAIN, "Listeners set up.");


        console.log(LOG_PREFIX_DASH_MAIN, "Setting up onAuthStateChange listener...");
        supabase.auth.onAuthStateChange((event, session) => {
            console.log(LOG_PREFIX_DASH_MAIN, `Auth state change event: ${event}`, "Session present:", !!session);
            updateUIForAuthState(session?.user || null);
        });
        console.log(LOG_PREFIX_DASH_MAIN, "onAuthStateChange listener set up.");


        console.log(LOG_PREFIX_DASH_MAIN, "Checking initial Supabase session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error(LOG_PREFIX_DASH_MAIN, "Error getting initial session:", sessionError);
            const authFeedbackElement = getEl('authFeedback');
            if (authFeedbackElement) {
                authFeedbackElement.textContent = "Could not check login status. Try refreshing.";
                authFeedbackElement.className = 'feedback error';
                authFeedbackElement.style.display = 'block';
            }
            updateUIForAuthState(null); // Ensure auth form is shown
        } else {
            console.log(LOG_PREFIX_DASH_MAIN, "Initial session result:", session);
            updateUIForAuthState(session?.user || null); // This will trigger loading configs if user is logged in
        }
    } else {
        console.warn(LOG_PREFIX_DASH_MAIN, "Supabase not initialized after DOMContentLoaded. Dashboard cannot function properly.");
        const authSectElAgain = getEl('authSection');
        const magicLinkInstrElAgain = getEl('magicLinkInstructions');
        if(authSectElAgain && magicLinkInstrElAgain) {
            authSectElAgain.innerHTML = `<p class="error" style="text-align:center;">Critical error: Could not connect to services. Please check configuration or network.</p>`;
            magicLinkInstrElAgain.style.display = 'none';
        }
        // Ensure all config/toggle buttons are disabled if Supabase fails to init
        document.querySelectorAll('details button').forEach(btn => btn.disabled = true);
    }
    console.log(LOG_PREFIX_DASH_MAIN, "DOMContentLoaded event END.");
});
console.log("Dashboard script (main orchestrator): ENDING");
