"""
SOCKET_MANAGER.PY
Handles real-time multi-user synchronization and Group Vibe calculation
"""

import math

# Room Memory (In-memory for MVP)
# Structure: { "room_id": { "users": { "sid": [valence, arousal, name] }, "vibe": [0, 0] } }
ROOMS = {}

def calculate_group_vibe(room_id):
    """
    Calculates the arithmetic mean of all user emotion vectors in the room.
    Vector Format: [Valence, Arousal]
    """
    if room_id not in ROOMS:
        return [0.0, 0.0]
    
    users = ROOMS[room_id]["users"]
    if not users:
        return [0.0, 0.0]
    
    total_valence = 0.0
    total_arousal = 0.0
    count = 0
    
    for sid, data in users.items():
        # data = [valence, arousal, name]
        total_valence += data[0]
        total_arousal += data[1]
        count += 1
        
    avg_vibe = [total_valence / count, total_arousal / count]
    ROOMS[room_id]["vibe"] = avg_vibe
    return avg_vibe

def get_vibe_distance(v1, v2):
    """Calculates Euclidean distance between two vibe vectors."""
    return math.sqrt((v1[0] - v2[0])**2 + (v1[1] - v2[1])**2)

def handle_join(room_id, sid, name):
    """Adds a user to a room state."""
    if room_id not in ROOMS:
        ROOMS[room_id] = {"users": {}, "vibe": [0.0, 0.0]}
    
    # Default neutral vibe for new user
    ROOMS[room_id]["users"][sid] = [0.0, 0.0, name]
    return ROOMS[room_id]

def handle_leave(room_id, sid):
    """Removes a user and returns updated room state."""
    if room_id in ROOMS and sid in ROOMS[room_id]["users"]:
        del ROOMS[room_id]["users"][sid]
        if not ROOMS[room_id]["users"]:
            del ROOMS[room_id]
            return None
    return ROOMS.get(room_id)

def update_user_vibe(room_id, sid, vector):
    """Updates one user's vector and returns the delta in group vibe."""
    if room_id in ROOMS and sid in ROOMS[room_id]["users"]:
        old_vibe = ROOMS[room_id]["vibe"]
        # preserving the name
        name = ROOMS[room_id]["users"][sid][2]
        ROOMS[room_id]["users"][sid] = [vector[0], vector[1], name]
        
        new_vibe = calculate_group_vibe(room_id)
        distance = get_vibe_distance(old_vibe, new_vibe)
        return new_vibe, distance
    return None, 0.0
