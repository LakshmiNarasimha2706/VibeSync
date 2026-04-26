/**
 * VibeSync v2.1 - Core Application Logic
 * Passive Biometrics | Analytics | Cinematic UI
 * 
 * CORE ARCHITECTURE: VibeSyncState
 * Single Source of Truth for all music decisions.
 */

// 1. Central Decision Object
class VibeSyncState {
    constructor(appContext) {
        this.app = appContext; // Link to UI controller
        this.state = {
            detectedEmotion: 'neutral',
            detectedIntensity: 0,
            activeMode: 'auto',        // auto | manual | situation
            activeVibe: 'neutral',     // The vibe actually driving music
            activeSituation: null,
            isoStrategy: 'match',      // match | uplift | calm | stabilize
            nowPlaying: null,          // { title, artist, artwork, vibe }
            confidence: 0
        };
    }

    // --- State setters that TRIGGER actions ---

    /**
     * Called by Camera/Emotion Detection
     */
    updateDetection(emotion, confidence) {
        this.state.detectedEmotion = emotion;
        this.state.confidence = confidence;

        // Auto Mode Logic: Detection drives Vibe
        if (this.state.activeMode === 'auto') {
            const previousVibe = this.state.activeVibe;
            // Map Emotion -> Vibe (ISO principle integration point)
            this.state.activeVibe = this.applyIsoPrinciple(emotion);

            // Trigger music if vibe changed, or if nothing playing
            if (!this.app.isPlaying || this.state.activeVibe !== previousVibe) {
                this.app.playMusicForVibe(this.state.activeVibe, 'auto');
            }
        }

        // Always update UI (Silent tracking in Manual/Sit mode)
        this.app.updateDashboardUI(this.state);
    }

    /**
     * Called by Situation Buttons
     */
    setSituation(situation) {
        this.state.activeMode = 'situation';
        this.state.activeSituation = situation;

        // Map Situation -> Vibe
        const map = {
            'Study': 'focus',
            'Workout': 'energy',
            'Travel': 'chill',
            'Relaxation': 'calm',
            'Party': 'hype'
        };
        // Fallback to strict mapping if needed, or loosely map to emotions
        // Converting situation vibes to compatible emotion-keys for current backend
        const emotionMap = {
            'focus': 'neutral',
            'energy': 'energetic',
            'chill': 'happy',
            'calm': 'calm',
            'hype': 'happy'
        };

        const targetVibe = map[situation] || 'neutral';
        this.state.activeVibe = emotionMap[targetVibe] || 'neutral';

        // FORCE updates
        this.app.playMusicForVibe(this.state.activeVibe, 'situation');
        this.app.updateDashboardUI(this.state);
    }

    /**
     * Called by Manual Controls (Next/Prev)
     */
    setManualOverride(vibe) {
        if (this.state.activeMode !== 'manual') {
            // Optional: visual feedback "Manual Override Engaged"
        }
        this.state.activeMode = 'manual';
        this.state.activeVibe = vibe; // Keep current or set new
        // Music logic handled by app's next/prev, this just tracks state
        this.app.updateDashboardUI(this.state);
    }

    applyIsoPrinciple(emotion) {
        // Simple 1-to-1 mapping for now. 
        // Future: Logic to transition from 'angry' -> 'calm' etc.
        return emotion;
    }
}

// 2. Main Application Controller (UI & I/O)
class VibeSyncApp {
    constructor() {
        this.stateController = new VibeSyncState(this);

        this.audio = new Audio();
        this.isPlaying = false;

        // Init Subsystems
        this.initializeElements();
        this.attachListeners();
        this.initSettingsLogic();
        this.initVisuals();

        // Initial Start
        console.log("🚀 VibeSync Initialized");
        // Don't auto-play audio (browser policy), but set initial visual state
        this.updateDashboardUI(this.stateController.state);
    }

    // --- Core Media Logic ---

