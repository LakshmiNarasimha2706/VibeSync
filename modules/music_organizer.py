import os
import shutil

def organize_music(source_dir, dest_base_dir):
    """
    Organizes music files from source_dir into categorized subfolders in dest_base_dir
    based on keywords in filenames.
    """
    if not os.path.exists(source_dir):
        print(f"Source directory not found: {source_dir}")
        return

    # Keyword mappings
    categories = {
        "happy": ["happy", "love", "romance", "beat", "party", "dance", "jathakalise", "chuttesai", "crazy", "andamaina", "nene"],
        "sad": ["sad", "cry", "lonely", "breakup", "miss", "pain", "pillaa"],
        "energetic": ["high", "fast", "mass", "dhoom", "boss", "kummudu", "poonakaalu", "pulsar", "bheemla", "chithaka"],
        "calm": ["calm", "peace", "melody", "slow", "sleep", "relax", "samajavaragamana", "nuvvunte", "kallalo"],
        "neutral": [] # Default fallback
    }

    # Ensure destination directories exist
    for cat in categories:
        os.makedirs(os.path.join(dest_base_dir, cat), exist_ok=True)

    # Process files
    files_moved = 0
    for filename in os.listdir(source_dir):
        # Skip if not a file or not an audio file
        src_path = os.path.join(source_dir, filename)
        if not os.path.isfile(src_path):
            continue
            
        if not filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
            continue

        filename_lower = filename.lower()
        target_category = "neutral"

        # Check keywords
        found = False
        for cat, keywords in categories.items():
            if cat == "neutral": continue
            for vid in keywords:
                if vid in filename_lower:
                    target_category = cat
                    found = True
                    break
            if found:
                break
        
        # Move file
        dest_path = os.path.join(dest_base_dir, target_category, filename)
        try:
            # Copy instead of move to preserve original data for now, or move?
            # User said "distribute", usually implies moving or copying. 
            # To be safe and idempotent, let's COPY if not exists.
            if not os.path.exists(dest_path):
                shutil.copy2(src_path, dest_path)
                print(f"Organized: {filename} -> {target_category}")
                files_moved += 1
        except Exception as e:
            print(f"Error moving {filename}: {e}")

    if files_moved > 0:
        print(f"Successfully organized {files_moved} songs.")
    else:
        print("No new songs to organize.")
