/**
 * EMOTION-VISUALS.JS
 * Manages emotion-based visual updates
 * Handles CSS transitions, color changes, and UI animations
 */

class EmotionVisuals {
    constructor() {
        this.currentEmotion = 'neutral';
        this.emotionClasses = ['emotion-happy', 'emotion-calm', 'emotion-sad', 'emotion-energetic', 'emotion-neutral'];

        // Emotion configurations
        this.emotionConfig = {
            happy: {
                emoji: '😊',
                name: 'Happy',
                cssClass: 'emotion-happy',
                description: 'Feeling joyful and uplifted'
            },
            calm: {
                emoji: '😌',
                name: 'Calm',
                cssClass: 'emotion-calm',
                description: 'Peaceful and relaxed'
            },
            sad: {
                emoji: '😢',
                name: 'Sad',
                cssClass: 'emotion-sad',
                description: 'Feeling melancholic'
            },
            energetic: {
                emoji: '🔥',
                name: 'Energetic',
                cssClass: 'emotion-energetic',
                description: 'Full of energy and excitement'
            },
            neutral: {
                emoji: '😐',
                name: 'Neutral',
                cssClass: 'emotion-neutral',
                description: 'Just chilling'
            },
            angry: {
                emoji: '😠',
                name: 'Angry',
                cssClass: 'emotion-energetic',
                description: 'Let it out'
            },
            fear: {
                emoji: '😨',
                name: 'Fear',
                cssClass: 'emotion-sad',
                description: 'Stay brave'
            },
            disgust: {
                emoji: '🤢',
                name: 'Disgust',
                cssClass: 'emotion-calm',
                description: 'Take a breath'
            },
            surprise: {
                emoji: '😲',
                name: 'Surprise',
                cssClass: 'emotion-happy',
                description: 'Wow!'
            }
        };
    }

    /**
     * Update the UI based on emotion
     * @param {string} emotion - The current emotion
     */
    updateEmotion(emotion) {
        emotion = emotion.toLowerCase();
        if (!this.emotionConfig[emotion]) {
            console.warn(`Unknown emotion: ${emotion}. Defaulting to 'neutral'.`);
            emotion = 'neutral';
        }

        this.currentEmotion = emotion;
        const config = this.emotionConfig[emotion];

        // Update emotion badge
        this.updateEmotionBadge(config);

        // Update CSS variables and classes
        this.updateThemeColors(config.cssClass);

        // Trigger animations
        this.triggerEmotionAnimation();

        // Update Three.js scene if available
        if (window.threeScene) {
            window.threeScene.updateEmotion(emotion);
        }

        console.log(`✨ Emotion updated to: ${config.name}`);
    }

    /**
     * Update emotion badge (emoji and text)
     * @param {object} config - Emotion configuration
     */
    updateEmotionBadge(config) {
        const emojiElement = document.getElementById('emotion-emoji');
        const textElement = document.getElementById('emotion-text');
        const cardElement = document.getElementById('emotion-card');

        if (emojiElement && textElement && cardElement) {
            // Add exit animation
            cardElement.style.transform = 'scale(0.95)';
            cardElement.style.opacity = '0.5';

            setTimeout(() => {
                // Update content
                emojiElement.textContent = config.emoji;
                textElement.textContent = config.name;

                // Add entrance animation
                cardElement.style.transform = 'scale(1)';
                cardElement.style.opacity = '1';

                // Trigger emoji bounce
                emojiElement.style.animation = 'none';
                setTimeout(() => {
                    emojiElement.style.animation = 'bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                }, 10);
            }, 200);
        }
    }

    /**
     * Update theme colors by switching CSS class
     * @param {string} cssClass - The emotion-specific CSS class
     */
    updateThemeColors(cssClass) {
        const body = document.body;

        // Remove all emotion classes
        this.emotionClasses.forEach(cls => body.classList.remove(cls));

        // Add new emotion class
        body.classList.add(cssClass);
    }

    /**
     * Trigger visual animation when emotion changes
     */
    triggerEmotionAnimation() {
        const mainContent = document.querySelector('.main-content');

        if (mainContent) {
            // Subtle pulse effect
            mainContent.style.transform = 'scale(0.98)';

            setTimeout(() => {
                mainContent.style.transform = 'scale(1)';
            }, 200);
        }

        // Animate logo glow
        const logoGlow = document.querySelector('.logo-glow');
        if (logoGlow) {
            logoGlow.style.transform = 'translate(-50%, -50%) scale(1.3)';
            logoGlow.style.opacity = '0.6';

            setTimeout(() => {
                logoGlow.style.transform = 'translate(-50%, -50%) scale(1)';
                logoGlow.style.opacity = '0.3';
            }, 500);
        }
    }

    /**
     * Get current emotion
     * @returns {string} Current emotion
     */
    getCurrentEmotion() {
        return this.currentEmotion;
    }
}

// Initialize EmotionVisuals
window.emotionVisuals = new EmotionVisuals();
