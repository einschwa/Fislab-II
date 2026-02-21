// supabase-config.js
const SUPABASE_URL = 'https://pxzxreumwbiyzfvmxwgw.supabase.co'; // Ganti dengan URL Anda
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4enhyZXVtd2JpeXpmdm14d2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODkxMjEsImV4cCI6MjA4NjU2NTEyMX0.xY_JTMj-rHRCyCvg-2Qqh3vL0Oz3B9SoMZLdsT8h3IY'; // Ganti dengan Key Anda

// Mekanisme inisialisasi (seperti yang dijelaskan di dokumen)
async function initSupabase() {
    // Try to initialize client. If the supabase library isn't loaded yet, retry a few times.
    const maxAttempts = 25; // ~5 seconds with 200ms interval
    let attempts = 0;
    return new Promise((resolve, reject) => {
        const tryInit = () => {
            attempts++;
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                try {
                    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    // Provide both names for compatibility with other scripts
                    window.supabaseClient = client;
                    window.supabase = client;
                    console.log('Supabase initialized successfully');
                    resolve(client);
                } catch (e) {
                    console.error('Supabase init failed', e);
                    reject(e);
                }
            } else if (attempts >= maxAttempts) {
                const err = new Error('Supabase library not loaded within timeout');
                console.error(err);
                reject(err);
            } else {
                setTimeout(tryInit, 200);
            }
        };
        tryInit();
    });
}

// Jalankan inisialisasi
initSupabase();