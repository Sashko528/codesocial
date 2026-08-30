from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import sqlite3
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
cursor.execute("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, username TEXT, lang TEXT, code TEXT, output TEXT)")
conn.commit()

class PostData(BaseModel):
    username: str
    language: str
    code: str

@app.post("/post")
def create_post(data: PostData):
    output = ""
    # Очищаємо назву мови від можливих пробілів та зводимо до нижнього регістру
    lang = data.language.strip().lower()

    if lang == "python":
        try:
            result = subprocess.run(["python3", "-c", data.code], capture_output=True, text=True, timeout=5)
            output = result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            output = str(e)
            
    elif lang == "lua":
        try:
            lua = LuaRuntime(unpack_returned_tuples=True)
            lua_logs = []
            
            def lua_print(*args):
                lua_logs.append(" ".join(map(str, args)))
            
            globals_env = lua.globals()
            globals_env['print'] = lua_print
            
            # Виконуємо саме Lua-код
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
