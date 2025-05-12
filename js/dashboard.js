// /root/js/dashboard.js
// --- START SCRIPT ---
console.log("Dashboard script: js/dashboard.js STARTING");

const LOG_PREFIX_DASH = "Dashboard:";
let supabaseClient = null;
let currentUser = null;
let initialAuthCheckDone = false;

// DOM Elements need to be selected after DOM is loaded, or functions need to be careful
// For now, we'll select them within DOMContentLoaded or pass them around.
// However, top-level constants for IDs are fine.

const initErrorElId = 'initError';
const authSectionElId = 'authSection';
const dashboardContentElId = 'dashboardContent';
const authEmailInputElId = 'authEmail';
const sendMagicLinkButtonElId = 'sendMagicLinkButton';
const authFeedbackElId = 'authFeedback';
const userEmailDisplayElId = 'userEmailDisplay';
const logoutButtonElId = 'logoutButton';
const publicOverlayUrlElId = 'publicOverlayUrl';
const copyOverlayUrlButtonElId = 'copyOverlayUrlButton';
const copyUrlFeedbackElId = 'copyUrlFeedback';
const magicLinkInstructionsElId = 'magicLinkInstructions';


// --- Utility & Feedback ---
function getEl(id) { return document.getElementById(id); }

function showAuthFeedback(message, isSuccess, duration = isSuccess ? 4000 : 7000) {
    const el = getEl(authFeedbackElId);
    if (!el) { console.error(LOG_PREFIX_DASH, "authFeedbackEl not found!"); return; }
    el.textContent = message;
    el.className = 'feedback ' + (isSuccess ? 'success' : 'error');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, duration);
}

function showConfigFeedback(element, message, isSuccess) {
    // element is expected to be a direct DOM element reference here
    if (!element) { console.warn(LOG_PREFIX_DASH, "Feedback element for config not found. Message:", message); return; }
    element.textContent = message;
    element.className = 'feedback ' + (isSuccess ? 'success' : 'error');
    element.style.display = 'block';
    setTimeout(() => { element.style.display = 'none'; }, 4000);
}


// --- Supabase Initialization ---
async function initializeSupabase() {
    console.log(LOG_PREFIX_DASH, "initializeSupabase(): START");
    try {
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Attempting to fetch 'keys.json'...");
        const response = await fetch('keys.json'); // Assumes keys.json is in the same root as dashboard.html
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): 'keys.json' fetch response status:", response.status);

        if (!response.ok) {
            let errorText = "Could not retrieve response text.";
            try { errorText = await response.text(); } catch(e) { /* ignore */ }
            console.error(LOG_PREFIX_DASH, `initializeSupabase(): Failed to fetch 'keys.json'. Status: ${response.status}. Response text: ${errorText}`);
            throw new Error(`HTTP ${response.status} fetching keys.json. Body: ${errorText}`);
        }

        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Attempting to parse 'keys.json'...");
        const keys = await response.json();
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Parsed 'keys.json'. URL found:", !!keys.supabaseUrl, "Key found:", !!keys.supabaseAnonKey);

        if (!keys.supabaseUrl || !keys.supabaseAnonKey || keys.supabaseUrl.includes("YOUR_ACTUAL") || keys.supabaseAnonKey.includes("YOUR_ACTUAL")) {
            console.error(LOG_PREFIX_DASH, "initializeSupabase(): Supabase URL/Key missing or still placeholder in keys.json.", "URL:", keys.supabaseUrl);
            throw new Error("Supabase URL/Key missing or placeholder in keys.json.");
        }
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Keys validated.");

        if (typeof supabase === 'undefined' || !supabase.createClient) {
            console.error(LOG_PREFIX_DASH, "initializeSupabase(): Supabase global object or createClient function is not available. Check CDN script.");
            throw new Error("Supabase library not loaded correctly.");
        }
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Supabase global object found. Attempting to create client...");
        const { createClient } = supabase;
        supabaseClient = createClient(keys.supabaseUrl, keys.supabaseAnonKey);

        if (!supabaseClient) {
             console.error(LOG_PREFIX_DASH, "initializeSupabase(): supabaseClient is null after createClient call.");
             throw new Error("Failed to create Supabase client instance.");
        }
        console.log(LOG_PREFIX_DASH, "initializeSupabase(): Supabase client initialized successfully.");
        return true;

    } catch (error) {
        console.error(LOG_PREFIX_DASH, "initializeSupabase(): CATCH BLOCK - Failed to initialize Supabase:", error.message, error);
        const initErrEl = getEl(initErrorElId);
        if(initErrEl) {
            initErrEl.textContent = `Supabase Initialization Error: ${error.message}. Cannot proceed.`;
            initErrEl.style.display = 'block';
        }
        const authSectEl = getEl(authSectionElId);
        if(authSectEl) authSectEl.style.display = 'none';
        return false;
    }
}

