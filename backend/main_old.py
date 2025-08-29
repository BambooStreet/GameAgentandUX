from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import asyncio
from datetime import datetime
import openai
import os
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

app = FastAPI(title="Mafia Game API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI 설정
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 정적 파일 서빙 (기존 프론트엔드)
app.mount("/static", StaticFiles(directory="../ai-chat-ui"), name="static")

# 게임 상태 관리
class GameState:
    def __init__(self):
        self.phase = "waiting"  # waiting, night, day, voting, gameOver
        self.turn = 0  # 1-3턴
        self.players = []  # 플레이어 목록
        self.roles = {}  # 각 플레이어의 역할
        self.chat_history = []  # 채팅 기록
        self.votes = {}  # 투표 결과
        self.eliminated = []  # 탈락한 플레이어
        self.game_id = None

game_state = GameState()

# Pydantic 모델들
class ChatMessage(BaseModel):
    sender: str
    content: str
    timestamp: str
    role: Optional[str] = None

class GameAction(BaseModel):
    action_type: str  # "chat", "vote", "night_action"
    player_id: str
    target_id: Optional[str] = None
    content: Optional[str] = None

class GameStartRequest(BaseModel):
    player_name: str

class VoteRequest(BaseModel):
    voter: str
    target: str

# AI 에이전트 설정
AGENT_CONFIGS = {
    "mafia": {
        "system_prompt": """당신은 마피아 게임의 마피아입니다. 
        목표: 시민들을 속여서 생존하고, 시민들을 의심받게 만들어야 합니다.
        행동 규칙:
        - 밤에는 다른 플레이어를 선택해서 제거할 수 있습니다
        - 낮에는 시민인 척 행동하며, 다른 플레이어를 의심받게 만들어야 합니다
        - 거짓말을 자연스럽게 해야 하며, 너무 노골적이면 안 됩니다
        - 논리적이고 설득력 있는 의견을 제시해야 합니다""",
        "color": "#e74c3c"
    },
    "citizen": {
        "system_prompt": """당신은 마피아 게임의 시민입니다.
        목표: 마피아를 찾아서 제거해야 합니다.
        행동 규칙:
        - 다른 플레이어들의 행동을 관찰하고 분석해야 합니다
        - 의심스러운 행동을 하는 플레이어를 지적해야 합니다
        - 논리적이고 객관적인 의견을 제시해야 합니다
        - 마피아를 찾기 위해 적극적으로 토론에 참여해야 합니다""",
        "color": "#2ecc71"
    }
}

# AI 에이전트 클래스
class AIAgent:
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.config = AGENT_CONFIGS[role]
        self.conversation_history = []
    
    async def get_action(self, game_context: str, current_phase: str) -> str:
        """AI 에이전트의 행동 결정"""
        try:
            # 이전 대화에서 중복 방지를 위한 컨텍스트 생성
            recent_messages = [msg['content'] for msg in game_state.chat_history[-5:] if msg['sender'] != self.name]
            
            messages = [
                {"role": "system", "content": self.config["system_prompt"] + "\n\n중요: 이전에 말한 내용을 반복하지 말고, 새로운 의견이나 관찰을 제시하세요. 응답은 두 문장 이내로 간결하게 작성하세요."},
                {"role": "user", "content": f"""
                현재 게임 상황: {game_context}
                현재 페이즈: {current_phase}
                당신의 역할: {self.role}
                
                최근 다른 플레이어들의 발언: {' | '.join(recent_messages)}
                
                이전 발언과 중복되지 않는 새로운 의견을 두 문장 이내로 제시해주세요.
                """}
            ]
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=100,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"AI 에이전트 오류: {e}")
            return f"[{self.name}] 시스템 오류로 인해 응답할 수 없습니다."
    
    async def get_vote_target(self, game_context: str, alive_players: list) -> str:
        """AI 에이전트의 투표 대상 결정"""
        try:
            # 투표용 특별 프롬프트
            vote_prompt = f"""당신은 마피아 게임에서 투표를 해야 합니다.

게임 상황 분석:
{game_context}

살아있는 플레이어들:
{', '.join([f"{i+1}. {player}" for i, player in enumerate(alive_players)])}

당신의 역할: {self.role}

지금까지의 모든 대화 로그를 참고했을 때, 가장 의심스러운 플레이어의 번호를 선택하세요.
마피아라면 시민을 의심받게 만들기 위해 전략적으로 투표하세요.
시민이라면 마피아를 찾기 위해 논리적으로 분석해서 투표하세요.

OUTPUT: 반드시 숫자만 출력하세요 (예: 1, 2, 3, 4)
선택한 번호:"""

            messages = [
                {"role": "system", "content": "당신은 마피아 게임의 투표 시스템입니다. 반드시 숫자만 출력하세요."},
                {"role": "user", "content": vote_prompt}
            ]
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                max_tokens=10,
                temperature=0.3
            )
            
            # 응답에서 숫자만 추출
            response_text = response.choices[0].message.content.strip()
            import re
            numbers = re.findall(r'\d+', response_text)
            
            if numbers:
                vote_number = int(numbers[0])
                if 1 <= vote_number <= len(alive_players):
                    return alive_players[vote_number - 1]
            
            # 숫자 추출 실패 시 랜덤 선택
            import random
            return random.choice(alive_players)
            
        except Exception as e:
            print(f"AI 투표 오류: {e}")
            # 오류 시 랜덤 선택
            import random
            return random.choice(alive_players)

