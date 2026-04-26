/**
 * VISUALS.JS
 * Handles the cinematic and biometric visual layer of VibeSync
 */

class VibeSyncVisuals {
    constructor() {
        this.canvas = document.getElementById('vibe-canvas');
        this.vibeText = document.getElementById('vibe-text');
        this.vibeEmoji = document.getElementById('vibe-emoji');
        this.vibeRing = document.getElementById('vibe-ring');

        this.moodVal = document.getElementById('mood-val');
        this.moodFill = document.getElementById('mood-fill');
        this.stressFill = document.getElementById('stress-fill');
        this.stressVal = document.getElementById('stress-val');

        this.vibeStatus = document.getElementById('vibe-status');
        this.confFill = document.getElementById('conf-fill');
        this.confText = document.getElementById('conf-text');

        this.themes = {
            initial: { mode: 'initial', colors: ['#9A948C', '#8F887F', '#7E786F'], glow: 'rgba(154, 148, 140, 0.3)', mood: 50, stress: 0 },
            neutral: { mode: 'vibe-check', colors: ['#D1EAF0', '#E6E6FA', '#F5F5F5'], glow: 'rgba(255, 255, 255, 0.4)', mood: 50, stress: 10 },
            happy: { mode: 'vibe-check', colors: ['#FFF9C4', '#FFF176', '#FFD54F'], glow: 'rgba(255, 235, 59, 0.5)', mood: 90, stress: 5 },
            calm: { mode: 'vibe-check', colors: ['#B2EBF2', '#80DEEA', '#E1F5FE'], glow: 'rgba(0, 188, 212, 0.5)', mood: 75, stress: 5 },
            sad: { mode: 'vibe-check', colors: ['#CFD8DC', '#90A4AE', '#607D8B'], glow: 'rgba(120, 144, 156, 0.4)', mood: 30, stress: 15 },
            energetic: { mode: 'situation', colors: ['#FFE0B2', '#FFCC80', '#FFB74D'], glow: 'rgba(255, 152, 0, 0.5)', mood: 80, stress: 20 },
            angry: { mode: 'situation', colors: ['#FFCDD2', '#EF9A9A', '#E57373'], glow: 'rgba(244, 67, 54, 0.4)', mood: 20, stress: 45 },
            fear: { mode: 'situation', colors: ['#D1C4E9', '#9575CD', '#7E57C2'], glow: 'rgba(103, 58, 183, 0.6)', mood: 40, stress: 35 }
        };

        this.currentEmotion = 'neutral';
        this.blobs = [];
        this.init();
    }

    init() {
        this.createBlobs();
        this.updateBiometrics('neutral');
    }

    createBlobs() {
        if (!this.canvas) return;
        this.canvas.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const blob = document.createElement('div');
            blob.className = `aurora-blob aurora-${i}`;
            this.canvas.appendChild(blob);
            this.blobs.push(blob);
        }
    }

    updateBiometrics(emotion, confidence = 0.5, statusMessage = null) {
        this.currentEmotion = emotion;
        const theme = this.themes[emotion] || this.themes.neutral;

        // 1. Text & Emoji
        if (this.vibeText) {
            this.vibeText.textContent = emotion === 'initial' ? 'VibeSync' : emotion.charAt(0).toUpperCase() + emotion.slice(1);
        }
        if (this.vibeEmoji) this.vibeEmoji.textContent = this.getEmoji(emotion);

        // 2. Status & Confidence
        if (this.vibeStatus) {
            this.vibeStatus.textContent = statusMessage || this.getDefaultStatus(emotion);
        }
        if (this.confFill) {
            this.confFill.style.width = `${confidence * 100}%`;
            this.confText.textContent = `AI Confidence: ${Math.round(confidence * 100)}%`;
        }

        // 3. Meters
        const targetMood = theme.mood + (Math.random() * 6 - 3);
        this.animateMeter(this.moodFill, this.moodVal, targetMood);

        if (confidence < 0.4 && emotion !== 'initial') {
            this.animateMeter(this.stressFill, this.stressVal, theme.stress + 10);
        }

        // 4. Ring Glow
        if (this.vibeRing) {
            this.vibeRing.style.borderColor = theme.glow;
            this.vibeRing.style.boxShadow = `0 0 40px ${theme.glow}`;
        }

        // 5. Background Blobs & Body Class
        this.blobs.forEach((blob, i) => {
            blob.style.background = theme.colors[i % theme.colors.length];
        });

        document.body.className = theme.mode || `vibe-${emotion}`;
        document.body.classList.remove('analyzing');
    }

    setProcessing() {
        if (this.vibeStatus) this.vibeStatus.textContent = "Analyzing Essence...";
        document.body.classList.add('analyzing');
    }

    getDefaultStatus(emotion) {
        const statusMap = {
            initial: 'Trustworthy & Premium',
            happy: 'Radiating Positivity',
            calm: 'Serene & Balanced',
            sad: 'Reflective & Muted',
            energetic: 'High Awareness',
            angry: 'Alert & Focused',
            fear: 'Cautionary Awareness',
            neutral: 'Core Stability'
        };
        return statusMap[emotion] || 'Syncing...';
    }

    animateMeter(fillEl, valEl, target) {
        if (!fillEl || !valEl) return;
        const t = Math.max(0, Math.min(100, target));
        fillEl.style.width = `${t}%`;
        valEl.textContent = `${Math.round(t)}%`;
    }

    getEmoji(emotion) {
        const map = {
            initial: '✨',
            happy: '😊', calm: '😌', sad: '😢',
            energetic: '⚡', angry: '🔥', fear: '😨',
            neutral: '😐'
        };
        return map[emotion] || '😐';
    }
    setIntensity(level) {
        // level: 'low', 'med', 'high'
        const intensities = {
            'low': { opacity: 0.3, scale: 0.8 },
            'med': { opacity: 0.6, scale: 1.0 },
            'high': { opacity: 0.9, scale: 1.2 }
        };
        const settings = intensities[level] || intensities['med'];

        this.blobs.forEach(blob => {
            blob.style.opacity = settings.opacity;
            blob.style.transform = `scale(${settings.scale})`;
            blob.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });
        // console.log(`Visual Intensity set to ${level}`);
    }
}

window.biometricVisuals = new VibeSyncVisuals();
