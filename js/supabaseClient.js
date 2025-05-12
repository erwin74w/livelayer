// /root/js/supabaseClient.js

// Import the ESM version directly from the CDN path for Supabase v2
import { createClient as supabaseCreateClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const LOG_PREFIX_SUPABASE = "SupabaseClient:";
let supabaseInstance = null; // Renamed to avoid conflict with global 'supabase' if CDN also loaded in HTML

export async function initializeSupabase() {
    if (supabaseInstance) {
        console.log(LOG_PREFIX_SUPABASE, "Client already initialized.");
        return supabaseInstance;
    }
    console.log(LOG_PREFIX_SUPABASE, "Attempting to initialize...");
    try {
        // Assuming keys.json is in the parent directory of js/ (i.e., /root/keys.json)
        // The fetch path is relative to the HTML file that imports dashboard.js
        const response = await fetch('keys.json');
        console.log(LOG_PREFIX_SUPABASE, "'keys.json' fetch status:", response.status);
        if (!response.ok) {
            let errorText = "Could not retrieve response text.";
            try { errorText = await response.text(); } catch(e) { /* ignore */ }
            throw new Error(`HTTP ${response.status} fetching keys.json. Body: ${errorText}`);
        }
        const keys = await response.json();
        console.log(LOG_PREFIX_SUPABASE, "Parsed 'keys.json'. URL found:", !!keys.supabaseUrl, "Key found:", !!keys.supabaseAnonKey);

        if (!keys.supabaseUrl || !keys.supabaseAnonKey || keys.supabaseUrl.includes("YOUR_ACTUAL") || keys.supabaseAnonKey.includes("YOUR_ACTUAL")) {
            throw new Error("Supabase URL/Key missing or placeholder in keys.json.");
        }
        
        supabaseInstance = supabaseCreateClient(keys.supabaseUrl, keys.supabaseAnonKey);
        
        if (!supabaseInstance) {
             throw new Error("Failed to create Supabase client instance.");
        }
        console.log(LOG_PREFIX_SUPABASE, "Client initialized successfully.");
        return supabaseInstance;

    } catch (error) {
        console.error(LOG_PREFIX_SUPABASE, "Failed to initialize:", error.message, error);
        const initErrorEl = document.getElementById('initError'); // dashboard.html specific ID
        if(initErrorEl) {
            initErrorEl.textContent = `Supabase Initialization Error: ${error.message}.`;
            initErrorEl.style.display = 'block';
        }
        throw error; // Re-throw so the main dashboard.js knows it failed
    }
}

// Export the initialized client instance. Other modules will import this.
// This pattern ensures supabase is initialized only once.
export { supabaseInstance as supabase };
