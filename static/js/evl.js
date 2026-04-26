
/**
 * Emotion Verification Layer (EVL)
 * Intercepts sensor analysis to verify and stabilize emotion via cognitive feedback loop.
 */
class EmotionVerificationLayer {
    constructor() {
        this.overlay = document.getElementById('evl-overlay');
        this.questionEl = document.getElementById('evl-question');
        this.progressEl = document.getElementById('evl-progress-bar');

        this.initialData = null; // { emotion, confidence, face, voice }
        this.currentData = null; // mutable state
        this.step = 0;

        this.questions = [
            "Do you feel this emotion strongly right now?",
            "Has this feeling lasted for more than a few minutes?",
            "Is this emotion getting stronger or weaker?", // Contextual, handled in logic
            "Is this how you usually feel in this situation?",
            "Do you feel stressed or just emotional?",
            "Are you feeling tired right now?",
            "Are you feeling overwhelmed?",
            "Do you want something calming or something energizing?",
            "Do you feel safe emotionally right now?",
            "Do you want the system to help change how you feel?"
        ];
    }

    start(data) {
        console.log("🧠 EVL: Starting Verification Loop for", data.emotion);
        this.initialData = data;
        this.currentData = { ...data, confidence: parseFloat(data.confidence) || 0.5 };
        this.step = 0;

        // Show Overlay
        this.overlay.classList.remove('hidden');

        // Start Question 1
        this.showQuestion(0);
    }

    showQuestion(index) {
        if (index >= this.questions.length) {
            this.finish();
            return;
        }

        let q = this.questions[index];
        // Dynamic text replacement
        q = q.replace("this emotion", `"${this.currentData.emotion}"`);

        this.questionEl.innerText = q;
        this.updateProgress(index);
    }

    updateProgress(index) {
        const pct = ((index) / this.questions.length) * 100;
        this.progressEl.style.width = `${pct}%`;
    }

    answer(ans) {
        console.log(`EVL Answer Q${this.step}: ${ans}`);

        // --- DECISION RULES ---
        // 1. "Do you feel this emotion strongly right now?"
        if (this.step === 0) {
            if (ans === 'yes') this.currentData.confidence += 0.15;
            if (ans === 'no') {
                this.currentData.confidence -= 0.2;
                // If user denies it immediately, maybe ask what they feel? for MVP we just lower confidence
            }
        }

        // 2. "Has this feeling lasted...?"
        if (this.step === 1) {
            if (ans === 'yes') this.currentData.confidence += 0.1; // Stable
        }

        // 5. "Do you feel stressed or just emotional?" (Yes=Stressed, No=Just Emotional)
        if (this.step === 4) {
            if (ans === 'yes' && this.currentData.emotion !== 'fear' && this.currentData.emotion !== 'angry') {
                // User admits stress but detection might be 'sad' -> Shift towards 'calm' need
                console.log("EVL: User indicated stress.");
            }
        }

        // 8. "Calming (yes) or Energizing (no)?" (Binary mapping for now)
        if (this.step === 7) {
            this.currentData.preference = (ans === 'yes') ? 'calm' : 'energetic';
        }

        // General Confidence Check
        if (this.currentData.confidence > 1.0) this.currentData.confidence = 1.0;
        if (this.currentData.confidence < 0) this.currentData.confidence = 0;

        // Next Question
        this.step++;

        // Early Exit if Confidence is very high (> 0.9 after 3 questions)
        if (this.currentData.confidence > 0.9 && this.step > 3) {
            this.finish();
            return;
        }

        this.showQuestion(this.step);
    }

    finish() {
        console.log("🧠 EVL: Verification Complete", this.currentData);
        this.overlay.classList.add('hidden');

        // Final Output Logic
        const finalEmotion = this.currentData.emotion;
        const confidence = this.currentData.confidence;

        // If preference was set (calm vs energy), force that vibe
        let finalVibe = finalEmotion;
        if (this.currentData.preference) {
            // Override complex emotion with utilitarian vibe
            if (this.currentData.preference === 'calm') finalVibe = 'calm';
            else if (this.currentData.preference === 'energetic') finalVibe = 'energetic';
        }

        // Update UI visuals
        document.getElementById('vibe-text').innerText = finalVibe.toUpperCase() + " (Verified)";
        const confPct = Math.round(confidence * 100);
        document.getElementById('conf-text').innerText = `Verified Confidence: ${confPct}%`;
        document.getElementById('conf-fill').style.width = `${confPct}%`;

        // TRIGGER MUSIC (Handoff to VibeSyncApp)
        if (window.app) {
            window.app.playMusicForVibe(finalVibe, 'evl_verified');
        }
    }
}

// Init Global Instance
window.evl = new EmotionVerificationLayer();