// --- Authentication Logic ---
async function handleSendMagicLink() {
    console.log(LOG_PREFIX_DASH, "handleSendMagicLink called.");
    if (!supabaseClient) {
        showAuthFeedback("Supabase not initialized. Cannot send magic link.", false);
        console.error(LOG_PREFIX_DASH, "handleSendMagicLink: Supabase client not ready.");
        return;
    }
    const emailInput = getEl(authEmailInputElId);
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) {
        showAuthFeedback("Please enter your email.", false);
        return;
    }

    console.log(LOG_PREFIX_DASH, "handleSendMagicLink: Disabling button, email:", email);
    const sendBtn = getEl(sendMagicLinkButtonElId);
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
    }

    const redirectTo = window.location.href;
    console.log(LOG_PREFIX_DASH, "Magic Link redirectTo:", redirectTo);

    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: redirectTo }
        });

        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Magic Link';
        }

        if (error) {
            console.error(LOG_PREFIX_DASH, "Magic link error:", error);
            showAuthFeedback(`Error: ${error.message}`, false);
        } else {
            console.log(LOG_PREFIX_DASH, "Magic link request successful for:", email);
            showAuthFeedback("Magic link sent! Check your email (and spam folder). Click the link to log in here.", true);
        }
    } catch (e) {
         console.error(LOG_PREFIX_DASH, "Exception in handleSendMagicLink:", e);
         showAuthFeedback("An unexpected error occurred. Please try again.", false);
         if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Magic Link';
         }
    }
}

async function handleLogout() {
    const logoutBtn = getEl(logoutButtonElId);
    if (!supabaseClient) { console.warn(LOG_PREFIX_DASH, "Logout: Supabase client not ready."); return; }
    console.log(LOG_PREFIX_DASH, "Attempting logout...");
    if(logoutBtn) logoutBtn.disabled = true;

    const { error } = await supabaseClient.auth.signOut();

    if(logoutBtn) logoutBtn.disabled = false;
    if (error) {
        console.error(LOG_PREFIX_DASH, "Error during logout:", error);
        showConfigFeedback(getEl(initErrorElId), `Logout error: ${error.message}`, false);
    } else {
        console.log(LOG_PREFIX_DASH, "Logout successful.");
        currentUser = null;
        // UI update handled by onAuthStateChange
    }
}

