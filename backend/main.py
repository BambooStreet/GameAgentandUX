from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json

# 모듈 import
from utils.config import STATIC_FILES_DIR
from api.game_routes import router as game_router
from api.chat_routes import router as chat_router
from api.websocket import manager
from models.game_state import game_state

# FastAPI 앱 생성
app = FastAPI(title="Mafia Game API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 서빙 (기존 프론트엔드)
app.mount("/static", StaticFiles(directory=STATIC_FILES_DIR), name="static")

# 라우터 등록
app.include_router(game_router, prefix="/api")
app.include_router(chat_router, prefix="/api")

# 기본 라우트
@app.get("/")
async def read_index():
    """메인 페이지"""
    return FileResponse(f"{STATIC_FILES_DIR}/index.html")

@app.get("/api/status")
async def get_status():
    """서버 상태 확인"""
    return {
        "status": "running",
        "game_state": game_state.phase,
        "timestamp": datetime.now().isoformat()
    }

# 웹소켓 엔드포인트
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 메시지 처리 및 브로드캐스트
            await manager.broadcast(json.dumps(message))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    from utils.config import HOST, PORT
    uvicorn.run(app, host=HOST, port=PORT)
