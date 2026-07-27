/* ========================================================
   Peak Load Prediction Game — Main Application Logic
   ======================================================== */

(function () {
    /* ---- State ---- */
    let currentUser = localStorage.getItem('peakload_user') || null;
    let activeRound = null;
    let countdownInterval = null;

    /* ---- DOM References ---- */
    const slider = document.getElementById('load-slider');
    const sliderValueDisplay = document.getElementById('slider-value');
    const skyOverlay = document.getElementById('sky-overlay');

    const SLIDER_MIN = parseFloat(slider.min);
    const SLIDER_MAX = parseFloat(slider.max);

    /* ---- Sky Gradient Presets ----
       Green = low load, dark = mid, red = high load. */

    const SKY_GRADIENTS = {
        sunny: 'linear-gradient(180deg, #052e16 0%, #064e3b 20%, #065f46 40%, #047857 60%, #059669 80%, #10b981 100%)',
        rain:  'linear-gradient(180deg, #1c1917 0%, #292524 20%, #44403c 40%, #57534e 60%, #78716c 80%, #a8a29e 100%)',
        snow:  'linear-gradient(180deg, #450a0a 0%, #7f1d1d 20%, #991b1b 40%, #b91c1c 60%, #dc2626 80%, #ef4444 100%)'
    };

    /**
     * Determines the visual zone based on the normalized slider position.
     * @param {number} percent - Value between 0 and 1.
     * @returns {'sunny' | 'rain' | 'snow'} Internal zone key for gradient lookup.
     */
    function getWeatherZone(percent) {
        if (percent < 0.30) return 'sunny';
        if (percent < 0.65) return 'rain';
        return 'snow';
    }

    /**
     * Core update function. Runs on every slider input event.
     */
    function updateScene() {
        const value = parseFloat(slider.value);
        const percent = (value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
        const zone = getWeatherZone(percent);

        sliderValueDisplay.textContent = value.toFixed(2);

        if (zone === 'sunny') {
            sliderValueDisplay.style.color = '#6ee7b7';
        } else if (zone === 'rain') {
            sliderValueDisplay.style.color = '#e2e8f0';
        } else {
            sliderValueDisplay.style.color = '#fca5a5';
        }

        skyOverlay.style.background = SKY_GRADIENTS[zone];

        document.querySelectorAll('[id^="zone-"]').forEach(el => {
            el.closest('.bg-white\\/5')?.classList.remove('zone-active');
        });
        const zoneToCardId = { sunny: 'low', rain: 'mid', snow: 'high' };
        const activeZoneCard = document.getElementById(`zone-${zoneToCardId[zone]}`);
        activeZoneCard?.closest('.bg-white\\/5')?.classList.add('zone-active');

        WeatherEngine.setWeather(zone, percent);
        updateGridCharacters(percent);
    }

    /**
     * Updates the emoji faces on the left/right side characters.
     * @param {number} percent - Normalized slider position (0 to 1).
     */
    function updateGridCharacters(percent) {
        const faceIds = ['left-face-1', 'left-face-2', 'right-face-1', 'right-face-2'];
        const charIds = ['left-char-1', 'left-char-2', 'right-char-1', 'right-char-2'];

        let face;
        if (percent < 0.15)      face = '\u{1F60E}';
        else if (percent < 0.30) face = '\u{1F60A}';
        else if (percent < 0.45) face = '\u{1F642}';
        else if (percent < 0.60) face = '\u{1F610}';
        else if (percent < 0.72) face = '\u{1F61F}';
        else if (percent < 0.85) face = '\u{1F630}';
        else                     face = '\u{1F62D}';

        const isStressed = percent > 0.70;

        faceIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = face;
        });

        charIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (isStressed) {
                el.classList.add('shake-stress');
            } else {
                el.classList.remove('shake-stress');
            }
        });
    }

    /* ---- Login / Logout ---- */

    window.doLogin = function () {
        const nameInput = document.getElementById('login-name');
        const name = nameInput.value.trim();
        if (!name) {
            nameInput.classList.add('border-red-500');
            nameInput.focus();
            setTimeout(() => nameInput.classList.remove('border-red-500'), 2000);
            return;
        }
        currentUser = name;
        localStorage.setItem('peakload_user', name);
        showPredictionScreen();
    };

    window.logout = function () {
        localStorage.removeItem('peakload_user');
        currentUser = null;
        location.reload();
    };

    function showPredictionScreen() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('prediction-screen').classList.remove('hidden');
        document.getElementById('greeting-bar').classList.remove('hidden');
        document.getElementById('greeting-name').textContent = currentUser;

        // Re-initialize slider references now that prediction-screen is visible
        slider.removeAttribute('disabled');
        updateScene();
        loadActiveRound();
    }

    /* ---- Round Loading ---- */

    async function loadActiveRound() {
        try {
            const data = await API.getActiveRound();
            if (data.activeRound) {
                activeRound = data.activeRound;
                displayRoundInfo(activeRound);
            } else {
                showNoActiveRound();
            }
        } catch (e) {
            // Fallback if API not configured yet — show prediction form with today's date
            const today = new Date();
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('prediction-date').textContent = today.toLocaleDateString('en-US', dateOptions);
        }
    }

    function displayRoundInfo(round) {
        const roundDate = new Date(round.date);
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('prediction-date').textContent = roundDate.toLocaleDateString('en-US', dateOptions);

        // Check if deadline passed
        const deadline = new Date(round.deadline);
        const now = new Date();

        if (now > deadline) {
            document.getElementById('deadline-passed-banner').classList.remove('hidden');
            document.getElementById('prediction-card').classList.add('opacity-50');
            document.getElementById('submit-btn').disabled = true;
            slider.disabled = true;
            loadUserSubmission(round.roundId);
            return;
        }

        // Start countdown
        startCountdown(deadline);
        loadUserSubmission(round.roundId);
    }

    function showNoActiveRound() {
        document.getElementById('no-round-banner').classList.remove('hidden');
        document.getElementById('prediction-card').classList.add('opacity-50');
        document.getElementById('submit-btn').disabled = true;
        slider.disabled = true;
        document.getElementById('round-info').classList.add('hidden');
    }

    function startCountdown(deadline) {
        function update() {
            const now = new Date();
            const diff = deadline - now;
            if (diff <= 0) {
                document.getElementById('deadline-countdown').textContent = 'Deadline passed!';
                clearInterval(countdownInterval);
                document.getElementById('submit-btn').disabled = true;
                return;
            }
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            document.getElementById('deadline-countdown').textContent =
                `Deadline in: ${hours}h ${minutes}m ${seconds}s`;
        }
        update();
        countdownInterval = setInterval(update, 1000);
    }

    /* ---- Load Existing Submission ---- */

    /**
     * Fetches the current user's submission for the given round and
     * permanently displays it so users always know what they submitted.
     */
    async function loadUserSubmission(roundId) {
        try {
            const data = await API.getSubmissions(roundId);
            const mySubmission = data.submissions.find(
                s => s.name.toLowerCase() === currentUser.toLowerCase()
            );
            if (mySubmission) {
                const confirmEl = document.getElementById('confirmation-text');
                if (mySubmission.prediction !== null) {
                    // Deadline passed — API reveals the value
                    confirmEl.textContent = `\u26A1 Your prediction: ${parseFloat(mySubmission.prediction).toFixed(2)} GW`;
                } else {
                    // Before deadline — API hides value; fall back to localStorage
                    const savedValue = localStorage.getItem(`peakload_pred_${roundId}`);
                    if (savedValue) {
                        confirmEl.textContent = `\u26A1 Your current prediction: ${savedValue} GW. You can still update it.`;
                    } else {
                        confirmEl.textContent = `\u26A1 You've already submitted for this round. You can still update it.`;
                    }
                }
                confirmEl.classList.remove('hidden');
                document.getElementById('submit-btn').textContent = 'Update Prediction';
            }
        } catch (e) {
            // Non-critical — silently ignore if fetch fails
        }
    }

    /* ---- Submit Prediction ---- */

    window.submitPrediction = async function () {
        const value = parseFloat(slider.value).toFixed(2);
        const submitBtn = document.getElementById('submit-btn');
        const confirmEl = document.getElementById('confirmation-text');
        const errorEl = document.getElementById('error-text');

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        errorEl.classList.add('hidden');

        try {
            const roundId = activeRound ? activeRound.roundId : 'local';
            const result = await API.submitPrediction(currentUser, roundId, value);

            if (result.success) {
                localStorage.setItem(`peakload_pred_${roundId}`, value);
                confirmEl.textContent = `\u26A1 Your current prediction: ${value} GW`;
                confirmEl.classList.remove('hidden');
            } else {
                errorEl.textContent = result.message || 'Submission failed.';
                errorEl.classList.remove('hidden');
            }
        } catch (e) {
            confirmEl.textContent = `\u26A1 Your current prediction: ${value} GW (saved locally)`;
            confirmEl.classList.remove('hidden');
            console.log('Local submission:', { name: currentUser, prediction: value });
        }

        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Prediction';
    };

    /* ---- Slider Event Binding ---- */
    slider.addEventListener('input', updateScene);

    /* ---- Click-to-Type Value Input ---- */

    const sliderValueInput = document.getElementById('slider-value-input');

    /**
     * Validates typed input matches xx.xx format and is within slider bounds.
     * @param {string} raw - The raw input string.
     * @returns {number|null} Parsed value if valid, null otherwise.
     */
    function parseTypedValue(raw) {
        const trimmed = raw.trim();
        if (!/^\d{2}\.\d{2}$/.test(trimmed)) return null;
        const parsed = parseFloat(trimmed);
        if (parsed < SLIDER_MIN || parsed > SLIDER_MAX) return null;
        return parsed;
    }

    /** Shows the text input and hides the display span. */
    function enterEditMode() {
        sliderValueDisplay.classList.add('hidden');
        sliderValueInput.classList.remove('hidden');
        sliderValueInput.value = slider.value ? parseFloat(slider.value).toFixed(2) : '20.00';
        sliderValueInput.focus();
        sliderValueInput.select();
    }

    /** Hides the text input and shows the display span. Syncs valid input to slider. */
    function exitEditMode() {
        const parsed = parseTypedValue(sliderValueInput.value);
        if (parsed !== null) {
            slider.value = parsed;
            updateScene();
        }
        sliderValueInput.classList.add('hidden');
        sliderValueDisplay.classList.remove('hidden');
    }

    sliderValueDisplay.addEventListener('click', enterEditMode);

    sliderValueInput.addEventListener('blur', exitEditMode);

    sliderValueInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sliderValueInput.blur();
        }
        if (e.key === 'Escape') {
            // Revert without applying changes
            sliderValueInput.value = parseFloat(slider.value).toFixed(2);
            sliderValueInput.blur();
        }
    });

    /* ---- Initialization ---- */

    // Auto-login if user already stored; otherwise wait for doLogin
    if (currentUser) {
        showPredictionScreen();
    }
})();