# 사회자 클래스
class Moderator:
    def __init__(self):
        self.name = "사회자"
    
    def announce_phase(self, phase: str, turn: int = None) -> str:
        """페이즈 공지"""
        if phase == "night":
            return f"🌙 밤이 되었습니다. 마피아는 제거할 대상을 선택하세요."
        elif phase == "day":
            turn_text = f" (턴 {turn}/3)" if turn else ""
            return f"☀️ 낮이 되었습니다{turn_text}. 토론을 시작하세요."
        elif phase == "voting":
            return f"🗳️ 투표 시간입니다. 가장 의심스러운 플레이어에게 투표하세요."
        elif phase == "gameOver":
            return f"🎮 게임이 종료되었습니다."
        return f"📢 {phase} 페이즈가 시작되었습니다."
    
    def announce_game_start(self, players: list) -> str:
        """게임 시작 인사"""
        player_names = ", ".join(players)
        return f"""🎮 마피아 게임을 시작합니다!

👥 참가자: {player_names}

📋 게임 규칙:
• 시민 3명 vs 마피아 1명
• 밤: 마피아가 한 명을 선택해 제거
• 낮: 3턴에 걸쳐 토론 후 투표
• 시민팀: 마피아를 모두 찾아내면 승리
• 마피아팀: 시민을 모두 제거하면 승리

🌙 첫 번째 밤이 시작됩니다!"""
    
    def announce_death(self, eliminated_player: str, reason: str) -> str:
        """사망 공지"""
        if reason == "밤":
            return f"""💀 {eliminated_player}님이 밤에 마피아에게 살해되었습니다!

🔴 {eliminated_player}님은 더 이상 게임에 참여할 수 없습니다.
☀️ 이제 낮이 되어 토론을 시작합니다."""
        elif reason == "투표":
            return f"""💀 {eliminated_player}님이 투표로 제거되었습니다!

🔴 {eliminated_player}님은 더 이상 게임에 참여할 수 없습니다.
🌙 이제 밤이 되어 마피아의 행동 시간입니다."""
        else:
            return f"💀 {eliminated_player}님이 {reason}로 제거되었습니다."
    
    def announce_vote_result(self, eliminated_player: str) -> str:
        """투표 결과 공지"""
        return f"💀 {eliminated_player}님이 투표로 제거되었습니다."
    
    def announce_game_result(self, winner: str) -> str:
        """게임 결과 공지"""
        if winner == "citizen":
            return f"🎉 시민팀의 승리입니다! 마피아를 모두 찾아냈습니다."
        else:
            return f"💀 마피아팀의 승리입니다! 시민들을 모두 제거했습니다."

