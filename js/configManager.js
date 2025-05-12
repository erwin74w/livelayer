// /root/js/configManager.js
import { supabase, initializeSupabase } from './supabaseClient.js';
import { getEl, showConfigFeedback } from './ui.js';
import { getCurrentUser } from './auth.js'; // To get currentUser if needed for save

const LOG_PREFIX_CONFIG_MGR = "ConfigManager:";

// This array is the heart of the configuration.
// It now stores element IDs, and the actual elements are fetched when needed or once.
export const overlayControls = [
    // ... (Same structure as before, but load/save will use 'this.elements' which are now IDs)
    // We will hydrate 'this.domElements' from 'this.elements' (IDs) later.
    {
        type: 'logo',
        displayName: 'Logo',
        elements: { // Store IDs here
            loading: 'loading-logo', saveButton: 'save-logo', feedback: 'feedback-logo',
            url: 'input-logo-url', toggleButton: 'toggle-logo'
        },
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        load: async function() { /* ... */ }, save: async function() { /* ... */ }
    },
    // ... Ticker and Lower Third definitions similar to above ...
];
// (Make sure to fill in the load and save functions for each control.
// They will access DOM elements via this.domElements.url.value etc.
// this.domElements will be populated by initializeControlDomElements)


// Function to populate 'domElements' property on each control object
export function initializeControlDomElements() {
    console.log(LOG_PREFIX_CONFIG_MGR, "Initializing DOM elements for overlayControls...");
    overlayControls.forEach(control => {
        control.domElements = {}; // Will store actual DOM element references
        for (const key in control.elements) {
            control.domElements[key] = getEl(control.elements[key]); // Fetch element by ID
            // Add warning if critical element not found
            if (!control.domElements[key] && !['manualJsonContainer', 'manualJsonTextarea', 'copyManualJsonButton', 'copyManualFeedback'].includes(key)) {
                 console.warn(LOG_PREFIX_CONFIG_MGR, `DOM element ID '${control.elements[key]}' for '${control.type}.${key}' not found!`);
            }
        }
    });
}

export async function loadAllConfigs() {
    const user = getCurrentUser();
    if (!supabase || !user) { console.warn(LOG_PREFIX_CONFIG_MGR, "Cannot load configs, Supabase not ready or no user."); return; }
    console.log(LOG_PREFIX_CONFIG_MGR, "Loading all configurations for user:", user.id);

    for (const control of overlayControls) {
        if (control.domElements.loading) control.domElements.loading.style.display = 'inline';
        try {
            console.log(LOG_PREFIX_CONFIG_MGR, `Loading config for: ${control.type}`);
            // The load method on control object will use this.domElements
            await control.load();
            console.log(LOG_PREFIX_CONFIG_MGR, `Config loaded for: ${control.type}`);
        } catch (error) {
            console.error(LOG_PREFIX_CONFIG_MGR, `Error loading config for ${control.type}:`, error.message, error);
            showConfigFeedback(control.domElements.feedback, `Error loading: ${error.message}`, false);
        } finally {
            if (control.domElements.loading) control.domElements.loading.style.display = 'none';
        }
    }
}

export function setupSaveListeners() {
    console.log(LOG_PREFIX_CONFIG_MGR, "Setting up save listeners...");
    overlayControls.forEach(control => {
        if (control.domElements.saveButton) {
            control.domElements.saveButton.addEventListener('click', async () => {
                // ... (Full save logic from previous dashboard.js, using control.save() and control.domElements)
                // Ensure it gets currentUser from getCurrentUser() if needed for the upsert payload.
            });
        }
        // Ticker specific manual copy button
        if (control.type === 'ticker' && control.domElements.copyManualJsonButton) {
            // ... (copy button logic)
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "Save listeners set up.");
}

export function enableAllDashboardButtons() {
    document.querySelectorAll('details button.config-save-button, details button.toggle-visibility-button')
        .forEach(btn => btn.disabled = false);
}
export function disableAllDashboardButtons() {
     document.querySelectorAll('details button.config-save-button, details button.toggle-visibility-button')
        .forEach(btn => btn.disabled = true);
}
export function clearLoadedFlags() { // If needed on logout
    const dashContentEl = getEl('dashboardContent');
    if(dashContentEl) dashContentEl.dataset.configsLoaded = "false";
}

// --- Populate the load/save methods for overlayControls ---
// This part needs to be carefully filled based on the previous full dashboard.js
overlayControls.find(c => c.type === 'logo').load = async function() {
    const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
    if (error) throw error;
    if (data && data.config_data) { this.domElements.url.value = data.config_data.url || '../pictures/overlay1.png'; }
    else { this.domElements.url.value = '../pictures/overlay1.png';}
};
overlayControls.find(c => c.type === 'logo').save = async function() {
    const configData = { url: this.domElements.url.value.trim() };
    if (!configData.url) { throw new Error("Logo URL cannot be empty."); }
    return configData;
};
// ... Do this for 'ticker' and 'lower_third' as well ...
// Example for ticker save:
overlayControls.find(c => c.type === 'ticker').save = async function() {
    const messages = this.domElements.messages.value.trim().split('\n').map(s => s.trim()).filter(s => s);
    const separator = this.domElements.separator.value.trim();
    const configData = { messages, separator };
    if (this.domElements.manualJsonTextarea) this.domElements.manualJsonTextarea.value = JSON.stringify(configData, null, 2);
    return configData;
};
// ... and so on for all load/save methods.
