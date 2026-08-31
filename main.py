from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import io
from lualib import LuaRuntime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

posts_db = []

class PostCreate(BaseModel):
    username: str
    code: str
    lang: str
    user_inputs: list[str] = []  # Масив введених користувачем даних

class RunRequest(BaseModel):
    code: str
    lang: str
    user_inputs: list[str] = []

def execute_python_code(code: str, inputs: list[str]) -> str:
    input_index = 0

    def custom_input(prompt=""):
        nonlocal input_index
        if prompt:
            print(prompt, end="")
        if input_index < len(inputs):
            val = inputs[input_index]
            input_index += 1
            print(val) # Виводимо введене значення в консоль для наочності
            return val
        return '[Очікує вводу...]'

    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()

    # Перехоплюємо стандартний input
    safe_globals = {
        "__builtins__": __builtins__,
        "input": custom_input
    }

    try:
        exec(code, safe_globals)
        output = redirected_output.getvalue()
    except Exception as e:
        output = f"Помилка виконання Python: {e}"
    finally:
        sys.stdout = old_stdout

    return output

def execute_lua_code(code: str, inputs: list[str]) -> str:
    lua = LuaRuntime(unpack_returned_tuples=True)
    logs = []
    input_index = 0

    def lua_print(*args):
        logs.append(" ".join(str(a) for a in args))

    def lua_read():
        nonlocal input_index
        if input_index < len(inputs):
            val = inputs[input_index]
            input_index += 1
            logs.append(val)
            return val
        return '[Очікує вводу...]'

    lua.globals()['print'] = lua_print
    lua.globals()['io'] = lua.table(read=lua_read)

    try:
        lua.execute(code)
        return "\n".join(logs)
    except Exception as e:
        return f"Помилка виконання Lua: {e}"

@app.post("/posts")
def create_post(post: PostCreate):
    if post.lang == "python":
        output = execute_python_code(post.code, post.user_inputs)
    elif post.lang == "lua":
        output = execute_lua_code(post.code, post.user_inputs)
    else:
        output = "Непідтримувана мова"

    new_post = {
        "id": len(posts_db) + 1,
        "username": post.username,
        "code": post.code,
        "lang": post.lang,
        "output": output,
        "user_inputs": post.user_inputs
    }
    posts_db.insert(0, new_post)
    return new_post

@app.get("/posts")
def get_posts():
    return posts_db

@app.post("/run")
def run_code(req: RunRequest):
    if req.lang == "python":
        output = execute_python_code(req.code, req.user_inputs)
    elif req.lang == "lua":
        output = execute_lua_code(req.code, req.user_inputs)
    else:
        output = "Непідтримувана мова"
    return {"output": output}
