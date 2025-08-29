import asyncio
from datetime import datetime
from fastapi import APIRouter
from models.pydantic_models import ChatMessage
from models.game_state import game_state
from game.game_logic import next_phase_internal

router = APIRouter()

@router.post("/chat")
async def chat(message: ChatMessage):
    """채팅 메시지 처리"""
    # 사용자 메시지를 먼저 저장
    game_state.chat_history.append({
        "sender": message.sender,
        "content": message.content,
        "timestamp": message.timestamp,
        "role": game_state.roles.get(message.sender, "unknown") if message.sender in game_state.roles else "unknown",
        "turn": game_state.turn,
        "phase": game_state.phase
    })
    
    # 낮 페이즈에서 사용자가 메시지를 보낸 후 자동으로 다음 턴으로 진행
    auto_progress_result = None
    if game_state.phase == "day":
        print(f"DEBUG: 사용자 메시지 수신 - 낮 페이즈 턴 {game_state.turn}")
        # 3초 후 자동으로 다음 턴으로 진행
        await asyncio.sleep(3)
        print(f"DEBUG: 자동 진행 시작")
        auto_progress_result = await next_phase_internal()
        print(f"DEBUG: 자동 진행 완료 - 결과: {auto_progress_result}")
    
    return {
        "success": True,
        "user_message": message,
        "ai_responses": [],  # AI 응답은 ai-speak-first에서만 생성
        "auto_progress": auto_progress_result,
        "game_state": {
            "phase": game_state.phase,
            "turn": game_state.turn
        }
    }
