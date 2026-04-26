import os
import numpy as np
import librosa
import soundfile as sf
import random

# Placeholder for model loading
MODEL_PATH = "modules/speech_emotion_model.h5"
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            # Import keras here to avoid overhead if not using model
            from tensorflow.keras.models import load_model as load_keras_model # type: ignore
            model = load_keras_model(MODEL_PATH)
            print("[+] SER Model loaded from {MODEL_PATH}")
        except Exception as e:
            print(f"[-] Failed to load SER model: {e}")
    else:
        print("[!] No SER model found. Using simulation mode.")

def extract_features(file_path):
    """
    Extracts MFCC features from audio file.
    This matches the standard approach for SER models.
    """
    try:
        # Load audio file
        y, sr = librosa.load(file_path, duration=3, offset=0.5)
        
        # Extract MFCCs
        mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40).T, axis=0)
        
        return np.expand_dims(mfcc, axis=0) # Reshape for model (1, 40)
    except Exception as e:
        print(f"[-] Feature extraction error: {e}")
        return None

def predict_speech_emotion(file_path):
    """
    Predicts emotion from audio file.
    Returns: {"emotion": str, "confidence": float}
    """
    if model:
        features = extract_features(file_path)
        if features is not None:
            try:
                # Predict
                predictions = model.predict(features)
                emotion_labels = ['neutral', 'calm', 'happy', 'sad', 'angry', 'fearful', 'disgust', 'surprised']
                
                # Get highest confidence emotion
                max_index = np.argmax(predictions)
                emotion = emotion_labels[max_index]
                confidence = float(np.max(predictions))
                
                return {"emotion": emotion, "confidence": confidence}
            except Exception as e:
                print(f"[-] Prediction error: {e}")
    
    # --- SIMULATION MODE (Fallback) ---
    print("[i] Using simulated SER results (No model or prediction failed)")
    
    # In a real scenario without a model, we might just return random or neutral
    # For demo purposes, let's randomize slightly to show UI changes
    emotions = ['happy', 'neutral', 'sad', 'angry']
    # Bias slightly towards happy/neutral for better UX
    weights = [0.3, 0.4, 0.2, 0.1] 
    
    selected = random.choices(emotions, weights=weights, k=1)[0]
    confidence = round(random.uniform(0.6, 0.95), 2)
    
    return {"emotion": selected, "confidence": confidence, "simulated": True}

# Initialize on module load
load_model()
