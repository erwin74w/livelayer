// /root/js/configManager.js
import { supabase } from './supabaseClient.js'; // Imports the initialized Supabase client
import { getEl, showConfigFeedback } from './ui.js';
import { getCurrentUser } from './auth.js';

const LOG_PREFIX_CONFIG_MGR = "ConfigManager:";

// This array is the heart of the configuration.
export const overlayControls = [
    {
        type: 'logo',
        displayName: 'Logo',
        elements: { // Store IDs here
            loading: 'loading-logo',
            saveButton: 'save-logo',
            feedback: 'feedback-logo',
            url: 'input-logo-url',
            toggleButton: 'toggle-logo'
        },
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        load: async function() { // 'this' refers to this control object
            // RLS on Supabase will scope this query to the authenticated user
            const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) {
                console.error(LOG_PREFIX_CONFIG_MGR, `Error loading ${this.type} config:`, error);
                throw error; // Re-throw to be caught by loadAllConfigs
            }
            if (data && data.config_data && this.domElements.url) {
                this.domElements.url.value = data.config_data.url || '../pictures/overlay1.png';
            } else if (this.domElements.url) {
                this.domElements.url.value = '../pictures/overlay1.png'; // Default
            }
        },
        save: async function() {
            if (!this.domElements.url) throw new Error("Logo URL input element not found.");
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
            const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) throw error;
            if (data && data.config_data) {
                if(this.domElements.messages) this.domElements.messages.value = (data.config_data.messages || []).join('\n');
                if(this.domElements.separator) this.domElements.separator.value = data.config_data.separator || ' +++ ';
            } else { // Set defaults if no data or elements missing
                if(this.domElements.messages) this.domElements.messages.value = '';
                if(this.domElements.separator) this.domElements.separator.value = ' +++ ';
            }
        },
        save: async function() {
            if (!this.domElements.messages || !this.domElements.separator) throw new Error("Ticker form elements not found.");
            const messages = this.domElements.messages.value.trim().split('\n').map(s => s.trim()).filter(s => s);
            const separator = this.domElements.separator.value.trim();
            const configData = { messages, separator };
            if (this.domElements.manualJsonTextarea) { // Update fallback textarea
                this.domElements.manualJsonTextarea.value = JSON.stringify(configData, null, 2);
            }
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
            const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
            if (error) throw error;
            if (data && data.config_data) {
                if(this.domElements.name) this.domElements.name.value = data.config_data.name || '';
                if(this.domElements.function) this.domElements.function.value = data.config_data.function || '';
                if(this.domElements.affiliation) this.domElements.affiliation.value = data.config_data.affiliation || '';
            } else { // Set defaults
                if(this.domElements.name) this.domElements.name.value = '';
                if(this.domElements.function) this.domElements.function.value = '';
                if(this.domElements.affiliation) this.domElements.affiliation.value = '';
            }
        },
        save: async function() {
            if (!this.domElements.name || !this.domElements.function || !this.domElements.affiliation) {
                throw new Error("Lower third form elements not found.");
            }
            return {
                name: this.domElements.name.value.trim(),
                function: this.domElements.function.value.trim(),
                affiliation: this.domElements.affiliation.value.trim()
            };
        }
    }
];

