// /root/js/configManager.js
import { supabase } from './supabaseClient.js';
import { getEl, showConfigFeedback } from './ui.js';
import { getCurrentUser } from './auth.js';

const LOG_PREFIX_CONFIG_MGR = "ConfigManager:";

export const overlayControls = [
    {
        type: 'logo',
        displayName: 'Logo',
        elements: {
            loading: 'loading-logo', saveButton: 'save-logo', feedback: 'feedback-logo',
            url: 'input-logo-url', toggleButton: 'toggle-logo',
            updateOverlayButton: 'update-logo-overlay' // ID for the new button
        },
        updateCommandKey: 'logo-executeUpdateCmd', // localStorage key
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        load: async function() { /* ... (Same as last complete version) ... */ },
        save: async function() { /* ... (Same as last complete version) ... */ }
    },
    {
        type: 'ticker',
        displayName: 'Ticker',
        elements: {
            loading: 'loading-ticker', saveButton: 'save-ticker', feedback: 'feedback-ticker',
            messages: 'input-ticker-messages', separator: 'input-ticker-separator',
            manualJsonContainer: 'manualJsonContainer-ticker', manualJsonTextarea: 'manualJsonTextarea-ticker',
            copyManualJsonButton: 'copyManualJsonButton-ticker', copyManualFeedback: 'copyManualFeedback-ticker',
            toggleButton: 'toggle-ticker',
            updateOverlayButton: 'update-ticker-overlay' // ID for the new button
        },
        updateCommandKey: 'ticker-executeUpdateCmd', // localStorage key
        visibility: { storageKey: 'overlay2Visibility', textShow: 'Show Ticker', textHide: 'Hide Ticker', isVisible: false },
        load: async function() { /* ... (Same as last complete version) ... */ },
        save: async function() { /* ... (Same as last complete version) ... */ }
    },
    {
        type: 'lower_third',
        displayName: 'Lower Third',
        elements: {
            loading: 'loading-lower_third', saveButton: 'save-lower_third', feedback: 'feedback-lower_third',
            name: 'input-lower_third-name', function: 'input-lower_third-function',
            affiliation: 'input-lower_third-affiliation', toggleButton: 'toggle-lower_third',
            updateOverlayButton: 'update-lower_third-overlay' // ID for the new button
        },
        updateCommandKey: 'lower_third-executeUpdateCmd', // localStorage key
        visibility: { storageKey: 'overlay3Visibility', textShow: 'Show Lower Third', textHide: 'Hide Lower Third', isVisible: false },
        load: async function() { /* ... (Same as last complete version) ... */ },
        save: async function() { /* ... (Same as last complete version) ... */ }
    }
];

// --- Populate the load/save methods for overlayControls (ensure these are complete from previous versions) ---
// Logo
overlayControls.find(c=>c.type==='logo').load = async function() {
    const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
    if (error) throw error;
    if (this.domElements.url) {
        if (data && data.config_data) this.domElements.url.value = data.config_data.url || '../pictures/overlay1.png';
        else this.domElements.url.value = '../pictures/overlay1.png';
    }
};
overlayControls.find(c=>c.type==='logo').save = async function() {
    if (!this.domElements.url) throw new Error("Logo URL input element not found for save.");
    const configData = { url: this.domElements.url.value.trim() };
    if (!configData.url) { throw new Error("Logo URL cannot be empty."); }
    return configData;
};

// Ticker
overlayControls.find(c=>c.type==='ticker').load = async function() {
    const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
    if (error) throw error;
    const messagesEl = this.domElements.messages;
    const separatorEl = this.domElements.separator;
    if (data && data.config_data) {
        if(messagesEl) messagesEl.value = (data.config_data.messages || []).join('\n');
        if(separatorEl) separatorEl.value = data.config_data.separator || ' +++ ';
    } else {
        if(messagesEl) messagesEl.value = '';
        if(separatorEl) separatorEl.value = ' +++ ';
    }
};
overlayControls.find(c=>c.type==='ticker').save = async function() {
    if (!this.domElements.messages || !this.domElements.separator) throw new Error("Ticker form elements not found for save.");
    const messages = this.domElements.messages.value.trim().split('\n').map(s => s.trim()).filter(s => s);
    const separator = this.domElements.separator.value.trim();
    const configData = { messages, separator };
    if (this.domElements.manualJsonTextarea) {
        this.domElements.manualJsonTextarea.value = JSON.stringify(configData, null, 2);
    }
    return configData;
};

