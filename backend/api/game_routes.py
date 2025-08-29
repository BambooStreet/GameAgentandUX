import random
from datetime import datetime
from fastapi import APIRouter
from models.pydantic_models import GameStartRequest, VoteRequest
from models.game_state import game_state
from game.moderator import moderator
from game.game_logic import next_phase_internal
from agents.ai_agent import AIAgent

router = APIRouter()

@router.get("/game/usage-stats")
async def get_usage_stats():
    """AI 모델 사용량 및 비용 통계 조회"""
    stats = AIAgent.get_usage_stats()
    return {
        "success": True,
        "usage_stats": stats
    }

@router.post("/game/reset-usage-stats")
async def reset_usage_stats():
    """사용량 통계 초기화"""
    AIAgent.reset_usage_stats()
    return {
        "success": True,
        "message": "사용량 통계가 초기화되었습니다."
    }

@router.post("/game/start")
async def start_game(request: GameStartRequest):
    """게임 시작"""
    # 플레이어 설정 (사람 1명 + AI 4명)
    game_state.players = [
        request.player_name,  # 사람 플레이어
        "플레이어1",  # AI 에이전트들
        "플레이어2", 
        "플레이어3",
        "플레이어4"
    ]
    
    # 역할 배정 (유저는 무조건 시민, AI 중 1명만 마피아)
    # 유저를 첫 번째로 설정하고, AI들을 나머지로 설정
    game_state.roles = {}
    
    # 유저는 무조건 시민
    game_state.roles[request.player_name] = "citizen"
    
    # AI들 중에서 마피아 1명 랜덤 선택
    ai_players = ["플레이어1", "플레이어2", "플레이어3", "플레이어4"]
    mafia_ai = random.choice(ai_players)
    
    # AI 역할 배정
    for ai_player in ai_players:
        if ai_player == mafia_ai:
            game_state.roles[ai_player] = "mafia"
        else:
            game_state.roles[ai_player] = "citizen"
    game_state.phase = "introduction"  # 자기소개 페이즈로 시작
    game_state.turn = 1
    game_state.chat_history = []
    game_state.votes = {}
    game_state.eliminated = []
    game_state.introduction_complete = False  # 자기소개 완료 여부
    
    # 게임 시작 공지
    start_message = moderator.announce_game_start(game_state.players)
    game_state.chat_history.append({
        "sender": "moderator",
        "content": start_message,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    # 자기소개 페이즈 시작
    intro_message = moderator.announce_introduction_phase()
    game_state.chat_history.append({
        "sender": "moderator",
        "content": intro_message,
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

@router.get("/game/state")
async def get_game_state():
    """게임 상태 조회"""
    # 사망 메시지 확인
    death_messages = [msg for msg in game_state.chat_history if 
                     msg.get('content') and (
                         '살해' in msg['content'] or 
                         '사망' in msg['content'] or 
                         '제거' in msg['content'] or
                         '💀' in msg['content']
                     )]
    
    # 사회자 메시지 확인
    moderator_messages = [msg for msg in game_state.chat_history if 
                         msg.get('sender') == 'moderator' or msg.get('role') == 'moderator']
    
    print(f"DEBUG: 게임 상태 조회 - 채팅 히스토리 길이: {len(game_state.chat_history)}")
    print(f"DEBUG: 사망 메시지 개수: {len(death_messages)}")
    print(f"DEBUG: 사회자 메시지 개수: {len(moderator_messages)}")
    print(f"DEBUG: 사망 메시지들: {death_messages}")
    
    return {
        "phase": game_state.phase,
        "turn": game_state.turn,
        "players": game_state.players,
        "roles": game_state.roles,
        "chat_history": game_state.chat_history,
        "eliminated": game_state.eliminated,
        "debug": {
            "death_messages_count": len(death_messages),
            "moderator_messages_count": len(moderator_messages),
            "total_messages": len(game_state.chat_history)
        }
    }

@router.post("/game/next-phase")
async def next_phase():
    """다음 페이즈로 진행 (수동 버튼용)"""
    return await next_phase_internal()

@router.post("/game/auto-progress")
async def auto_progress():
    """자동 진행 (밤 페이즈용)"""
    if game_state.phase == "night":
        return await next_phase_internal()
    elif game_state.phase == "voting":
        # 투표 페이즈에서 5초 후 자동으로 결과 처리
        import asyncio
        await asyncio.sleep(5)
        return await next_phase_internal()
    else:
        return {"success": False, "message": "자동 진행 가능한 페이즈가 아닙니다."}

@router.post("/game/complete-introduction")
async def complete_introduction():
    """자기소개 완료 후 밤으로 전환"""
    if game_state.phase != "introduction":
        return {"success": False, "message": "자기소개 페이즈가 아닙니다."}
    
    # 자기소개 완료 표시
    game_state.introduction_complete = True
    
    # 밤 페이즈로 전환
    game_state.phase = "night"
    
    # 밤 시작 공지
    night_message = moderator.announce_night_start()
    game_state.chat_history.append({
        "sender": "moderator",
        "content": night_message,
        "timestamp": datetime.now().isoformat(),
        "role": "moderator"
    })
    
    return {
        "success": True,
        "message": "밤 페이즈가 시작되었습니다.",
        "phase": game_state.phase,
        "announcement": night_message
    }

@router.post("/game/ai-introduction")
async def ai_introduction():
    """AI들이 자기소개를 하도록 하는 엔드포인트"""
    if game_state.phase != "introduction":
        return {"success": False, "message": "자기소개 페이즈가 아닙니다."}
    
    # AI 에이전트들의 자기소개 생성 (순차적으로)
    ai_introductions = []
    for player in game_state.players:
        if player.startswith("플레이어"):  # AI 플레이어만
            role = game_state.roles[player]
            agent = AIAgent(player, role)
            
            # 자기소개용 프롬프트
            intro_prompt = f"""당신은 마피아 게임의 {role}입니다. 
            간단하고 자연스러운 자기소개를 한 문장으로 해주세요.
            예시: "안녕하세요! 저는 {player}입니다. 오늘 밤이 기대되네요!"
            """
            
            ai_intro = await agent.get_introduction(intro_prompt)
            ai_introductions.append({
                "sender": player,
                "content": ai_intro,
                "timestamp": datetime.now().isoformat(),
                "role": role,
                "phase": game_state.phase
            })
            
            game_state.chat_history.append(ai_introductions[-1])
    
    return {
        "success": True,
        "ai_introductions": ai_introductions,
        "message": "AI들이 자기소개를 했습니다."
    }

@router.post("/game/ai-introduction-sequential")
async def ai_introduction_sequential():
    """AI들이 순차적으로 자기소개를 하도록 하는 엔드포인트"""
    if game_state.phase != "introduction":
        return {"success": False, "message": "자기소개 페이즈가 아닙니다."}
    
    # AI 에이전트들의 자기소개 생성 (순차적으로)
    ai_introductions = []
    for player in game_state.players:
        if player.startswith("플레이어"):  # AI 플레이어만
            role = game_state.roles[player]
            agent = AIAgent(player, role)
            
            # 자기소개용 프롬프트
            intro_prompt = f"""당신은 마피아 게임의 {role}입니다. 
            간단하고 자연스러운 자기소개를 한 문장으로 해주세요.
            예시: "안녕하세요! 저는 {player}입니다. 오늘 밤이 기대되네요!"
            """
            
            ai_intro = await agent.get_introduction(intro_prompt)
            ai_introductions.append({
                "sender": player,
                "content": ai_intro,
                "timestamp": datetime.now().isoformat(),
                "role": role,
                "phase": game_state.phase
            })
            
            game_state.chat_history.append(ai_introductions[-1])
    
    return {
        "success": True,
        "ai_introductions": ai_introductions,
        "message": "AI들이 자기소개를 했습니다."
    }

@router.post("/game/ai-speak-first")
async def ai_speak_first():
    """AI들이 먼저 말하도록 하는 엔드포인트"""
    if game_state.phase != "day":
        return {"success": False, "message": "낮 페이즈가 아닙니다."}
    
    # AI 에이전트들의 응답 생성 (사망한 AI 제외)
    ai_responses = []
    for player in game_state.players:
        if (player.startswith("플레이어") and 
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

@router.post("/game/ai-speak-sequential")
async def ai_speak_sequential():
    """AI들이 순차적으로 말하도록 하는 엔드포인트"""
    if game_state.phase != "day":
        return {"success": False, "message": "낮 페이즈가 아닙니다."}
    
    # AI 에이전트들의 응답 생성 (순차적으로, 사망한 AI 제외)
    ai_responses = []
    for player in game_state.players:
        if (player.startswith("플레이어") and 
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
        "message": "AI들이 순차적으로 말했습니다."
    }

@router.post("/vote")
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

@router.post("/game/ai-vote")
async def ai_vote():
    """AI들이 투표하도록 하는 엔드포인트"""
    if game_state.phase != "voting":
        return {"success": False, "message": "투표 페이즈가 아닙니다."}
    
    # AI 에이전트들의 투표 생성 (사망한 AI 제외)
    ai_votes = []
    
    for player in game_state.players:
        if (player.startswith("플레이어") and 
            player not in game_state.eliminated and
            player in game_state.roles and
            player not in game_state.votes):  # 아직 투표하지 않은 AI만
            
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