function updateUIForAuthState(user) {
    console.log(LOG_PREFIX_DASH, "updateUIForAuthState called with user:", user ? user.id : 'null');
    currentUser = user;
    initialAuthCheckDone = true;

    const authSectEl = getEl(authSectionElId);
    const dashContentEl = getEl(dashboardContentElId);
    const userEmailDispEl = getEl(userEmailDisplayElId);
    const pubOverlayUrlEl = getEl(publicOverlayUrlElId);

    if (user) {
        console.log(LOG_PREFIX_DASH, "User IS authenticated. Showing dashboard content.");
        if(authSectEl) authSectEl.style.display = 'none';
        if(dashContentEl) dashContentEl.style.display = 'block';
        if(userEmailDispEl) userEmailDispEl.textContent = user.email || user.id;

        const baseDomain = window.location.origin;
        const pathSegments = window.location.pathname.split('/');
        pathSegments.pop();
        const basePath = pathSegments.join('/');
        const userSpecificOverlayUrl = `${baseDomain}${basePath}/index.html?user=${user.id}`;
        if(pubOverlayUrlEl) pubOverlayUrlEl.value = userSpecificOverlayUrl;

        document.querySelectorAll('details button.config-save-button, details button.toggle-visibility-button').forEach(btn => btn.disabled = false);

        if (dashContentEl && dashContentEl.dataset.configsLoaded !== "true") {
            console.log(LOG_PREFIX_DASH, "Loading configs and initializing toggles for the first time in this session.");
            loadAllConfigs();
            initializeVisibilityToggles();
            dashContentEl.dataset.configsLoaded = "true";
        } else {
            console.log(LOG_PREFIX_DASH, "Configs already loaded for this session or dashboardContentEl not found, skipping reload.");
        }
    } else {
        console.log(LOG_PREFIX_DASH, "User IS NOT authenticated. Showing auth section.");
        if(authSectEl) authSectEl.style.display = 'block';
        if(dashContentEl) {
            dashContentEl.style.display = 'none';
            dashContentEl.dataset.configsLoaded = "false";
        }
        document.querySelectorAll('details button.config-save-button, details button.toggle-visibility-button').forEach(btn => btn.disabled = true);
    }
}

// --- Overlay Control Configuration Array ---
// This array drives the entire dashboard.
const overlayControls = [
    {
        type: 'logo',
        displayName: 'Logo',
        elements: { // IDs used here will be constructed with getEl
            loading: 'loading-logo',
            saveButton: 'save-logo',
            feedback: 'feedback-logo',
            url: 'input-logo-url',
            toggleButton: 'toggle-logo'
        },
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        load: async function() { // 'this' refers to this control object, access elements via this.domElements
            const { data, error } = await supabaseClient.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) throw error;
            if (data && data.config_data) {
                this.domElements.url.value = data.config_data.url || '../pictures/overlay1.png';
            } else { this.domElements.url.value = '../pictures/overlay1.png';}
        },
        save: async function() {
            const configData = { url: this.domElements.url.value.trim() };
            if (!configData.url) { throw new Error("Logo URL cannot be empty."); }
            return configData;
        }
    },
    {
        type: 'ticker',
        displayName: 'Ticker',
        elements: {
            loading: 'loading-ticker',
            saveButton: 'save-ticker',
            feedback: 'feedback-ticker',
            messages: 'input-ticker-messages',
            separator: 'input-ticker-separator',
            manualJsonContainer: 'manualJsonContainer-ticker',
            manualJsonTextarea: 'manualJsonTextarea-ticker',
            copyManualJsonButton: 'copyManualJsonButton-ticker',
            copyManualFeedback: 'copyManualFeedback-ticker',
            toggleButton: 'toggle-ticker'
        },
        visibility: { storageKey: 'overlay2Visibility', textShow: 'Show Ticker', textHide: 'Hide Ticker', isVisible: false },
        load: async function() {
            const { data, error } = await supabaseClient.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) throw error;
            if (data && data.config_data) {
                this.domElements.messages.value = data.config_data.messages.join('\n');
                this.domElements.separator.value = data.config_data.separator;
            } else {
                this.domElements.messages.value = '';
                this.domElements.separator.value = ' +++ ';
            }
        },
        save: async function() {
            const messages = this.domElements.messages.value.trim().split('\n').map(s => s.trim()).filter(s => s);
            const separator = this.domElements.separator.value.trim();
            const configData = { messages, separator };
            if (this.domElements.manualJsonTextarea) this.domElements.manualJsonTextarea.value = JSON.stringify(configData, null, 2);
            return configData;
        }
    },
    {
        type: 'lower_third',
        displayName: 'Lower Third',
        elements: {
            loading: 'loading-lower_third',
            saveButton: 'save-lower_third',
            feedback: 'feedback-lower_third',
            name: 'input-lower_third-name',
            function: 'input-lower_third-function',
            affiliation: 'input-lower_third-affiliation',
            toggleButton: 'toggle-lower_third'
        },
        visibility: { storageKey: 'overlay3Visibility', textShow: 'Show Lower Third', textHide: 'Hide Lower Third', isVisible: false },
        load: async function() {
            const { data, error } = await supabaseClient.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) throw error;
            if (data && data.config_data) {
                this.domElements.name.value = data.config_data.name || '';
                this.domElements.function.value = data.config_data.function || '';
                this.domElements.affiliation.value = data.config_data.affiliation || '';
            } else {
                this.domElements.name.value = '';
                this.domElements.function.value = '';
                this.domElements.affiliation.value = '';
            }
        },
        save: async function() {
            return {
                name: this.domElements.name.value.trim(),
                function: this.domElements.function.value.trim(),
                affiliation: this.domElements.affiliation.value.trim()
            };
        }
    }
];

