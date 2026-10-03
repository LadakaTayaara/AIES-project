import sqlite3
import os
import glob

db_path = os.path.join(os.path.dirname(__file__), "..", "backend", "hole_lotta_problems.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("DELETE FROM reports")
    cur.execute("DELETE FROM forum_posts WHERE author_name LIKE '%Test%' OR title LIKE '%test%' OR title LIKE '%Identification Help%'")
    conn.commit()
    conn.close()
    print("Database reports and test forum posts cleared.")

backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
for folder in ["uploads", "annotated"]:
    folder_path = os.path.join(backend_dir, folder)
    if os.path.exists(folder_path):
        for f in glob.glob(os.path.join(folder_path, "*")):
            try:
                os.remove(f)
                print(f"Removed: {f}")
            except Exception as e:
                print(f"Error removing {f}: {e}")

print("ALL SAMPLE INPUT IMAGES AND DATABASE REPORTS CLEARED.")
