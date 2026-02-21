/* Centralized Firebase configuration for the FISLAB project.
   - Attaches config to window.__FISLAB_FIREBASE_CONFIG__ for global access.
   - Initializes Firebase if the global `firebase` SDK is available and no app exists.
   - Exports via CommonJS for environments that use require/module.exports.

   Note: For bundlers (Vite/Webpack) prefer loading this file as an ES module
   or inject real secrets via environment variables during build.
*/
(function(){
    const firebaseConfig = {
        apiKey: "AIzaSyCM7y1NyLEMAp_LhbaZ12RTGBY5u-cZIik",
        authDomain: "fislab-2-8b10b.firebaseapp.com",
        databaseURL: "https://fislab-2-8b10b-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "fislab-2-8b10b",
        storageBucket: "fislab-2-8b10b.firebasestorage.app",
        messagingSenderId: "493267355202",
        appId: "1:493267355202:web:499b6875a5d9528ca08fdb",
        measurementId: "G-4BQ5Y86BSS"
    };

    // Expose config globally for non-module pages
    if (typeof window !== 'undefined') {
        window.__FISLAB_FIREBASE_CONFIG__ = firebaseConfig;
    }

    // If firebase SDK already loaded on the page, initialize if necessary
    try {
        if (typeof firebase !== 'undefined' && firebase && (!firebase.apps || firebase.apps.length === 0)) {
            firebase.initializeApp(firebaseConfig);
        }
    } catch (e) {
        // ignore - if firebase not present yet, pages will call/assume initialization
    }

    // CommonJS export for simple bundlers/node-style require
    try { if (typeof module !== 'undefined' && module.exports) module.exports = firebaseConfig; } catch(e){}
    // AMD define
    try { if (typeof define === 'function' && define.amd) define([], function(){ return firebaseConfig; }); } catch(e){}
})();
