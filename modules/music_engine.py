import os
import random

MUSIC_DIR = "static/music"

# Emotion to Music Category Mapping (Mirror Mode)
MIRROR_MAP = {
    "happy": "happy",
    "sad": "sad",
    "neutral": "neutral",
    "fear": "calm",
    "angry": "calm",
    "disgust": "neutral",
    "surprise": "energetic"
}

# Emotion to Music Category Mapping (Iso Principle Transition)
ISO_STEPS = {
    "validation": lambda e: MIRROR_MAP.get(e, "neutral"),
    "transition": lambda e: "neutral",
    "elevation": lambda e: "happy" if e in ["sad", "neutral", "calm"] else "energetic"
}

def get_available_songs(category):
    """Scans the specific emotion directory for songs."""
    path = os.path.join(MUSIC_DIR, category)
    if not os.path.exists(path):
        os.makedirs(path, exist_ok=True)
        return []
    
    songs = [s for s in os.listdir(path) if s.endswith(('.mp3', '.wav', '.ogg'))]
    return songs

def recommend_song(emotion, mode="mirror", language="English", step="validation"):
    """
    Selects a song based on emotion, mode, language and Iso-Principle step.
    Returns: (song_filename, target_emotion_category)
    """
    
    # 1. Determine Target Category
    if mode == "balance":
        # Iso-Principle Logic
        target_category = ISO_STEPS.get(step, ISO_STEPS["validation"])(emotion)
    else:
        # Standard Mirror Mode
        target_category = MIRROR_MAP.get(emotion, "neutral")
        
    # 2. Filter by Category & Language
    # In this local structure, we assume songs might have language prefixes or we just return from category
    # For a real system, we'd have a database search. For now, we use the local files.
    
    songs = get_available_songs(target_category)
    
    if not songs:
        target_category = "neutral"
        songs = get_available_songs("neutral")
        
    if not songs:
        for cat in ["happy", "energetic", "calm", "sad"]:
            songs = get_available_songs(cat)
            if songs:
                target_category = cat
                break
                
    if not songs:
        return None, "No music found"

    # Simulated Language Filter (Prefix check)
    # If language is Hindi, favor files starting with 'HI_' etc.
    lang_prefix = {"Hindi": "HI_", "Telugu": "TE_", "Spanish": "ES_"}.get(language, "")
    filtered_songs = [s for s in songs if s.startswith(lang_prefix)]
    
    final_list = filtered_songs if filtered_songs else songs
    selected_song = random.choice(final_list)
    
    return selected_song, target_category
