/**
 * SOULSYNC.JS
 * Real-time synchronization logic for EMOTUNE
 */

class SoulSync {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.roomId = null;
        this.userName = "User";

        this.init();
    }

    init() {
        this.joinBtn = document.getElementById('join-room-btn');
        this.genBtn = document.getElementById('gen-room-btn');
        this.roomInput = document.getElementById('room-id');
        this.nameInput = document.getElementById('user-name');
        this.lobbyEl = document.getElementById('active-lobby');
        this.setupEl = document.querySelector('.sync-setup');

        this.vibeDot = document.getElementById('group-vibe-dot');
        this.userListEl = document.getElementById('soul-users');
        this.roomLabel = document.getElementById('display-room-id');
        this.countLabel = document.getElementById('active-count');

        this.joinBtn.addEventListener('click', () => this.connect());
        this.genBtn.addEventListener('click', () => this.generateRoomCode());
    }

    generateRoomCode() {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomInput.value = code;
        console.log("Generated Room Code:", code);
    }

    connect() {
        if (!this.roomInput.value) return alert("Please enter a room code");

        // Prevent duplicate connections (fix for 23 users bug)
        if (this.socket && this.socket.connected) {
            console.log("Already connected");
            return;
        }

        this.joinBtn.disabled = true;
        this.joinBtn.textContent = "Connecting...";

        this.roomId = this.roomInput.value;
        this.userName = this.nameInput.value || "Anonymous";

        // Load socket.io from CDN if not present
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
            script.onload = () => this.startSocket();
            document.head.appendChild(script);
        } else {
            this.startSocket();
        }
    }

    startSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log("SoulSync Connected:", this.socket.id);
            this.socket.emit('join_soul_room', {
                room: this.roomId,
                name: this.userName
            });

            this.setupEl.classList.add('hidden');
            this.lobbyEl.classList.remove('hidden');
            this.roomLabel.textContent = this.roomId;
        });

        this.socket.on('room_update', (state) => {
            this.updateUserList(state.users);
            this.updateGroupVibe(state.vibe);
        });

        this.socket.on('group_vibe_update', (data) => {
            this.updateGroupVibe(data.vibe);
            // Optional: pulse the dot for the specific SID
        });

        this.socket.on('sync_playback', (track) => {
            console.log("Global Sync Triggered:", track.song);
            this.app.updateTrackUI(track);
            this.app.audio.src = track.url;
            this.app.audio.play();
            this.app.isPlaying = true;
            document.getElementById('play-btn').textContent = '⏸';
        });

        // Start heartbeat: send my vibe every 5s if biometric is active
        this.startHeartbeat();
    }

    startHeartbeat() {
        setInterval(() => {
            if (this.socket && this.app.isBiometricActive) {
                // Map current emotion to vector [valence, arousal]
                const vector = this.getMoodVector(this.app.visuals.currentEmotion);
                this.socket.emit('send_vibe', {
                    room: this.roomId,
                    vector: vector
                });
            }
        }, 5000);
    }

    updateUserList(users) {
        this.userListEl.innerHTML = '';
        const sids = Object.keys(users);
        sids.forEach(sid => {
            const pill = document.createElement('div');
            pill.className = `user-pill ${sid === this.socket.id ? 'me' : ''}`;
            pill.textContent = users[sid][2]; // name
            this.userListEl.appendChild(pill);
        });
        this.countLabel.textContent = sids.length;
    }

    updateGroupVibe(vibe) {
        // Vibe = [valence, arousal] in range [-1, 1]
        // Radar is 200px. Center is (100, 100).
        const x = 100 + (vibe[1] * 80); // arousal maps to X
        const y = 100 - (vibe[0] * 80); // valence maps to Y

        this.vibeDot.style.left = `${x}px`;
        this.vibeDot.style.top = `${y}px`;
    }

    getMoodVector(emotion) {
        const map = {
            happy: [0.8, 0.6],
            energetic: [0.5, 0.9],
            calm: [0.4, -0.4],
            sad: [-0.6, -0.6],
            angry: [-0.8, 0.5],
            fear: [-0.5, 0.7],
            neutral: [0.0, 0.0]
        };
        return map[emotion] || [0.0, 0.0];
    }
}

// Attach to global app
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.soulSync = new SoulSync(window.app);
    }
});