// Function to hydrate the 'elements' in overlayControls with actual DOM elements
function initializeControlDomElements() {
    console.log(LOG_PREFIX_DASH, "Initializing DOM elements for overlayControls...");
    overlayControls.forEach(control => {
        control.domElements = {}; // Create a new object to store actual elements
        for (const key in control.elements) {
            control.domElements[key] = getEl(control.elements[key]);
            if (!control.domElements[key] && key !== 'manualJsonContainer' && key !== 'manualJsonTextarea' && key !== 'copyManualJsonButton' && key !== 'copyManualFeedback') { // Optional elements
                console.warn(LOG_PREFIX_DASH, `DOM element with ID '${control.elements[key]}' for control '${control.type}' key '${key}' not found!`);
            }
        }
    });
    console.log(LOG_PREFIX_DASH, "DOM elements for overlayControls initialized.");
}


// --- Generic Load and Save Config Logic ---
async function loadAllConfigs() {
    if (!supabaseClient || !currentUser) { console.warn(LOG_PREFIX_DASH, "Cannot load configs, Supabase not ready or no user."); return; }
    console.log(LOG_PREFIX_DASH, "Loading all configurations for user:", currentUser.id);
    for (const control of overlayControls) {
        if (control.domElements.loading) control.domElements.loading.style.display = 'inline';
        try {
            console.log(LOG_PREFIX_DASH, `Loading config for: ${control.type}`);
            await control.load(); // 'this' will be implicitly 'control'
            console.log(LOG_PREFIX_DASH, `Config loaded for: ${control.type}`);
        } catch (error) {
            console.error(LOG_PREFIX_DASH, `Error loading config for ${control.type}:`, error.message, error);
            showConfigFeedback(control.domElements.feedback, `Error loading: ${error.message}`, false);
        } finally {
            if (control.domElements.loading) control.domElements.loading.style.display = 'none';
        }
    }
}

