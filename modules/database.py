import sqlite3
import datetime
import os

DB_NAME = "emotune.db"

def init_db():
    """Initializes the database with necessary tables."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Table for storing mood history
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mood_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            emotion TEXT NOT NULL,
            confidence REAL,
            song_played TEXT,
            mode TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

def log_mood_event(emotion, confidence, song_played, mode):
    """Logs a mood event to the database."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    timestamp = datetime.datetime.now().isoformat()
    
    cursor.execute('''
        INSERT INTO mood_history (timestamp, emotion, confidence, song_played, mode)
        VALUES (?, ?, ?, ?, ?)
    ''', (timestamp, emotion, confidence, song_played, mode))
    
    conn.commit()
    conn.close()

def get_recent_history(limit=5):
    """Retrieves the most recent mood history."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT timestamp, emotion, song_played, mode 
        FROM mood_history 
        ORDER BY id DESC 
        LIMIT ?
    ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_mood_trends(days=7):
    """Aggregates mood data by day for trend analysis."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Calculate Valence average per day (Approximate based on emotion)
    # Mapping: happy=0.8, energetic=0.5, neutral=0, sad=-0.6, angry=-0.8, calm=0.4
    cursor.execute('''
        SELECT 
            date(timestamp) as day,
            AVG(CASE 
                WHEN emotion='happy' THEN 0.8
                WHEN emotion='energetic' THEN 0.5
                WHEN emotion='calm' THEN 0.4
                WHEN emotion='neutral' THEN 0.0
                WHEN emotion='sad' THEN -0.6
                WHEN emotion='angry' THEN -0.8
                ELSE 0.0 END) as valence,
            AVG(confidence) as avg_confidence
        FROM mood_history
        WHERE timestamp >= date('now', '-' || ? || ' days')
        GROUP BY day
        ORDER BY day ASC
    ''', (days,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_detailed_logs(limit=50):
    """Returns activity logs with more metadata for the timeline."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, timestamp, emotion, song_played, mode, confidence
        FROM mood_history
        ORDER BY id DESC
        LIMIT ?
    ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def clear_history():
    """Clears all data from the mood_history table."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM mood_history")
    conn.commit()
    conn.close()
