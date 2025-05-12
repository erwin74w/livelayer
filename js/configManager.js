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
            updateButton: 'update-logo-button' // <<< NEW: ID for the update button
        },
        visibility: { storageKey: 'overlay1Visibility', textShow: 'Show Logo', textHide: 'Hide Logo', isVisible: false },
        localStorageRefreshKey: 'refreshOverlayLogo', // <<< NEW: Key for localStorage command
        load: async function() { /* ... (same as your last complete version) ... */ },
        save: async function() { /* ... (same as your last complete version) ... */ }
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
            updateButton: 'update-ticker-button' // <<< NEW
        },
        visibility: { storageKey: 'overlay2Visibility', textShow: 'Show Ticker', textHide: 'Hide Ticker', isVisible: false },
        localStorageRefreshKey: 'refreshOverlayTicker', // <<< NEW
        load: async function() { /* ... (same) ... */ },
        save: async function() { /* ... (same) ... */ }
    },
    {
        type: 'lower_third',
        displayName: 'Lower Third',
        elements: {
            loading: 'loading-lower_third', saveButton: 'save-lower_third', feedback: 'feedback-lower_third',
            name: 'input-lower_third-name', function: 'input-lower_third-function',
            affiliation: 'input-lower_third-affiliation', toggleButton: 'toggle-lower_third',
            updateButton: 'update-lower_third-button' // <<< NEW
        },
        visibility: { storageKey: 'overlay3Visibility', textShow: 'Show Lower Third', textHide: 'Hide Lower Third', isVisible: false },
        localStorageRefreshKey: 'refreshOverlayLowerThird', // <<< NEW
        load: async function() { /* ... (same) ... */ },
        save: async function() { /* ... (same) ... */ }
    }
    // Ensure the load and save methods are the complete ones from your working version
];

export function initializeControlDomElements() { /* ... (same, it will now also fetch updateButton elements) ... */
    console.log(LOG_PREFIX_CONFIG_MGR, "Initializing DOM elements for overlayControls...");
    overlayControls.forEach(control => {
        control.domElements = {};
        for (const key in control.elements) {
            const elementId = control.elements[key];
            control.domElements[key] = getEl(elementId);

            const isOptional = ['manualJsonContainer', 'manualJsonTextarea', 'copyManualJsonButton', 'copyManualFeedback', 'loading'].includes(key);
            // Update buttons are critical if defined in elements object
            const isCriticalIfDefined = !isOptional || key === 'updateButton';

            if (!control.domElements[key] && isCriticalIfDefined) {
                 console.error(LOG_PREFIX_CONFIG_MGR, `CRITICAL DOM element ID '${elementId}' for '${control.type}.${key}' not found! Functionality will be impaired.`);
            } else if (!control.domElements[key] && isOptional && key === 'loading') {
                 console.warn(LOG_PREFIX_CONFIG_MGR, `Optional DOM element ID '${elementId}' for '${control.type}.${key}' not found.`);
            }
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "DOM elements for overlayControls initialization complete.");
}

export async function loadAllConfigs() { /* ... (same as before) ... */ }

export function setupSaveAndUpdateListeners() { // Renamed from setupSaveListeners
    console.log(LOG_PREFIX_CONFIG_MGR, "Setting up Save and Update listeners...");
    overlayControls.forEach(control => {
        // SAVE BUTTON LISTENER (modified to show update button on success)
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
                    showConfigFeedback(control.domElements.feedback, `${control.displayName} config saved! Click 'Update Overlay' to apply changes.`, true); // Modified feedback
                    if (control.domElements.manualJsonContainer) control.domElements.manualJsonContainer.style.display = 'none';

                    // *** NEW: Show the "Update Overlay" button ***
                    if (control.domElements.updateButton) {
                        control.domElements.updateButton.style.display = 'inline-block';
                        control.domElements.saveButton.style.display = 'none'; // Optionally hide save button
                    }

                } catch (error) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `Error saving config for ${control.type}:`, error.message, error);
                    if (control.domElements.feedback) showConfigFeedback(control.domElements.feedback, `Error saving: ${error.message}`, false);
                    if (control.domElements.manualJsonContainer && control.type === 'ticker') {
                        control.domElements.manualJsonContainer.style.display = 'block';
                    }
                } finally {
                    // Save button might be hidden now, so re-enable but its state might not matter if hidden
                    control.domElements.saveButton.disabled = false;
                    control.domElements.saveButton.textContent = `Save ${control.displayName} Config`;
                }
            });
        }

        // *** NEW: UPDATE OVERLAY BUTTON LISTENER ***
        if (control.domElements.updateButton) {
            control.domElements.updateButton.addEventListener('click', () => {
                console.log(LOG_PREFIX_CONFIG_MGR, `Update Overlay button clicked for: ${control.type}`);
                if (!control.localStorageRefreshKey) {
                    console.error(LOG_PREFIX_CONFIG_MGR, `No localStorageRefreshKey defined for ${control.type}`);
                    return;
                }
                // Send a command via localStorage. The value includes a timestamp to ensure 'storage' event fires.
                localStorage.setItem(control.localStorageRefreshKey, `refresh_${Date.now()}`);
                showConfigFeedback(control.domElements.feedback, `${control.displayName} update command sent. Check your overlay.`, true);

                // Hide update button and show save button again
                control.domElements.updateButton.style.display = 'none';
                if (control.domElements.saveButton) {
                    control.domElements.saveButton.style.display = 'inline-block';
                }
            });
        }

        // Ticker specific manual copy button (same as before)
        if (control.type === 'ticker' && control.domElements.copyManualJsonButton /*... etc ...*/) {
            // ... copy button logic ...
        }
    });
    console.log(LOG_PREFIX_CONFIG_MGR, "Save and Update listeners set up.");
}

export function enableAllDashboardButtons() { /* ... (same as before) ... */ }
export function disableAllDashboardButtons() { /* ... (same as before) ... */ }

// --- Ensure load/save methods in overlayControls are complete and correct from your working version ---
// (e.g., for logo, ticker, lower_third)
