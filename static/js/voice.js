
const recordBtn = document.getElementById('record-btn');
const voiceStatus = document.getElementById('voice-status');
const analyzeBtn = document.getElementById('analyze-combined-btn');
const voiceCard = document.querySelector('.voice-card');

let mediaRecorder;
let audioChunks = [];
let recordedBlob = null;
let isRecording = false;

// --- Initialize Voice Recorder ---
async function initVoice() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('getUserMedia supported.');

        try {
            // Request permissions early
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunks, { 'type': 'audio/wav; codecs=MS_PCM' }); // wav
                recordedBlob = blob;
                audioChunks = [];

                voiceStatus.innerText = "Recording saved. Ready to analyze.";
                voiceCard.classList.remove('recording');
                isRecording = false;

                // Auto-trigger full analysis if in that flow
                // For now, let user click "Analyze Full Vibe" to confirm
            };

        } catch (err) {
            console.log('The following getUserMedia error occurred: ' + err);
            voiceStatus.innerText = "Microphone access denied.";
        }
    } else {
        voiceStatus.innerText = "getUserMedia not supported on your browser!";
    }
}

// --- Record Button Click ---
recordBtn.addEventListener('click', () => {
    if (!mediaRecorder) { initVoice(); return; }

    if (isRecording) {
        // Stop manually if needed
        mediaRecorder.stop();
    } else {
        // Start Recording
        startRecordingflow();
    }
});

function startRecordingflow() {
    if (!mediaRecorder) return;

    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    voiceCard.classList.add('recording');

    let timeLeft = 5;
    voiceStatus.innerText = `Recording... Speak how you feel! (${timeLeft}s)`;

    const countdown = setInterval(() => {
        timeLeft--;
        if (timeLeft > 0) {
            voiceStatus.innerText = `Recording... Speak how you feel! (${timeLeft}s)`;
        } else {
            clearInterval(countdown);
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        }
    }, 1000);
}

// --- Combined Analysis (Face + Voice) ---
analyzeBtn.addEventListener('click', async () => {
    // 1. Check if we have voice data
    if (!recordedBlob) {
        // If not recorded yet, prompt to record
        alert("Please record your voice first (tap the mic)!");
        return;
    }

    // 2. Capture Face (trigger existing function from main.js if accessible, or replicate logic)
    // We assume captureImage() returns a blob or base64. 
    // Since captureImage depends on main.js variables (video element), we might need to export/expose it.
    // For this MVP improvement, let's grab the video element directly here.

    const video = document.getElementById('camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg');

    // 3. Send both to appropriate endpoints
    analyzeBtn.innerText = "Analyzing...";
    analyzeBtn.disabled = true;

    try {
        // P1: Face Analysis
        const faceResponse = await fetch('/detect-emotion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 })
        });
        const faceResult = await faceResponse.json();

        // P2: Voice Analysis
        const formData = new FormData();
        formData.append("audio", recordedBlob, "recording.wav");

        const voiceResponse = await fetch('/detect-speech-emotion', {
            method: 'POST',
            body: formData
        });
        const voiceResult = await voiceResponse.json();

        // 4. Combine Results (Simple weighted average logic or dominant emotion)
        console.log("Face:", faceResult);
        console.log("Voice:", voiceResult);

        // --- EVL INTEGRATION ---
        // Instead of showing result immediately, trigger Verification Layer
        const combinedData = {
            emotion: faceResult.emotion, // Default to face, refined by voice/user
            confidence: ((faceResult.confidence || 0.5) + (voiceResult.confidence || 0.5)) / 2,
            face: faceResult,
            voice: voiceResult
        };

        if (window.evl) {
            window.evl.start(combinedData);
        } else {
            // Fallback if EVL failed to load
            displayCombinedResult(faceResult, voiceResult);
        }

    } catch (e) {
        console.error("Analysis failed", e);
        alert("Analysis failed. See console.");
    } finally {
        analyzeBtn.innerHTML = '<span class="icon">✨</span> Analyze Full Vibe (Face + Voice)';
        analyzeBtn.disabled = false;
    }
});

function displayCombinedResult(face, voice) {
    const mainEmoji = document.getElementById('vibe-emoji');
    const mainText = document.getElementById('vibe-text');
    const subText = document.getElementById('vibe-status');
    const confText = document.getElementById('conf-text');
    const confFill = document.getElementById('conf-fill');

    let finalEmotion = face.emotion;
    let displayText = face.emotion;

    // Show initial guess
    mainText.innerText = displayText.toUpperCase();

    // Map emotion to emoji
    const emojiMap = {
        'happy': '😊', 'sad': '😢', 'angry': '😠', 'neutral': '😐',
        'calm': '😌', 'fear': '😨', 'surprise': '😲', 'disgust': '🤢'
    };
    mainEmoji.innerText = emojiMap[face.emotion] || '😐';

    // Update Meter
    const avgConf = ((face.confidence || 0) + (voice.confidence || 0)) / 2;
    const pct = Math.round(avgConf * 100);
    confFill.style.width = `${pct}%`;
    confText.innerText = `Detected Confidence: ${pct}%`;

    // NOTE: Music trigger is now handled by EVL.finish()
}

// Helper to trigger existing music logic
async function recommendMusic(emotion) {
    try {
        const response = await fetch('/recommend-music', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emotion: emotion, mode: 'combined' })
        });
        const data = await response.json();

        if (data.status === 'success') {
            document.querySelector('.player-footer').style.display = 'flex';
            document.getElementById('track-title').innerText = data.song;
            document.getElementById('track-artist').innerText = data.category;

            // Audio play logic (needs audio element)
            let audio = new Audio(data.url);
            audio.play();
        }
    } catch (e) { console.error(e); }
}

// Request permission on load
initVoice();