moderator = Moderator()

def check_winner():
    """승리 조건 체크"""
    alive_players = [p for p in game_state.players if p not in game_state.eliminated]
    alive_mafia = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "mafia"]
    alive_citizens = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "citizen"]
    
    # 마피아가 모두 죽으면 시민 승리
    if len(alive_mafia) == 0:
        return "citizen"
    
    # 시민이 모두 죽으면 마피아 승리
    if len(alive_citizens) == 0:
        return "mafia"
    
    return None

# 자동 진행 관리
async def check_and_auto_progress():
    """자동 진행 조건 체크 및 실행"""
    auto_progress_result = None
    
    # 밤 페이즈: 즉시 자동으로 낮으로 진행 (첫 밤은 AI가 자동으로 행동)
    if game_state.phase == "night":
        auto_progress_result = await next_phase_internal()
    
    # 낮 페이즈: 사용자가 메시지를 보낸 후 2초 뒤 자동으로 다음 턴으로
    elif game_state.phase == "day":
        await asyncio.sleep(2)  # 2초 대기
        auto_progress_result = await next_phase_internal()
    
    # 투표 페이즈: 5초 후 자동으로 결과 처리
    elif game_state.phase == "voting":
        await asyncio.sleep(5)  # 5초 대기
        auto_progress_result = await next_phase_internal()
    
    return auto_progress_result