function setupSaveListeners() {
    console.log(LOG_PREFIX_DASH, "Setting up save listeners...");
    overlayControls.forEach(control => {
        if (control.domElements.saveButton) {
            control.domElements.saveButton.addEventListener('click', async () => {
                console.log(LOG_PREFIX_DASH, `Save button clicked for: ${control.type}`);
                if (!supabaseClient || !currentUser) {
                    showConfigFeedback(control.domElements.feedback, 'Not logged in or Supabase not ready.', false); return;
                }
                control.domElements.saveButton.disabled = true;
                control.domElements.saveButton.textContent = 'Saving...';
                try {
                    const configData = await control.save(); // 'this' will be 'control'
                    console.log(LOG_PREFIX_DASH, `Attempting to save for ${control.type} (user: ${currentUser.id}):`, configData);
                    const { data: upsertData, error } = await supabaseClient.from('overlay_configurations').upsert(
                        { overlay_type: control.type, config_data: configData, user_id: currentUser.id },
                        { onConflict: 'user_id, overlay_type' }
                    );
                    if (error) throw error;
                    console.log(LOG_PREFIX_DASH, `Save successful for ${control.type}. Response:`, upsertData);
                    showConfigFeedback(control.domElements.feedback, `${control.displayName} config saved!`, true);
                    if (control.domElements.manualJsonContainer) control.domElements.manualJsonContainer.style.display = 'none';
                } catch (error) {
                    console.error(LOG_PREFIX_DASH, `Error saving config for ${control.type}:`, error.message, error);
                    showConfigFeedback(control.domElements.feedback, `Error saving: ${error.message}`, false);
                    if (control.domElements.manualJsonContainer && control.type === 'ticker') {
                        control.domElements.manualJsonContainer.style.display = 'block';
                    }
                } finally {
                    control.domElements.saveButton.disabled = false;
                    control.domElements.saveButton.textContent = `Save ${control.displayName} Config`;
                }
            });
        }
        // Ticker specific manual copy button
        if (control.type === 'ticker' && control.domElements.copyManualJsonButton) {
             control.domElements.copyManualJsonButton.addEventListener('click', async () => {
                const tickerTextarea = control.domElements.manualJsonTextarea;
                const feedbackEl = control.domElements.copyManualFeedback;
                if (tickerTextarea && feedbackEl) {
                    try {
                        await navigator.clipboard.writeText(tickerTextarea.value);
                        feedbackEl.textContent = 'Copied!';
                        setTimeout(() => { feedbackEl.textContent = ''; }, 2000);
                    } catch (err) {
                        feedbackEl.textContent = 'Failed to copy.';
                    }
                }
            });
        }
    });
    console.log(LOG_PREFIX_DASH, "Save listeners set up.");
}


// --- Visibility Toggle Logic ---
function updateVisibilityButtonUI(control) {
    if (!control.domElements.toggleButton) return;
    if (control.visibility.isVisible) {
        control.domElements.toggleButton.textContent = control.visibility.textHide;
        control.domElements.toggleButton.classList.remove('button-show-state');
        control.domElements.toggleButton.classList.add('button-hide-state');
    } else {
        control.domElements.toggleButton.textContent = control.visibility.textShow;
        control.domElements.toggleButton.classList.remove('button-hide-state');
        control.domElements.toggleButton.classList.add('button-show-state');
    }
}
function setOverlayVisibilityInStorage(storageKey, visible) {
    localStorage.setItem(storageKey, visible ? 'show' : 'hide');
    localStorage.setItem(storageKey + 'Timestamp', Date.now());
    console.log(LOG_PREFIX_DASH, `Set ${storageKey} to ${visible ? 'show' : 'hide'} in localStorage.`);
}
function initializeVisibilityToggles() {
    console.log(LOG_PREFIX_DASH, "Initializing visibility toggles...");
    overlayControls.forEach(control => {
        if (control.domElements.toggleButton && control.visibility) {
            const persistedState = localStorage.getItem(control.visibility.storageKey);
            control.visibility.isVisible = (persistedState === 'show');
            if (persistedState !== 'show' && persistedState !== 'hide') {
               setOverlayVisibilityInStorage(control.visibility.storageKey, false);
            }
            updateVisibilityButtonUI(control);
            control.domElements.toggleButton.addEventListener('click', () => {
                control.visibility.isVisible = !control.visibility.isVisible;
                updateVisibilityButtonUI(control);
                setOverlayVisibilityInStorage(control.visibility.storageKey, control.visibility.isVisible);
            });
        }
    });
    console.log(LOG_PREFIX_DASH, "Visibility toggles initialized.");
}
window.addEventListener('storage', (event) => {
     overlayControls.forEach(control => {
        if (control.domElements.toggleButton && control.visibility && event.key === control.visibility.storageKey) {
            console.log(LOG_PREFIX_DASH, `Storage event for ${control.visibility.storageKey}, new value: ${event.newValue}`);
            control.visibility.isVisible = (event.newValue === 'show');
            updateVisibilityButtonUI(control);
        }
    });
});

