from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import sqlite3
import uuid
from datetime import datetime, timedelta
from lupa import LuaRuntime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = sqlite3.connect("social.db", check_same_thread=False)
cursor = conn.cursor()

# Таблиця дописів
cursor.execute("""
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username TEXT, 
    lang TEXT, 
    code TEXT, 
    output TEXT
)
""")

# Таблиця унікальних посилань
cursor.execute("""
CREATE TABLE IF NOT EXISTS invites (
    code TEXT PRIMARY KEY,
    creator TEXT,
    type TEXT,
    created_at TIMESTAMP
)
""")

# Таблиця контактів та груп
cursor.execute("""
CREATE TABLE IF NOT EXISTS user_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT,
    target TEXT,
    type TEXT
)
""")
conn.commit()

class PostData(BaseModel):
    username: str
    language: str
    code: str

class InviteUseData(BaseModel):
    username: str
    code: str

@app.post("/post")
def create_post(data: PostData):
    output = ""
    lang = data.language.strip().lower()

    if lang == "python":
        try:
            py_code = (
                "current_color = '#a6e3a1'\n"
                "def color(c):\n"
                "    global current_color\n"
                "    current_color = c\n"
                "def print(*args):\n"
                "    import builtins\n"
                "    text = ' '.join(map(str, args))\n"
                "    builtins.print(f'<span style=\"color: {current_color};\">{text}</span>')\n\n"
            ) + data.code

            result = subprocess.run(["python3", "-c", py_code], capture_output=True, text=True, timeout=5)
            output = result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            output = str(e)
            
    elif lang == "lua":
        try:
            lua = LuaRuntime(unpack_returned_tuples=True)
            lua_logs = []
            current_color = "#a6e3a1"
            
            def lua_print(*args):
                text = " ".join(map(str, args))
                lua_logs.append(f'<span style="color: {current_color};">{text}</span>')
                
            def lua_color(c):
                nonlocal current_color
                current_color = str(c)
                
            globals_env = lua.globals()
            globals_env['print'] = lua_print
            globals_env['color'] = lua_color
            
            lua.execute(data.code)
            output = "\n".join(lua_logs)
        except Exception as e:
            output = f"Lua error: {str(e)}"

    if not output.strip():
        output = "(Код виконано без виводу)"

    cursor.execute("INSERT INTO posts (username, lang, code, output) VALUES (?, ?, ?, ?)", 
                   (data.username, data.language, data.code, output))
    conn.commit()
    return {"status": "ok"}

@app.get("/posts")
def get_posts():
    cursor.execute("SELECT username, lang, code, output FROM posts ORDER BY id DESC")
    return cursor.fetchall()

@app.post("/create-invite")
def create_invite(username: str, invite_type: str):
    cursor.execute(
        "SELECT created_at FROM invites WHERE creator = ? AND type = ? ORDER BY created_at DESC LIMIT 1",
        (username, invite_type)
    )
    last_invite = cursor.fetchone()
    
    if last_invite:
        last_time = datetime.fromisoformat(last_invite[0])
        if datetime.now() - last_time < timedelta(hours=24):
            time_left = timedelta(hours=24) - (datetime.now() - last_time)
            hours_left = int(time_left.total_seconds() // 3600)
            return {"status": "error", "message": f"Посилання можна створювати 1 раз на 24 години! Зачекай ще ~{hours_left} год."}

    invite_code = str(uuid.uuid4())[:8]
    cursor.execute(
        "INSERT INTO invites (code, creator, type, created_at) VALUES (?, ?, ?, ?)",
        (invite_code, username, invite_type, datetime.now().isoformat())
    )
    conn.commit()
    return {"status": "ok", "code": invite_code}

@app.post("/use-invite")
def use_invite(data: InviteUseData):
    cursor.execute("SELECT creator, type FROM invites WHERE code = ?", (data.code,))
    invite = cursor.fetchone()
    
    if not invite:
        return {"status": "error", "message": "Таке посилання не існує!"}
        
    creator, invite_type = invite
    if creator == data.username:
        return {"status": "error", "message": "Це твоє власне посилання!"}

    cursor.execute("SELECT id FROM user_relations WHERE user = ? AND target = ? AND type = ?", 
                   (data.username, creator, invite_type))
    if cursor.fetchone():
        return {"status": "error", "message": f"Ти вже перебуваєш у зв'язку з {creator} ({invite_type})!"}

    cursor.execute("INSERT INTO user_relations (user, target, type) VALUES (?, ?, ?)", (data.username, creator, invite_type))
    cursor.execute("INSERT INTO user_relations (user, target, type) VALUES (?, ?, ?)", (creator, data.username, invite_type))
    conn.commit()
    
    return {"status": "ok", "message": f"Успішно додано {invite_type}: {creator}"}
