// /root/js/visibilityManager.js
import { overlayControls } from './configManager.js'; // To access control.visibility and control.domElements.toggleButton

const LOG_PREFIX_VISIBILITY = "VisibilityManager:";

export function updateVisibilityButtonUI(control) {
    if (!control.domElements.toggleButton) {
        // console.warn(LOG_PREFIX_VISIBILITY, `Toggle button for ${control.type} not found in domElements.`);
        return;
    }
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
    console.log(LOG_PREFIX_VISIBILITY, `Set ${storageKey} to ${visible ? 'show' : 'hide'} in localStorage.`);
}

export function initializeVisibilityToggles() {
    console.log(LOG_PREFIX_VISIBILITY, "Initializing visibility toggles...");
    overlayControls.forEach(control => {
        if (control.domElements.toggleButton && control.visibility) {
            const persistedState = localStorage.getItem(control.visibility.storageKey);
            control.visibility.isVisible = (persistedState === 'show');
            // Set default in localStorage if not already explicitly set to 'show' or 'hide'
            if (persistedState !== 'show' && persistedState !== 'hide') {
               setOverlayVisibilityInStorage(control.visibility.storageKey, false); // Default to hidden
               control.visibility.isVisible = false; // Ensure local state matches
            }
            updateVisibilityButtonUI(control); // Update UI based on loaded/defaulted state

            control.domElements.toggleButton.addEventListener('click', () => {
                control.visibility.isVisible = !control.visibility.isVisible;
                updateVisibilityButtonUI(control);
                setOverlayVisibilityInStorage(control.visibility.storageKey, control.visibility.isVisible);
            });
        } else {
            // console.warn(LOG_PREFIX_VISIBILITY, `Skipping toggle init for ${control.type}: toggle button or visibility config missing.`);
        }
    });
    console.log(LOG_PREFIX_VISIBILITY, "Visibility toggles initialized.");
}

export function setupStorageListener() {
    window.addEventListener('storage', (event) => {
         overlayControls.forEach(control => {
            if (control.domElements.toggleButton && control.visibility && event.key === control.visibility.storageKey) {
                console.log(LOG_PREFIX_VISIBILITY, `Storage event for ${control.visibility.storageKey}, new value: ${event.newValue}`);
                control.visibility.isVisible = (event.newValue === 'show');
                updateVisibilityButtonUI(control);
            }
        });
    });
    console.log(LOG_PREFIX_VISIBILITY, "Storage listener for visibility set up.");
}