    playMusicForVibe(vibe, source) {
        console.log(`🎵 Requesting Music: ${vibe} [Source: ${source}]`);

        fetch('/recommend-music', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emotion: vibe,
                mode: 'mirror',
                language: this.language || 'English',
                confidence: 1.0
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    this.audio.src = data.url;
                    this.audio.load();

                    // Update State
                    this.stateController.state.nowPlaying = {
                        title: data.song,
                        artist: source === 'auto' ? `Detected: ${vibe.toUpperCase()} Flow`
                            : source === 'situation' ? `${this.stateController.state.activeSituation} Mode`
                                : "Manual Override",
                        vibe: vibe
                    };

                    this.updatePlayerUI(this.stateController.state.nowPlaying);

                    if (this.isPlaying || source === 'situation') {
                        this.audio.play().then(() => {
                            this.isPlaying = true;
                            this.togglePlaybackUI(true);
                        }).catch(e => console.warn("Auto-play blocked:", e));
                    }

                    this.updateCinematicBackground(vibe);
                }
            });
    }

    // --- UI Updates ---

    updateDashboardUI(state) {
        // 1. Emotion Card (Always shows DETECTION)
        if (this.visuals) {
            // Visuals always reflect detection for "feedback loop", 
            // even if music is manual.
            this.visuals.updateBiometrics(state.detectedEmotion, state.confidence || 0.5);
        }

        // 2. Mode Indicators (Transparency Rule)
        // Can add classes to body or specific elements to show "Manual Mode" badges etc.
    }

    updatePlayerUI(song) {
        if (!song) return;
        this.trackTitle.textContent = song.title;
        this.trackArtist.textContent = song.artist; // Holds the context/label
    }

    updateCinematicBackground(mode) {
        if (this.visuals) {
            let targetMode = 'initial';
            if (['happy', 'calm', 'neutral'].includes(mode)) targetMode = 'vibe-check';
            else if (['energetic', 'angry', 'fear', 'sad'].includes(mode)) targetMode = 'situation';

            document.body.className = targetMode;
        }
    }

    // --- Implementation Details (Listeners, Init) ---

    initSettingsLogic() {
        const drawerOverlay = document.getElementById('settings-drawer-overlay');
        const settingsBtn = document.getElementById('settings-btn');
        const closeDrawerBtn = document.getElementById('close-drawer-btn');

        if (settingsBtn && drawerOverlay) {
            settingsBtn.onclick = (e) => {
                e.stopPropagation();
                drawerOverlay.classList.remove('hidden');
                setTimeout(() => drawerOverlay.classList.add('open'), 10);
                this.populateCameraList();
            };
        }

        const closeDrawer = () => {
            if (drawerOverlay) {
                drawerOverlay.classList.remove('open');
                setTimeout(() => {
                    if (!drawerOverlay.classList.contains('open')) drawerOverlay.classList.add('hidden');
                }, 300);
            }
        };

        if (closeDrawerBtn) closeDrawerBtn.onclick = closeDrawer;
        if (drawerOverlay) drawerOverlay.onclick = (e) => { if (e.target === drawerOverlay) closeDrawer(); };

        // Settings Actions
        const logoutTrigger = document.getElementById('logout-trigger-btn');
        const logoutDialog = document.getElementById('logout-dialog');
        const cancelLogout = document.getElementById('cancel-logout');

        if (logoutTrigger && logoutDialog) {
            logoutTrigger.onclick = () => logoutDialog.classList.remove('hidden');
        }
        if (cancelLogout && logoutDialog) {
            cancelLogout.onclick = () => logoutDialog.classList.add('hidden');
        }
    }

    initializeElements() {
        this.tabs = document.querySelectorAll('.nav-tab');
        this.panels = document.querySelectorAll('.tab-panel');
        this.playBtn = document.getElementById('play-btn');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
        this.progressFill = document.getElementById('progress-fill');
        this.currentTimeStr = document.getElementById('current-time');
        this.totalTimeStr = document.getElementById('total-time');
        this.video = document.getElementById('camera-preview');
        this.situationBtns = document.querySelectorAll('.situation-btn');
        this.langSelect = document.getElementById('language-select');
        this.stressVal = document.getElementById('stress-val');
        this.stressFill = document.getElementById('stress-fill');

        this.captureBtn = document.getElementById('capture-btn');
        this.recheckBtn = document.getElementById('recheck-btn');
        this.closeModal = document.querySelector('.close-modal');
    }

    attachListeners() {
        // Tabs
        this.tabs.forEach(tab => tab.addEventListener('click', () => {
            this.tabs.forEach(t => t.classList.toggle('active', t === tab));
            this.panels.forEach(p => p.classList.toggle('active', p.id === tab.dataset.tab));
        }));

        // Playback
        this.playBtn.addEventListener('click', () => {
            if (this.isPlaying) this.audio.pause();
            else this.audio.play();
            this.isPlaying = !this.isPlaying;
            this.togglePlaybackUI(this.isPlaying);
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            // Manual Next
            this.stateController.setManualOverride(this.stateController.state.activeVibe);
            this.playMusicForVibe(this.stateController.state.activeVibe, 'manual');
        });

        // Audio Events
        this.audio.addEventListener('timeupdate', () => {
            if (this.audio.duration) {
                const p = (this.audio.currentTime / this.audio.duration) * 100;
                this.progressFill.style.width = `${p}%`;
                this.currentTimeStr.textContent = this.formatTime(this.audio.currentTime);
            }
        });
        this.audio.addEventListener('ended', () => {
            // Auto-next: maintain current state logic
            this.playMusicForVibe(this.stateController.state.activeVibe, this.stateController.state.activeMode);
        });

        // Situation Buttons
        this.situationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.situationBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.stateController.setSituation(btn.dataset.mode);
            });
        });

        // Camera / Detection Hook
        if (this.captureBtn) this.captureBtn.onclick = () => this.performSingleCapture();
        if (this.recheckBtn) this.recheckBtn.onclick = () => {
            document.getElementById('camera-modal').classList.remove('hidden');
            this.startCamera();
        };
        if (this.closeModal) this.closeModal.onclick = () => this.closeCamera();
    }

    // --- Media Helpers ---
    togglePlaybackUI(playing) {
        this.playBtn.textContent = playing ? '⏸' : '▶';
    }
    formatTime(s) {
        return (s - (s %= 60)) / 60 + (9 < s ? ':' : ':0') + Math.floor(s);
    }

    initVisuals() {
        this.visuals = window.biometricVisuals;
    }

    // --- Camera Logic (Simplified) ---
    startCamera(deviceId) {
        navigator.mediaDevices.getUserMedia({ video: { deviceId: deviceId ? { exact: deviceId } : undefined } })
            .then(stream => {
                this.video.srcObject = stream;
                this.isCapturing = true;
                this.loop();
                // Auto-capture on open
                if (!deviceId) setTimeout(() => { if (this.isCapturing) this.performSingleCapture(); }, 800);
            });
    }
    closeCamera() {
        if (this.video.srcObject) this.video.srcObject.getTracks().forEach(t => t.stop());
        document.getElementById('camera-modal').classList.add('hidden');
        this.isCapturing = false;
    }
    loop() {
        if (this.isCapturing) requestAnimationFrame(() => this.loop());
    }

    async populateCameraList() {
        // Same logic as before if needed, or simplified
        // ... (preserving essential logic)
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const camSelect = document.getElementById('camera-select');
            if (camSelect) {
                camSelect.innerHTML = '';
                devices.filter(d => d.kind === 'videoinput').forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.deviceId;
                    opt.text = d.label || `Camera`;
                    camSelect.appendChild(opt);
                });
                camSelect.onchange = () => this.startCamera(camSelect.value);
            }
        } catch (e) { }
    }

    performSingleCapture() {
        if (!this.captureBtn) return;
        this.captureBtn.textContent = "Analyzing...";
        this.captureBtn.disabled = true;

        const canvas = document.createElement('canvas');
        canvas.width = 480; canvas.height = 360;
        canvas.getContext('2d').drawImage(this.video, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.6);

        fetch('/detect-emotion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: data })
        })
            .then(r => r.json())
            .then(d => {
                if (d.source !== 'no_face_detected') {
                    // HERE IS THE MAGIC: Pass detection to State Controller
                    this.stateController.updateDetection(d.emotion, d.confidence / 100);
                } else {
                    this.visuals.updateBiometrics('neutral', 0, "No Face Detected");
                }
            })
            .finally(() => {
                this.closeCamera();
                this.captureBtn.textContent = "Capture Essence";
                this.captureBtn.disabled = false;
            });
    }

    // --- History & Analytics (Restored) ---
    loadHistory() {
        Promise.all([
            fetch('/api/history/trends').then(r => r.json()),
            fetch('/api/history/logs').then(r => r.json())
        ]).then(([trends, logs]) => {
            this.renderTrends(trends);
            this.renderLogs(logs);
        });
    }

    renderTrends(data) {
        // SECTION 1: Vibe Trends
        const container = document.getElementById('trends-chart').parentElement; // Using parent container for text stats if needed
        // For now, we still use the chart, but we can overlay text stats if data is empty or as requested.
        const ctx = document.getElementById('trends-chart');

        if (!data || data.length === 0) {
            if (container) container.innerHTML = '<p class="empty-state" style="text-align:center; padding: 2rem;">No activity recorded</p>';
            return;
        }

        // Calculate Stats
        // ... (Chart rendering logic preserved but wrapped) ...
        if (typeof Chart !== 'undefined') {
            if (this.chart) this.chart.destroy();
            this.chart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.map(d => d.date),
                    datasets: [{
                        label: 'Valence',
                        data: data.map(d => d.valence),
                        borderColor: '#ffd200',
                        backgroundColor: 'rgba(255, 210, 0, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: { y: { min: -1, max: 1, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { display: false } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    renderLogs(logs) {
        // SECTION 2: Activity Log
        // Format: [Time] – Emotion detected → Action taken
        const activityContainer = document.getElementById('history-logs');

        // SECTION 3: Music Playback History
        // Format: Track name — for Emotion — Time played — Duration
        const musicContainer = document.getElementById('music-history-list');

        if (!logs || logs.length === 0) {
            if (activityContainer) activityContainer.innerHTML = '<p class="empty-state">No emotional data recorded yet</p>';
            if (musicContainer) musicContainer.innerHTML = '<p class="empty-state">No emotional data recorded yet</p>';
            return;
        }

        // Render Activity Log
        if (activityContainer) {
            activityContainer.innerHTML = logs.map(log => {
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const emotion = log.emotion.charAt(0).toUpperCase() + log.emotion.slice(1);
                // "Action Taken" derivation
                let action = "Logged";
                if (log.song) action = `Music activated`; // "Calm playlist activated" etc.
                if (log.mode === 'manual') action = "User Override";
                if (log.confidence > 0.8) action = `${emotion} Playlist Activated`;

                return `
                <div class="log-item" style="justify-content: flex-start; gap: 0.5rem; font-family: monospace; font-size: 0.9rem;">
                   <span style="color: var(--primary);">${timeStr}</span> – 
                   <span>${emotion} detected</span> → 
                   <span style="opacity: 0.8">${action}</span>
                </div>`;
            }).join('');
        }

        // Render Music History
        if (musicContainer) {
            musicContainer.innerHTML = logs.map(log => {
                if (!log.song) return '';
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                const emotion = log.emotion.charAt(0).toUpperCase() + log.emotion.slice(1);
                const trackName = log.song.replace(/_/g, ' ').replace(/\.(mp3|wav|ogg)/, '');

                return `
                <div class="log-item" style="justify-content: space-between;">
                   <div>
                       <span style="font-weight:600; color: #fff;">${trackName}</span>
                       <span style="color: var(--text-muted); font-size: 0.85rem;"> — for ${emotion}</span>
                   </div>
                   <div style="font-family: monospace; opacity: 0.7;">
                       ${timeStr}
                   </div>
                </div>`;
            }).join('');
        }
    }

    getEmotionEmoji(e) {
        return { happy: '😊', sad: '😢', neutral: '😐', energetic: '⚡', calm: '🍃', angry: '🔥', fear: '😨' }[e] || '🌀';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new VibeSyncApp();
});
