document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("floating-paths-container");
    const titleContainer = document.getElementById("hero-title");
    const heroContent = document.getElementById("hero-content");
    const titleText = "Fisika Laboratorium";

    // 1. Generate Floating Paths (Vanilla equivalent of Framer Motion SVG generation)
    function createPaths(position) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "w-full h-full text-slate-950 dark:text-white absolute inset-0");
        svg.setAttribute("viewBox", "0 0 696 316");
        svg.setAttribute("fill", "none");

        const paths = Array.from({ length: 36 }, (_, i) => ({
            id: i,
            d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
            width: 0.5 + i * 0.03,
            opacity: 0.1 + i * 0.03
        }));

        paths.forEach(pathData => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData.d);
            path.setAttribute("stroke", "currentColor");
            path.setAttribute("stroke-width", pathData.width);
            path.setAttribute("stroke-opacity", pathData.opacity);

            // Apply custom CSS animation properties
            path.style.strokeDasharray = "1000";
            path.style.strokeDashoffset = "1000";
            path.style.animation = `dashAnim ${20 + Math.random() * 10}s linear infinite`;

            svg.appendChild(path);
        });
        container.appendChild(svg);
    }

    createPaths(1);
    createPaths(-1);

    // 2. Animate Title Text (Vanilla stagger effect)
    const words = titleText.split(" ");
    words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement("span");
        wordSpan.className = "inline-block mr-4 last:mr-0";

        word.split("").forEach((letter, letterIndex) => {
            const letterSpan = document.createElement("span");
            letterSpan.textContent = letter;
            letterSpan.className = "inline-block text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-700/80 dark:from-white dark:to-white/80 transform translate-y-10 opacity-0 transition-all duration-700 ease-out";
            // Stagger delay calculation
            letterSpan.style.transitionDelay = `${(wordIndex * 100) + (letterIndex * 30)}ms`;
            wordSpan.appendChild(letterSpan);
        });
        titleContainer.appendChild(wordSpan);
    });

    // Trigger animations after DOM is ready
    setTimeout(() => {
        heroContent.classList.remove("opacity-0");
        heroContent.classList.add("opacity-100");

        const letters = titleContainer.querySelectorAll("span > span");
        letters.forEach(letter => {
            letter.classList.remove("translate-y-10", "opacity-0");
            letter.classList.add("translate-y-0", "opacity-100");
        });
    }, 100);

    // 3. Modal Login Handler
    const loginBtn = document.getElementById("hero-login-btn");
    const loginModal = document.getElementById("login-modal");
    const loginModalOverlay = document.getElementById("login-modal-overlay");
    const closeModalBtn = document.getElementById("close-login-modal");
    const togglePasswordBtn = document.getElementById("toggle-password-modal");
    const passwordInput = document.getElementById("password-modal");
    const loginFormModal = document.getElementById("login-form-modal");

    // Open Modal
    function openModal() {
        loginModal.classList.remove("hidden");
        loginModalOverlay.classList.remove("hidden");
        setTimeout(() => {
            loginModal.classList.remove("scale-95", "opacity-0", "pointer-events-none");
            loginModalOverlay.classList.remove("opacity-0", "pointer-events-none");
            loginModal.classList.add("scale-100", "opacity-100", "pointer-events-auto");
            loginModalOverlay.classList.add("opacity-100", "pointer-events-auto");
        }, 10);
    }

    // Close Modal
    function closeModal() {
        loginModal.classList.add("scale-95", "opacity-0", "pointer-events-none");
        loginModalOverlay.classList.add("opacity-0", "pointer-events-none");
        setTimeout(() => {
            loginModal.classList.add("hidden");
            loginModalOverlay.classList.add("hidden");
        }, 300);
    }

    loginBtn.addEventListener("click", openModal);
    closeModalBtn.addEventListener("click", closeModal);

    // Close when clicking overlay
    loginModalOverlay.addEventListener("click", (e) => {
        if (e.target === loginModalOverlay) {
            closeModal();
        }
    });

    // Toggle Password Visibility
    togglePasswordBtn.addEventListener("click", () => {
        const eyeIcon = togglePasswordBtn.querySelector(".eye-icon");
        const eyeOffIcon = togglePasswordBtn.querySelector(".eye-off-icon");

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeIcon.classList.add("hidden");
            eyeOffIcon.classList.remove("hidden");
        } else {
            passwordInput.type = "password";
            eyeIcon.classList.remove("hidden");
            eyeOffIcon.classList.add("hidden");
        }
    });

    // Handle Form Submission - Delegate to index.js
    loginFormModal.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nrp = document.getElementById("nrp-modal").value;
        const password = document.getElementById("password-modal").value;
        
        // Trigger custom event untuk index.js
        const loginEvent = new CustomEvent("login-attempt", {
            detail: { nrp, password, closeModal }
        });
        document.dispatchEvent(loginEvent);
    });

    // Export functions to window for external access
    window.heroLoginModal = {
        open: openModal,
        close: closeModal
    };
});
