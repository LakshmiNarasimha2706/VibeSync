import datetime
import random
import cv2
import numpy as np
import base64
import os

# Suppress TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Dropout, Flatten, Conv2D, MaxPooling2D
    KERAS_AVAILABLE = True
except ImportError as e:
    print(f"TensorFlow/Keras not available ({e}).")
    KERAS_AVAILABLE = False

# Constants and Paths
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, 'model.h5')
CASCADE_PATH = os.path.join(BASE_DIR, 'haarcascade_frontalface_default.xml')

# Emotion Mapping (as per user snippet)
EMOTION_DICT = {
    0: "angry", 
    1: "disgust", 
    2: "fear",    
    3: "happy", 
    4: "sad", 
    5: "surprise", 
    6: "neutral"
}

# Global variables for model and cascade
_model = None
_face_cascade = None

def get_model():
    """Initializes and returns the Keras model (singleton)."""
    global _model
    if _model is not None:
        return _model
    
    if not KERAS_AVAILABLE:
        return None

    try:
        # Recreate architecture
        model = Sequential()
        model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48,48,1)))
        model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))

        model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))

        model.add(Flatten())
        model.add(Dense(1024, activation='relu'))
        model.add(Dropout(0.5))
        model.add(Dense(7, activation='softmax'))

        # Load weights
        if os.path.exists(MODEL_PATH):
            model.load_weights(MODEL_PATH)
            print("Custom Keras model loaded successfully.")
        else:
            print(f"Model file not found at {MODEL_PATH}")
            return None
            
        _model = model
        return _model
    except Exception as e:
        print(f"Error loading Keras model: {e}")
        return None

def get_cascade():
    """Returns the Haar cascade classifier."""
    global _face_cascade
    if _face_cascade is not None:
        return _face_cascade
    
    if os.path.exists(CASCADE_PATH):
        _face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    else:
        print(f"Haar cascade file not found at {CASCADE_PATH}")
    return _face_cascade

def detect_emotion_from_image(image_data_base64):
    """
    Detects emotion using the custom Keras model.
    """
    model = get_model()
    face_cascade = get_cascade()
    
    if not model or not face_cascade:
        return {"emotion": "neutral", "confidence": 0.0, "source": "model_missing_fallback"}
        
    try:
        # Decode image
        if ',' in image_data_base64:
            encoded_data = image_data_base64.split(',')[1]
        else:
            encoded_data = image_data_base64
            
        nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"emotion": "neutral", "confidence": 0.0, "source": "decode_failure"}

        # Preprocessing: Grayscale and Histogram Equalization
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Face Detection: Slightly more lenient scaleFactor for better reliability
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        if len(faces) == 0:
            print("No face detected by Haar Cascade.")
            return {"emotion": "neutral", "confidence": 0.0, "source": "no_face_detected"}

        # Get first detected face
        (x, y, w, h) = faces[0]
        roi_gray = gray[y:y + h, x:x + w]
        
        # IMPROVEMENT: Apply Histogram Equalization to normalized ROI to improve contrast/accuracy
        roi_gray = cv2.equalizeHist(roi_gray)
        
        # Resize and normalize
        # Using interpolation=cv2.INTER_AREA for shrinking images is usually better
        cropped_img = cv2.resize(roi_gray, (48, 48), interpolation=cv2.INTER_AREA)
        
        # Rescale as per user snippet (ImageDataGenerator rescale=1./255)
        normalized_img = cropped_img.astype('float32') / 255.0
        
        # Expand dimensions for model: (1, 48, 48, 1)
        final_img = np.expand_dims(np.expand_dims(normalized_img, -1), 0)
        
        # Predict (Standard inference)
        prediction = model.predict(final_img, verbose=0)
        max_index = int(np.argmax(prediction[0]))
        confidence = float(np.max(prediction[0])) * 100
        
        # Log all scores for debugging "neutral" bias
        scores_desc = {EMOTION_DICT[i]: round(float(prediction[0][i])*100, 2) for i in range(len(EMOTION_DICT))}
        import sys
        sys.stderr.write(f"\nDEBUG - Raw Prediction Scores: {prediction[0]}\n")
        sys.stderr.write(f"DEBUG - Decoded Scores: {scores_desc}\n")
        
        dominant_emotion = EMOTION_DICT.get(max_index, "neutral")
        sys.stderr.write(f"Custom Model: Detected {dominant_emotion} with {confidence:.2f}% confidence.\n")
        sys.stderr.flush()

        return {
            "emotion": dominant_emotion,
            "confidence": confidence,
            "source": "custom_keras_model",
            "debug_scores": scores_desc
        }
    except Exception as e:
        print(f"Error in custom model detection: {e}")
        return {"emotion": "neutral", "confidence": 0.0, "source": "custom_model_error"}

def get_rule_based_emotion():
    """
    Returns an emotion based on time of day and randomness.
    """
    current_hour = datetime.datetime.now().hour
    
    if 5 <= current_hour < 12:
        base_emotion = "calm"
    elif 12 <= current_hour < 18:
        base_emotion = "energetic"
    elif 18 <= current_hour < 22:
        base_emotion = "happy"
    else:
        base_emotion = "calm"
        
    if random.random() < 0.2:
        possible = ["happy", "sad", "neutral", "energetic", "calm"]
        return random.choice(possible)
        
    return base_emotion

def determine_current_emotion(image_data=None, voice_data=None):
    """
    EMOTUNE v2.1: Pure Visual Biometrics
    Focused solely on face-based emotion detection.
    """
    if image_data:
        face_result = detect_emotion_from_image(image_data)
        return {
            "emotion": face_result['emotion'],
            "confidence": face_result['confidence'],
            "source": face_result['source'],
            "timestamp": datetime.datetime.now().isoformat(),
            "debug_scores": face_result.get('debug_scores', {})
        }
    
    # Rule-based fallback if no image provided
    return {
        "emotion": get_rule_based_emotion(),
        "confidence": 50.0,
        "source": "rule_based_fallback",
        "timestamp": datetime.datetime.now().isoformat()
    }

# Pre-load model and cascade on import
get_model()
get_cascade()