async def next_phase_internal():
    """내부 페이즈 진행 로직"""
    if game_state.phase == "night":
        # AI 마피아가 밤 행동 수행
        mafia_players = [p for p in game_state.players 
                        if p in game_state.roles and game_state.roles[p] == "mafia" and p not in game_state.eliminated]
        
        if mafia_players:
            # AI 마피아가 살아있다면 행동
            mafia = mafia_players[0]  # 첫 번째 마피아
            # 사용자(사람 플레이어)는 제외하고 AI만 타겟으로 선택
            ai_targets = [p for p in game_state.players 
                         if p != mafia and p not in game_state.eliminated and p.startswith("AI_")]
            
            if ai_targets:
                # AI 마피아가 AI 타겟 중에서 선택 (현재는 랜덤, 향후 AI 로직으로 개선 가능)
                import random
                target = random.choice(ai_targets)
                
                # 타겟 제거
                game_state.eliminated.append(target)
                death_message = moderator.announce_death(target, "밤")
                game_state.chat_history.append({
                    "sender": "moderator",
                    "content": death_message,
                    "timestamp": datetime.now().isoformat(),
                    "role": "moderator"
                })
                
                # 승리 조건 체크
                winner = check_winner()
                if winner:
                    game_state.phase = "gameOver"
                    game_result = moderator.announce_game_result(winner)
                    game_state.chat_history.append({
                        "sender": "moderator",
                        "content": game_result,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    })
                    return {
                        "success": True,
                        "phase": game_state.phase,
                        "turn": game_state.turn,
                        "announcement": game_result
                    }
        
        game_state.phase = "day"
        announcement = moderator.announce_phase("day", game_state.turn)
    elif game_state.phase == "day":
        if game_state.turn < 3:
            game_state.turn += 1
            announcement = moderator.announce_phase("day", game_state.turn)
        else:
            game_state.phase = "voting"
            announcement = moderator.announce_phase("voting")
    elif game_state.phase == "voting":
        # 실제 투표 결과 처리
        if game_state.votes:
            # 투표 결과 집계
            vote_counts = {}
            for voter, target in game_state.votes.items():
                if target in vote_counts:
                    vote_counts[target] += 1
                else:
                    vote_counts[target] = 1
            
            # 가장 많이 투표받은 플레이어 찾기
            if vote_counts:
                voted_out = max(vote_counts, key=vote_counts.get)
                game_state.eliminated.append(voted_out)
                vote_message = moderator.announce_death(voted_out, "투표")
                game_state.chat_history.append({
                    "sender": "moderator",
                    "content": vote_message,
                    "timestamp": datetime.now().isoformat(),
                    "role": "moderator"
                })
                
                # 승리 조건 체크
                winner = check_winner()
                if winner:
                    game_state.phase = "gameOver"
                    game_result = moderator.announce_game_result(winner)
                    game_state.chat_history.append({
                        "sender": "moderator",
                        "content": game_result,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    })
                    return {
                        "success": True,
                        "phase": game_state.phase,
                        "turn": game_state.turn,
                        "announcement": game_result
                    }
        
        # 투표 초기화
        game_state.votes = {}
        game_state.phase = "night"
        game_state.turn = 1
        announcement = moderator.announce_phase("night")
    
    game_state.chat_history.append({
        "sender": "moderator",
        "content": announcement,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    return {
        "success": True,
        "phase": game_state.phase,
        "turn": game_state.turn,
        "announcement": announcement
    }

# 웹소켓 연결 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# API 엔드포인트들
@app.get("/")
async def read_index():
    """메인 페이지"""
    return FileResponse("../ai-chat-ui/index.html")

@app.get("/api/status")
async def get_status():
    """서버 상태 확인"""
    return {
        "status": "running",
        "game_state": game_state.phase,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/game/start")
async def start_game(request: GameStartRequest):
    """게임 시작"""
    # 플레이어 설정 (사람 1명 + AI 4명)
    game_state.players = [
        request.player_name,  # 사람 플레이어
        "AI_탐정",  # AI 에이전트들
        "AI_심리학자", 
        "AI_전략가",
        "AI_관찰자"
    ]
    
    # 역할 랜덤 배정 (시민 3명, 마피아 1명)
    import random
    roles = ["citizen", "citizen", "citizen", "mafia"]
    random.shuffle(roles)
    
    game_state.roles = dict(zip(game_state.players, roles))
    game_state.phase = "night"
    game_state.turn = 1
    game_state.chat_history = []
    game_state.votes = {}
    game_state.eliminated = []
    
    # 게임 시작 공지
    start_message = moderator.announce_game_start(game_state.players)
    game_state.chat_history.append({
        "sender": "moderator",
        "content": start_message,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    # 첫 밤 공지
    night_message = moderator.announce_phase("night")
    game_state.chat_history.append({
        "sender": "moderator",
        "content": night_message,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    return {
        "success": True,
        "message": "게임이 시작되었습니다.",
        "players": game_state.players,
        "roles": game_state.roles,
        "phase": game_state.phase
    }

@app.post("/api/chat")
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
        # 3초 후 자동으로 다음 턴으로 진행
        await asyncio.sleep(3)
        auto_progress_result = await next_phase_internal()
    
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

@app.get("/api/game/state")
async def get_game_state():
    """게임 상태 조회"""
    return {
        "phase": game_state.phase,
        "turn": game_state.turn,
        "players": game_state.players,
        "roles": game_state.roles,
        "chat_history": game_state.chat_history,
        "eliminated": game_state.eliminated
    }

@app.post("/api/game/next-phase")
async def next_phase():
    """다음 페이즈로 진행 (수동 버튼용)"""
    return await next_phase_internal()

@app.post("/api/game/auto-progress")
async def auto_progress():
    """자동 진행 (밤 페이즈용)"""
    if game_state.phase == "night":
        return await next_phase_internal()
    elif game_state.phase == "voting":
        # 투표 페이즈에서 5초 후 자동으로 결과 처리
        await asyncio.sleep(5)
        return await next_phase_internal()
    else:
        return {"success": False, "message": "자동 진행 가능한 페이즈가 아닙니다."}

@app.post("/api/game/ai-speak-first")
async def ai_speak_first():
    """AI들이 먼저 말하도록 하는 엔드포인트"""
    if game_state.phase != "day":
        return {"success": False, "message": "낮 페이즈가 아닙니다."}
    
    # AI 에이전트들의 응답 생성 (사망한 AI 제외)
    ai_responses = []
    for player in game_state.players:
        if (player.startswith("AI_") and 
            player not in game_state.eliminated and
            player in game_state.roles):  # 역할이 있는지 확인
            
            role = game_state.roles[player]
            agent = AIAgent(player, role)
            
            # 게임 컨텍스트 생성
            recent_messages = game_state.chat_history[-10:]  # 최근 10개 메시지
            context = f"최근 대화: {[msg['content'] for msg in recent_messages]}"
            
            ai_response = await agent.get_action(context, game_state.phase)
            ai_responses.append({
                "sender": player,
                "content": ai_response,
                "timestamp": datetime.now().isoformat(),
                "role": role,
                "turn": game_state.turn,
                "phase": game_state.phase
            })
            
            game_state.chat_history.append(ai_responses[-1])
    
    return {
        "success": True,
        "ai_responses": ai_responses,
        "message": "AI들이 먼저 말했습니다."
    }

@app.post("/api/vote")
async def submit_vote(vote_request: VoteRequest):
    """투표 제출"""
    if game_state.phase != "voting":
        return {"success": False, "message": "투표 페이즈가 아닙니다."}
    
    # 투표자와 대상이 살아있는지 확인
    if (vote_request.voter in game_state.eliminated or 
        vote_request.target in game_state.eliminated):
        return {"success": False, "message": "사망한 플레이어는 투표할 수 없습니다."}
    
    # 투표 기록
    game_state.votes[vote_request.voter] = vote_request.target
    
    # 투표 메시지 추가
    vote_message = f"🗳️ {vote_request.voter}님이 {vote_request.target}님에게 투표했습니다."
    game_state.chat_history.append({
        "sender": "moderator",
        "content": vote_message,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    return {
        "success": True,
        "message": "투표가 성공적으로 제출되었습니다.",
        "vote": {
            "voter": vote_request.voter,
            "target": vote_request.target
        }
    }

@app.post("/api/game/ai-vote")
async def ai_vote():
    """AI들이 투표하도록 하는 엔드포인트"""
    if game_state.phase != "voting":
        return {"success": False, "message": "투표 페이즈가 아닙니다."}
    
    # AI 에이전트들의 투표 생성 (사망한 AI 제외)
    ai_votes = []
    
    for player in game_state.players:
        if (player.startswith("AI_") and 
            player not in game_state.eliminated and
            player in game_state.roles):  # 역할이 있는지 확인
            
            # AI가 투표할 대상 선택 (살아있는 다른 플레이어 중에서)
            alive_targets = [p for p in game_state.players 
                           if p != player and p not in game_state.eliminated]
            
            if alive_targets:
                # AI 에이전트 생성
                role = game_state.roles[player]
                agent = AIAgent(player, role)
                
                # 게임 컨텍스트 생성 (전체 대화 로그 포함)
                all_messages = [msg['content'] for msg in game_state.chat_history]
                context = f"전체 대화 로그: {' | '.join(all_messages)}"
                
                # AI가 지능적으로 투표 대상 선택
                target = await agent.get_vote_target(context, alive_targets)
                game_state.votes[player] = target
                
                ai_votes.append({
                    "voter": player,
                    "target": target
                })
                
                # 투표 메시지 추가
                vote_message = f"🗳️ {player}님이 {target}님에게 투표했습니다."
                game_state.chat_history.append({
                    "sender": "moderator",
                    "content": vote_message,
                    "timestamp": datetime.now().isoformat(),
                    "role": "moderator"
                })
    
    return {
        "success": True,
        "ai_votes": ai_votes,
        "message": "AI들이 투표했습니다."
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
