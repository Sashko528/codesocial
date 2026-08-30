from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import sqlite3

app = FastAPI()

# Дозволяємо підключення з браузерів
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Створюємо базу даних SQLite
conn = sqlite3.connect("social.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, username TEXT, code TEXT, output TEXT)")
conn.commit()

class PostData(BaseModel):
    username: str
    code: str
    language: str

@app.post("/post")
def create_post(data: PostData):
    # Виконуємо код на сервері
    try:
        cmd = ["python3", "-c", data.code] if data.language == "python" else ["lua", "-e", data.code]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
        output = result.stdout if result.returncode == 0 else result.stderr
    except Exception as e:
        output = str(e)

    # Зберігаємо в SQLite
    cursor.execute("INSERT INTO posts (username, code, output) VALUES (?, ?, ?)", (data.username, data.code, output))
    conn.commit()
    return {"status": "ok", "output": output}

@app.get("/posts")
def get_posts():
    cursor.execute("SELECT username, code, output FROM posts ORDER BY id DESC")
    return cursor.fetchall()
