// ============================================================
// API Service - Communicates with Google Apps Script backend
// ============================================================

const API = {
    async _fetch(url, options = {}) {
        try {
            const response = await fetch(url, {
                redirect: 'follow',
                mode: 'cors',
                ...options
            });
            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.error('Failed to parse response:', text);
                return { error: 'Invalid response from server' };
            }
        } catch (e) {
            console.error('Fetch error:', e);
            throw e;
        }
    },

    async getConfig() {
        return this._fetch(`${CONFIG.API_URL}?action=getConfig`);
    },

    async getRounds() {
        return this._fetch(`${CONFIG.API_URL}?action=getRounds`);
    },

    async getActiveRound() {
        return this._fetch(`${CONFIG.API_URL}?action=getActiveRound`);
    },

    async getSubmissions(roundId) {
        return this._fetch(`${CONFIG.API_URL}?action=getSubmissions&roundId=${encodeURIComponent(roundId)}`);
    },

    async getLeaderboard() {
        return this._fetch(`${CONFIG.API_URL}?action=getLeaderboard`);
    },

    async submitPrediction(userName, roundId, prediction) {
        return this._fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'submitPrediction',
                userName,
                roundId,
                prediction
            })
        });
    }
};
