// /root/js/configManager.js
import { supabase } from './supabaseClient.js';
import { getEl, showConfigFeedback } from './ui.js';
import { getCurrentUser } from './auth.js';

const LOG_PREFIX_CONFIG_MGR = "ConfigManager:";

export const overlayControls = [
    {
        type: 'logo',
        displayName: 'Logo',
        elements: { // IDs used here MUST match HTML
            loading: 'loading-logo',
            saveButton: 'save-logo',
            feedback: 'feedback-logo',
            url: 'input-logo-url',
            toggleButton: 'toggle-logo'
        },
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        load: async function() {
            const { data, error } = await supabase.from('overlay_configurations').select('config_data').eq('overlay_type', this.type).maybeSingle(); // RLS scopes this
            if (error) throw error;
            if (this.domElements.url) {
                if (data && data.config_data) {
                    this.domElements.url.value = data.config_data.url || '../pictures/overlay1.png';
                } else {
                    this.domElements.url.value = '../pictures/overlay1.png';
                }
            } else { console.warn(LOG_PREFIX_CONFIG_MGR, `load logo: url input not found in domElements for ${this.type}`); }
        },
        save: async function() {
            if (!this.domElements.url) throw new Error("Logo URL input element not found for save.");
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
            const messagesEl = this.domElements.messages;
            const separatorEl = this.domElements.separator;
            if (data && data.config_data) {
                if(messagesEl) messagesEl.value = (data.config_data.messages || []).join('\n');
                if(separatorEl) separatorEl.value = data.config_data.separator || ' +++ ';
            } else {
                if(messagesEl) messagesEl.value = '';
                if(separatorEl) separatorEl.value = ' +++ ';
            }
        },
        save: async function() {
            if (!this.domElements.messages || !this.domElements.separator) throw new Error("Ticker form elements not found for save.");
            const messages = this.domElements.messages.value.trim().split('\n').map(s => s.trim()).filter(s => s);
            const separator = this.domElements.separator.value.trim();
            const configData = { messages, separator };
            if (this.domElements.manualJsonTextarea) {
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
        },
        save: async function() {
            if (!this.domElements.name || !this.domElements.function || !this.domElements.affiliation) {
                throw new Error("Lower third form elements not found for save.");
            }
            return {
                name: this.domElements.name.value.trim(),
                function: this.domElements.function.value.trim(),
                affiliation: this.domElements.affiliation.value.trim()
            };
        }
    }
];

export function initializeControlDomElements() {
    console.log(LOG_PREFIX_CONFIG_MGR, "Initializing DOM elements for overlayControls...");
    overlayControls.forEach(control => {
        control.domElements = {};
        for (const key in control.elements) {
            const elementId = control.elements[key];
            control.domElements[key] = getEl(elementId);

            const isInput = ['url', 'messages', 'separator', 'name', 'function', 'affiliation'].includes(key);
            const isButton = ['saveButton', 'toggleButton', 'copyManualJsonButton'].includes(key);
            const isFeedback = ['feedback', 'copyManualFeedback'].includes(key);
            const isOptionalContainer = ['manualJsonContainer', 'manualJsonTextarea', 'loading'].includes(key);

            if (!control.domElements[key] && !isOptionalContainer) {
                 console.error(LOG_PREFIX_CONFIG_MGR, `CRITICAL DOM element ID '${elementId}' for '${control.type}.${key}' not found! Functionality will be impaired.`);
            } else if (!control.domElements[key] && isOptionalContainer && key === 'loading') { // Loading is optional but good to have
                 console.warn(LOG_PREFIX_CONFIG_MGR, `Optional DOM element ID '${elementId}' for '${control.type}.${key}' not found.`);
            }
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "DOM elements for overlayControls initialization attempt complete.");
}

export async function loadAllConfigs() {
    const user = getCurrentUser();
    if (!supabase || !user) { console.warn(LOG_PREFIX_CONFIG_MGR, "Cannot load configs, Supabase not ready or no user."); return; }
    console.log(LOG_PREFIX_CONFIG_MGR, "Loading all configurations for user:", user.id);

    for (const control of overlayControls) {
        if (control.domElements.loading) control.domElements.loading.style.display = 'inline';
        try {
            console.log(LOG_PREFIX_CONFIG_MGR, `Loading config for: ${control.type}`);
            await control.load();
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
                    const configData = await control.save();
                    console.log(LOG_PREFIX_CONFIG_MGR, `Attempting to save for ${control.type} (user: ${user.id}):`, configData);
                    const { data: upsertData, error } = await supabase.from('overlay_configurations').upsert(
                        { overlay_type: control.type, config_data: configData, user_id: user.id },
                        {
                            onConflict: 'overlay_configurations_user_id_overlay_type_key', // *** CORRECTED onConflict ***
                            // ignoreDuplicates: false // Default is false, ensures update part of upsert
                        }
                    );
                    if (error) throw error;
                    console.log(LOG_PREFIX_CONFIG_MGR, `Save successful for ${control.type}. Response:`, upsertData);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `${control.displayName} config saved!`, true);
                    if (control.domElements.manualJsonContainer) control.domElements.manualJsonContainer.style.display = 'none';
                } catch (error) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `Error saving config for ${control.type}:`, error.message, error); // Log the full error
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