// Lower Third
overlayControls.find(c=>c.type==='lower_third').load = async function() {
    const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle();
    if (error) throw error;
    const nameEl = this.domElements.name;
    const funcEl = this.domElements.function;
    const affEl = this.domElements.affiliation;
    if (data && data.config_data) {
        if(nameEl) nameEl.value = data.config_data.name || '';
        if(funcEl) funcEl.value = data.config_data.function || '';
        if(affEl) affEl.value = data.config_data.affiliation || '';
    } else {
        if(nameEl) nameEl.value = '';
        if(funcEl) funcEl.value = '';
        if(affEl) affEl.value = '';
    }
};
overlayControls.find(c=>c.type==='lower_third').save = async function() {
    if (!this.domElements.name || !this.domElements.function || !this.domElements.affiliation) {
        throw new Error("Lower third form elements not found for save.");
    }
    return {
        name: this.domElements.name.value.trim(),
        function: this.domElements.function.value.trim(),
        affiliation: this.domElements.affiliation.value.trim()
    };
};


export function initializeControlDomElements() { /* ... (Same as the last version that fixed ID errors) ... */ }
export async function loadAllConfigs() { /* ... (Same as the last version that fixed ID errors) ... */ }

export function setupSaveListeners() {
    console.log(LOG_PREFIX_CONFIG_MGR, "Setting up save and update command listeners...");
    overlayControls.forEach(control => {
        // SAVE CONFIG BUTTON LISTENER
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
                    const configData = await control.save();
                    console.log(LOG_PREFIX_CONFIG_MGR, `Attempting to save for ${control.type} (user: ${user.id}):`, configData);
                    const { data: upsertData, error } = await supabase.from('overlay_configurations').upsert(
                        { overlay_type: control.type, config_data: configData, user_id: user.id },
                        { onConflict: 'user_id, overlay_type' }
                    );
                    if (error) throw error;
                    console.log(LOG_PREFIX_CONFIG_MGR, `Save successful for ${control.type}. Response:`, upsertData);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `${control.displayName} config saved! Click "Push Update" to apply to live overlay.`, true); // Updated message
                    if (control.domElements.manualJsonContainer) control.domElements.manualJsonContainer.style.display = 'none';
                    
                    // Show the "Push Update to Overlay" button
                    if (control.domElements.updateOverlayButton) {
                        control.domElements.updateOverlayButton.style.display = 'inline-block';
                        console.log(LOG_PREFIX_CONFIG_MGR, `Update button shown for ${control.type}`);
                    }

                } catch (error) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `Error saving config for ${control.type}:`, error.message, error);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `Error saving: ${error.message}`, false);
                    if (control.domElements.manualJsonContainer && control.type === 'ticker') {
                        control.domElements.manualJsonContainer.style.display = 'block';
                    }
                } finally {
                    control.domElements.saveButton.disabled = false;
                    control.domElements.saveButton.textContent = `Save ${control.displayName} Config`;
                }
            });
        }

        // PUSH UPDATE TO OVERLAY BUTTON LISTENER
        if (control.domElements.updateOverlayButton) {
            control.domElements.updateOverlayButton.addEventListener('click', () => {
                if (!control.updateCommandKey) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `No updateCommandKey defined for control type: ${control.type}`);
                    return;
                }
                localStorage.setItem(control.updateCommandKey, Date.now().toString());
                console.log(LOG_PREFIX_CONFIG_MGR, `Sent update command for ${control.type} via localStorage key: ${control.updateCommandKey}`);
                if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `Update command sent to ${control.displayName} overlay!`, true);
                control.domElements.updateOverlayButton.style.display = 'none'; // Hide after click
                // Optionally, re-hide after a few seconds if save feedback clears
                setTimeout(() => {
                    // Only hide if no other feedback message is currently being shown
                    if (control.domElements.feedback && control.domElements.feedback.style.display === 'none') {
                         // This logic might be tricky if feedback clears too fast. Simpler to just hide.
                    }
                }, 4100); // Slightly after feedback clears
            });
        }

        // Ticker specific manual copy button (same as before)
        if (control.type === 'ticker' && control.domElements.copyManualJsonButton /*... other checks */) {
            control.domElements.copyManualJsonButton.addEventListener('click', async () => { /* ... */ });
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "Save and update command listeners set up.");
}

export function enableAllDashboardButtons() { /* ... (Same as before) ... */ }
export function disableAllDashboardButtons() { /* ... (Same as before) ... */ }