// Function to populate 'domElements' property on each control object
export function initializeControlDomElements() {
    console.log(LOG_PREFIX_CONFIG_MGR, "Initializing DOM elements for overlayControls...");
    overlayControls.forEach(control => {
        control.domElements = {}; // Will store actual DOM element references
        for (const key in control.elements) {
            control.domElements[key] = getEl(control.elements[key]); // Fetch element by ID
            // Add warning if a critical element (like a form input or save button) is not found
            // Optional elements like 'manualJsonContainer' are less critical for core functionality
            const isCritical = !['manualJsonContainer', 'manualJsonTextarea', 'copyManualJsonButton', 'copyManualFeedback', 'loading', 'feedback', 'toggleButton'].includes(key);
            if (!control.domElements[key] && isCritical) {
                 console.error(LOG_PREFIX_CONFIG_MGR, `CRITICAL DOM element ID '${control.elements[key]}' for '${control.type}.${key}' not found! Functionality will be impaired.`);
            } else if (!control.domElements[key]) {
                 console.warn(LOG_PREFIX_CONFIG_MGR, `Optional DOM element ID '${control.elements[key]}' for '${control.type}.${key}' not found.`);
            }
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "DOM elements for overlayControls initialized.");
}

export async function loadAllConfigs() {
    const user = getCurrentUser();
    if (!supabase || !user) { console.warn(LOG_PREFIX_CONFIG_MGR, "Cannot load configs, Supabase not ready or no user."); return; }
    console.log(LOG_PREFIX_CONFIG_MGR, "Loading all configurations for user:", user.id);

    for (const control of overlayControls) {
        if (control.domElements.loading) control.domElements.loading.style.display = 'inline';
        try {
            console.log(LOG_PREFIX_CONFIG_MGR, `Loading config for: ${control.type}`);
            await control.load(); // 'this' is implicitly 'control' because it's a method on the object
            console.log(LOG_PREFIX_CONFIG_MGR, `Config loaded for: ${control.type}`);
        } catch (error) {
            console.error(LOG_PREFIX_CONFIG_MGR, `Error loading config for ${control.type}:`, error.message, error);
            if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `Error loading: ${error.message}`, false);
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
                console.log(LOG_PREFIX_CONFIG_MGR, `Save button clicked for: ${control.type}`);
                const user = getCurrentUser();
                if (!supabase || !user) {
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, 'Not logged in or Supabase not ready.', false);
                    return;
                }
                control.domElements.saveButton.disabled = true;
                control.domElements.saveButton.textContent = 'Saving...';
                try {
                    const configData = await control.save(); // 'this' is implicitly 'control'
                    console.log(LOG_PREFIX_CONFIG_MGR, `Attempting to save for ${control.type} (user: ${user.id}):`, configData);
                    const { data: upsertData, error } = await supabase.from('overlay_configurations').upsert(
                        { overlay_type: control.type, config_data: configData, user_id: user.id },
                        { onConflict: 'user_id, overlay_type' } // Assumes composite unique key on (user_id, overlay_type)
                    );
                    if (error) throw error;
                    console.log(LOG_PREFIX_CONFIG_MGR, `Save successful for ${control.type}. Response:`, upsertData);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `${control.displayName} config saved!`, true);
                    if (control.domElements.manualJsonContainer) control.domElements.manualJsonContainer.style.display = 'none';
                } catch (error) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `Error saving config for ${control.type}:`, error.message, error);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `Error saving: ${error.message}`, false);
                    if (control.domElements.manualJsonContainer && control.type === 'ticker') { // Only show ticker fallback currently
                        control.domElements.manualJsonContainer.style.display = 'block';
                    }
                } finally {
                    control.domElements.saveButton.disabled = false;
                    control.domElements.saveButton.textContent = `Save ${control.displayName} Config`;
                }
            });
        }
        // Ticker specific manual copy button
        if (control.type === 'ticker' && control.domElements.copyManualJsonButton && control.domElements.manualJsonTextarea && control.domElements.copyManualFeedback) {
             control.domElements.copyManualJsonButton.addEventListener('click', async () => {
                const tickerTextarea = control.domElements.manualJsonTextarea;
                const feedbackEl = control.domElements.copyManualFeedback;
                try {
                    await navigator.clipboard.writeText(tickerTextarea.value);
                    feedbackEl.textContent = 'Copied!';
                    setTimeout(() => { feedbackEl.textContent = ''; }, 2000);
                } catch (err) {
                    feedbackEl.textContent = 'Failed to copy.';
                }
            });
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
