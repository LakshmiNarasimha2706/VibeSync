from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from dotenv import load_dotenv
from modules import database, emotion_detection, music_engine, music_organizer, socket_manager, speech_emotion
import os

# Load Environment Variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'default_dev_key')

# --- AUTH SETUP ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Mock User Model for Dev
class User(UserMixin):
    def __init__(self, id, name, email):
        self.id = id
        self.name = name
        self.email = email

# In-memory user store for MVP (Replace with DB in prod)
users = {}

@login_manager.user_loader
def load_user(user_id):
    return users.get(user_id)

socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize DB on startup
database.init_db()

# Organize music on startup
music_organizer.organize_music("modules/musicdata", "static/music")

# --- AUTH ROUTES ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Dev Login Check
        if password == os.getenv('DEV_PASSWORD', '123456'):
            user_id = email
            if user_id not in users:
                users[user_id] = User(user_id, email.split('@')[0], email)
            
            user = users[user_id]
            login_user(user)
            return redirect(url_for('index'))
        else:
            return "Invalid password (Use 123456 for dev)", 401

    return render_template('login.html', google_client_id=os.getenv('GOOGLE_CLIENT_ID'))

@app.route('/auth/google', methods=['POST'])
def google_auth():
    token = request.json.get("token")
    client_id = os.getenv('GOOGLE_CLIENT_ID')

    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            client_id
        )

        email = idinfo["email"]
        name = idinfo.get("name", email.split('@')[0])
        user_id = idinfo["sub"] # Google Unique ID

        # Create/Get User
        if user_id not in users:
             users[user_id] = User(user_id, name, email)
        
        # Login
        login_user(users[user_id])
        session["user"] = email # Legacy session support if needed
        
        print(f"[+] Google One Tap Success: {email}")
        return jsonify({ "success": True })

    except ValueError as e:
        print(f"[-] Token Verification Failed: {e}")
        return jsonify({ "success": False, "error": "Invalid token" }), 401
    except Exception as e:
        print(f"[-] Auth Error: {e}")
        return jsonify({ "success": False, "error": str(e) }), 500

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# --- APP ROUTES ---

@app.route('/')
@login_required
def index():
    return render_template('index.html', user=current_user)

@app.route('/detect-emotion', methods=['POST'])
@login_required
def detect_emotion():
    try:
        data = request.json
        image_data = data.get('image') if data else None
        
        result = emotion_detection.determine_current_emotion(image_data)
        return jsonify(result)
    except Exception as e:
        print(f"[-] Detect Emotion Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "emotion": "neutral", "source": "error"}), 500

@app.route('/detect-speech-emotion', methods=['POST'])
@login_required
def detect_speech_emotion():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
            
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No audio file selected"}), 400

        # Save temporarily
        temp_dir = os.path.join("static", "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, "temp_audio.wav")
        audio_file.save(temp_path)
        
        # Analyze
        result = speech_emotion.predict_speech_emotion(temp_path)
        
        # Clean up
        try:
            os.remove(temp_path)
        except:
            pass
            
        return jsonify(result)
    except Exception as e:
        print(f"❌ Detect Speech Emotion Error: {e}")
        return jsonify({"error": str(e), "emotion": "neutral", "source": "error"}), 500

@app.route('/recommend-music', methods=['POST'])
@login_required
def recommend_music():
    data = request.json
    emotion = data.get('emotion', 'neutral')
    mode = data.get('mode', 'mirror')
    language = data.get('language', 'English')
    step = data.get('step', 'validation') 
    
    song, category = music_engine.recommend_song(emotion, mode, language, step)
    
    if song:
        # Log to DB
        confidence = data.get('confidence', 0.0)
        database.log_mood_event(emotion, confidence, song, f"{mode}_{step}")
        
        return jsonify({
            "status": "success",
            "song": song,
            "category": category,
            "language": language,
            "url": f"/music/{category}/{song}"
        })
    else:
        return jsonify({
            "status": "error",
            "message": "No music found for this category. Please add music to static/music/"
        }), 404

@app.route('/music/<category>/<filename>')
@login_required
def serve_music(category, filename):
    return send_from_directory(os.path.join('static', 'music', category), filename)

# --- ANALYTICS & HISTORY ---

@app.route('/api/history/trends')
@login_required
def get_trends():
    days = request.args.get('days', 7, type=int)
    trends = database.get_mood_trends(days)
    # Convert to list of dicts
    result = [{"date": r[0], "valence": round(r[1], 2), "confidence": round(r[2], 2)} for r in trends]
    return jsonify(result)

@app.route('/api/history/logs')
@login_required
def get_logs():
    limit = request.args.get('limit', 50, type=int)
    logs = database.get_detailed_logs(limit)
    # Convert to list of dicts
    result = []
    for r in logs:
        result.append({
            "id": r[0],
            "timestamp": r[1],
            "emotion": r[2],
            "song": r[3],
            "mode": r[4],
            "confidence": round(r[5], 2)
        })
    return jsonify(result)

@app.route('/api/settings/clear-history', methods=['POST'])
@login_required
def clear_history_api():
    try:
        database.clear_history()
        return jsonify({"success": True, "message": "History cleared."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/settings/scan-library', methods=['POST'])
@login_required
def scan_library_api():
    try:
        music_organizer.organize_music("modules/musicdata", "static/music")
        return jsonify({"success": True, "message": "Library scanned successfully."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- SOCKET.IO EVENTS (SOUL SYNC) ---

@socketio.on('join_soul_room')
def on_join(data):
    room = data.get('room', 'lobby')
    name = data.get('name', 'Anonymous')
    if current_user.is_authenticated:
        name = current_user.name
        
    join_room(room)
    
    state = socket_manager.handle_join(room, request.sid, name)
    emit('room_update', state, room=room)
    print(f"SoulSync: {name} joined {room}")

@socketio.on('send_vibe')
def on_vibe(data):
    room = data.get('room', 'lobby')
    vector = data.get('vector', [0.0, 0.0]) # [valence, arousal]
    
    new_avg, delta = socket_manager.update_user_vibe(room, request.sid, vector)
    
    # Update the room visualizer
    emit('group_vibe_update', {"vibe": new_avg, "sid": request.sid}, room=room)
    
    # If vibe shifts significantly (> 0.4), recommend a new song for everyone
    if delta > 0.4:
        # Determine emotion from avg vector
        # Valence > 0 is happy/calm, < 0 is sad/angry
        emotion = "neutral"
        if new_avg[0] > 0.3: emotion = "happy"
        elif new_avg[0] < -0.3: emotion = "sad"
        
        song, category = music_engine.recommend_song(emotion, "mirror")
        if song:
            emit('sync_playback', {
                "url": f"/music/{category}/{song}",
                "song": song,
                "category": category
            }, room=room)

@socketio.on('disconnect')
def on_disconnect():
    # Find which room this SID was in (simple scan for MVP)
    for room_id in list(socket_manager.ROOMS.keys()):
        state = socket_manager.handle_leave(room_id, request.sid)
        if state is not None:
             emit('room_update', state, room=room_id)

if __name__ == '__main__':
    # Listen on all network interfaces to allow LAN connection
    socketio.run(app, debug=True, host='127.0.0.1', port=5000, allow_unsafe_werkzeug=True)