// --- DOMContentLoaded & Main Execution Flow ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log(LOG_PREFIX_DASH, "DOMContentLoaded event START.");

    // Initialize DOM elements for controls first
    initializeControlDomElements();

    // Initial UI state
    const authSectEl = getEl(authSectionElId); // Re-fetch after getEl is defined for sure
    const dashContentEl = getEl(dashboardContentElId);
    const magicLinkInstrEl = getEl(magicLinkInstructionsElId);

    if(authSectEl) authSectEl.style.display = 'block';
    if(dashContentEl) dashContentEl.style.display = 'none';
    if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Checking authentication status...";


    // Attach event listeners for auth buttons
    const sendMagicLnkBtn = getEl(sendMagicLinkButtonElId);
    const logoutBtn = getEl(logoutButtonElId);
    const copyUrlBtn = getEl(copyOverlayUrlButtonElId);

    if (sendMagicLnkBtn) {
        console.log(LOG_PREFIX_DASH, "Attaching event listener to sendMagicLinkButton.");
        sendMagicLnkBtn.addEventListener('click', handleSendMagicLink);
    } else { console.error(LOG_PREFIX_DASH, "sendMagicLinkButtonEl NOT FOUND!"); }

    if (logoutBtn) { logoutBtn.addEventListener('click', handleLogout); }
    else { console.error(LOG_PREFIX_DASH, "logoutButtonEl NOT FOUND!"); }

    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', async () => {
            const pubOverlayUrlInEl = getEl(publicOverlayUrlElId);
            const copyUrlFbEl = getEl(copyUrlFeedbackElId);
            if (!pubOverlayUrlInEl || !pubOverlayUrlInEl.value) {
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'No URL.'; return;
            }
            try {
                await navigator.clipboard.writeText(pubOverlayUrlInEl.value);
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'Copied!';
                setTimeout(() => { if(copyUrlFbEl) copyUrlFbEl.textContent = ''; }, 2000);
            } catch (err) {
                if(copyUrlFbEl) copyUrlFbEl.textContent = 'Copy failed.';
                console.error(LOG_PREFIX_DASH, "Failed to copy URL:", err);
            }
        });
    } else { console.error(LOG_PREFIX_DASH, "copyOverlayUrlButtonEl NOT FOUND!");}


    const initialized = await initializeSupabase();
    
    if (initialized) {
        const initErrEl = getEl(initErrorElId); // Re-fetch
        if(initErrEl) initErrEl.style.display = 'none';
        if(magicLinkInstrEl) magicLinkInstrEl.textContent = "Enter your email and click \"Send Magic Link\". Check your inbox for a login link.";

        setupSaveListeners(); // Setup save listeners after supabase is init and elements are known

        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log(LOG_PREFIX_DASH, `Auth state change event: ${event}`, "Session present:", !!session);
            updateUIForAuthState(session?.user || null);
        });

        console.log(LOG_PREFIX_DASH, "Checking initial Supabase session...");
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError) {
            console.error(LOG_PREFIX_DASH, "Error getting initial session:", sessionError);
            showAuthFeedback("Could not check login status. Try refreshing.", false);
            updateUIForAuthState(null);
        } else {
            console.log(LOG_PREFIX_DASH, "Initial session result:", session);
            updateUIForAuthState(session?.user || null);
        }
    } else {
        console.warn(LOG_PREFIX_DASH, "Supabase not initialized after DOMContentLoaded. Dashboard cannot function.");
        const authSectElAgain = getEl(authSectionElId); // Re-fetch
        const magicLinkInstrElAgain = getEl(magicLinkInstructionsElId);
        if(authSectElAgain && magicLinkInstrElAgain) {
            authSectElAgain.innerHTML = `<p class="error" style="text-align:center;">Critical error: Could not connect to services. Please check configuration or network.</p>`;
            magicLinkInstrElAgain.style.display = 'none';
        }
    }
    console.log(LOG_PREFIX_DASH, "DOMContentLoaded event END.");
});
console.log("Dashboard script: ENDING");
// --- END SCRIPT ---
