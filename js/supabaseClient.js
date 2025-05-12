// /root/js/supabaseClient.js
import { createClient as supabaseCreateClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"; // Import ESM version

const LOG_PREFIX_SUPABASE = "SupabaseClient:";
let supabase = null;

export async function initializeSupabase() {
    if (supabase) {
        console.log(LOG_PREFIX_SUPABASE, "Client already initialized.");
        return supabase;
    }
    console.log(LOG_PREFIX_SUPABASE, "Attempting to initialize...");
    try {
        const response = await fetch('../keys.json'); // Assuming keys.json is in parent of js/
        console.log(LOG_PREFIX_SUPABASE, "'keys.json' fetch status:", response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status} fetching keys.json`);
        const keys = await response.json();
        if (!keys.supabaseUrl || !keys.supabaseAnonKey || keys.supabaseUrl.includes("YOUR_ACTUAL") || keys.supabaseAnonKey.includes("YOUR_ACTUAL")) {
            throw new Error("Supabase URL/Key missing or placeholder in keys.json.");
        }
        supabase = supabaseCreateClient(keys.supabaseUrl, keys.supabaseAnonKey);
        console.log(LOG_PREFIX_SUPABASE, "Client initialized successfully.");
        return supabase;
    } catch (error) {
        console.error(LOG_PREFIX_SUPABASE, "Failed to initialize:", error.message, error);
        // Optionally, update some global error display element here if needed from dashboard.html
        const initErrorEl = document.getElementById('initError'); // Be cautious with direct DOM manipulation from modules
        if(initErrorEl) {
            initErrorEl.textContent = `Supabase Initialization Error: ${error.message}.`;
            initErrorEl.style.display = 'block';
        }
        throw error; // Re-throw so caller knows it failed
    }
}

// Export the client instance directly. Other modules will import this.
// This pattern ensures supabase is initialized only once.
export { supabase };
