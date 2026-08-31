import time
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

cursor.execute("""
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    username TEXT, 
    lang TEXT, 
    code TEXT, 
    output TEXT,
    has_input INTEGER DEFAULT 0
)
""")
conn.commit()

class PostData(BaseModel):
    username: str
    language: str
    code: str

@app.post("/post")
def create_post(data: PostData):
    output = ""
    lang = data.language.strip().lower()
    has_input = 0

    if "input(" in data.code or "io.read(" in data.code or "io.read()" in data.code:
        has_input = 1

    if lang == "python":
        try:
            py_code = (
                "import time\n"
                "current_color = '#a6e3a1'\n"
                "current_bg = 'transparent'\n"
                "is_bold = False\n"
                "logs = []\n\n"
                "def color(c):\n"
                "    global current_color\n"
                "    current_color = c\n\n"
                "def bg_color(c):\n"
                "    global current_bg\n"
                "    current_bg = c\n\n"
                "def bold(state=True):\n"
                "    global is_bold\n"
                "    is_bold = state\n\n"
                "def clear():\n"
                "    global logs\n"
                "    logs = []\n\n"
                "def wait(s):\n"
                "    time.sleep(min(s, 3))\n\n"
                "def custom_print(*args):\n"
                "    text = ' '.join(map(str, args))\n"
                "    weight = 'bold' if is_bold else 'normal'\n"
                "    logs.append(f'<span style=\"color: {current_color}; background-color: {current_bg}; font-weight: {weight};\">{text}</span>')\n\n"
                "def custom_input(prompt=''):\n"
                "    if prompt: custom_print(prompt)\n"
                "    return '[Очікує вводу...]'\n\n"
                "print = custom_print\n"
                "input = custom_input\n\n"
            ) + data.code + "\nbuiltins_print = print\nimport builtins\nbuiltins.print('\\n'.join(logs))"

            result = subprocess.run(["python3", "-c", py_code], capture_output=True, text=True, timeout=5)
            output = result.stdout if result.returncode == 0 else result.stderr
        except Exception as e:
            output = str(e)
            
    elif lang == "lua":
        try:
            lua = LuaRuntime(unpack_returned_tuples=True)
            lua_logs = []
            current_color = "#a6e3a1"
            current_bg = "transparent"
            is_bold = False
            
            def lua_color(c):
                nonlocal current_color
                current_color = str(c)

            def lua_bg_color(c):
                nonlocal current_bg
                current_bg = str(c)

            def lua_bold(state):
                nonlocal is_bold
                is_bold = bool(state) if state is not None else True

            def lua_clear():
                nonlocal lua_logs
                lua_logs.clear()

            def lua_wait(s):
                time.sleep(min(float(s or 0), 3))

            def lua_print(*args):
                text = " ".join(map(str, args))
                weight = "bold" if is_bold else "normal"
                lua_logs.append(f'<span style="color: {current_color}; background-color: {current_bg}; font-weight: {weight};">{text}</span>')

            def lua_read():
                return "[Очікує вводу...]"

            globals_env = lua.globals()
            globals_env['print'] = lua_print
            globals_env['color'] = lua_color
            globals_env['bg_color'] = lua_bg_color
            globals_env['bold'] = lua_bold
            globals_env['clear'] = lua_clear
            globals_env['wait'] = lua_wait
            
            lua.execute("io = io or {}; io.read = function() return '[Очікує вводу...]' end")

            lua.execute(data.code)
            output = "\n".join(lua_logs)
        except Exception as e:
            output = f"Lua error: {str(e)}"

    if not output.strip():
        output = "(Код виконано без виводу)"

    cursor.execute("INSERT INTO posts (username, lang, code, output, has_input) VALUES (?, ?, ?, ?, ?)", 
                   (data.username, data.language, data.code, output, has_input))
    conn.commit()
    return {"status": "ok"}

@app.get("/posts")
def get_posts():
    cursor.execute("SELECT username, lang, code, output, has_input FROM posts ORDER BY id DESC")
    return cursor.fetchall()
