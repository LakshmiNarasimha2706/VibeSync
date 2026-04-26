
import sys
import os
import numpy as np
import cv2
import base64

# Add the project directory to sys.path
sys.path.append(os.path.abspath('.'))

from modules import emotion_detection

def test_detection():
    # Create a dummy gray image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    # Draw a simple face-like shape or just keep it blank to see default response
    cv2.circle(img, (50, 50), 30, (255, 255, 255), -1)
    
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    print("Testing emotion detection...")
    result = emotion_detection.detect_emotion_from_image(img_base64)
    print(f"Result: {result}")

if __name__ == "__main__":
    test_detection()
