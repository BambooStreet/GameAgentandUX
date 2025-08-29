import asyncio
import random
from datetime import datetime
from models.game_state import game_state
from game.moderator import moderator
from game.winner_check import check_winner, check_game_end_conditions
from agents.ai_agent import AIAgent

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
    print(f"DEBUG: next_phase_internal 호출됨 - 현재 페이즈: {game_state.phase}")
    
    if game_state.phase == "night":
        # AI 마피아가 밤 행동 수행
        mafia_players = [p for p in game_state.players 
                        if p in game_state.roles and game_state.roles[p] == "mafia" and p not in game_state.eliminated]
        
        print(f"DEBUG: 현재 플레이어들: {game_state.players}")
        print(f"DEBUG: 현재 역할들: {game_state.roles}")
        print(f"DEBUG: 마피아 플레이어들: {mafia_players}")
        print(f"DEBUG: 제거된 플레이어들: {game_state.eliminated}")
        
        if mafia_players:
            # AI 마피아가 살아있다면 행동
            mafia = mafia_players[0]  # 첫 번째 마피아
            print(f"DEBUG: 마피아 플레이어 발견: {mafia}")
            
            # AI 마피아 에이전트 생성
            agent = AIAgent(mafia, "mafia")
            
            # 살아있는 AI 플레이어들만 타겟으로 선택 (마피아 자신과 사람 플레이어 제외)
            alive_targets = [p for p in game_state.players 
                           if p != mafia and p not in game_state.eliminated and p.startswith("플레이어")]
            
            print(f"DEBUG: 살아있는 AI 타겟들: {alive_targets}")
            
            if alive_targets:
                # AI 마피아가 지능적으로 타겟 선택
                target = await agent.get_night_action(alive_targets)
                
                print(f"DEBUG: 마피아 {mafia}가 {target}를 선택했습니다.")
                
                if target:
                    # 타겟 제거
                    game_state.eliminated.append(target)
                    
                    # 사망 메시지 추가
                    death_message = moderator.announce_death(target, "밤")
                    death_msg_obj = {
                        "sender": "moderator",
                        "content": death_message,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    }
                    game_state.chat_history.append(death_msg_obj)
                    
                    print(f"DEBUG: 사망 메시지 추가됨 - {death_message}")
                    print(f"DEBUG: 사망 메시지 객체 - {death_msg_obj}")
                    print(f"DEBUG: 현재 채팅 히스토리 길이 - {len(game_state.chat_history)}")
                    print(f"DEBUG: 사망 메시지가 채팅 히스토리에 추가됨: {game_state.chat_history[-1]}")
                    
                    # 사망 메시지가 확실히 표시되도록 강제로 한 번 더 추가 (중복 방지)
                    if len(game_state.chat_history) > 1:
                        last_msg = game_state.chat_history[-1]
                        if last_msg.get('content') == death_message:
                            print(f"DEBUG: 사망 메시지가 성공적으로 추가됨")
                        else:
                            print(f"DEBUG: 사망 메시지 추가 실패 - 마지막 메시지: {last_msg}")
                    else:
                        print(f"DEBUG: 첫 번째 사망 메시지 추가됨")
                    
                    # 게임 종료 조건 체크
                    game_end_result = check_game_end_conditions()
                    if game_end_result["game_ended"]:
                        game_state.phase = "gameOver"
                        game_result = moderator.announce_game_result(game_end_result["winner"], game_end_result["reason"])
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
                    
                    # 사망 후 낮 페이즈 설명 추가 (1초 지연)
                    await asyncio.sleep(1)
                    day_after_death_message = moderator.announce_day_after_death()
                    game_state.chat_history.append({
                        "sender": "moderator",
                        "content": day_after_death_message,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    })
                

        
        # 밤에서 낮으로 전환 (AI 마피아가 행동하지 않았어도)
        game_state.phase = "day"
        # 1초 지연 후 낮 페이즈 공지
        await asyncio.sleep(1)
        day_announcement = moderator.announce_phase("day", game_state.turn)
        game_state.chat_history.append({
            "sender": "moderator",
            "content": day_announcement,
            "timestamp": datetime.now().isoformat(),
            "role": "moderator"
        })
        announcement = day_announcement
    elif game_state.phase == "day":
        print(f"DEBUG: 낮 페이즈 처리 - 현재 턴: {game_state.turn}")
        
        if game_state.turn < 3:
            game_state.turn += 1
            print(f"DEBUG: 턴 증가 - 새로운 턴: {game_state.turn}")
            
            # 1초 지연 후 턴 공지
            await asyncio.sleep(1)
            day_announcement = moderator.announce_phase("day", game_state.turn)
            game_state.chat_history.append({
                "sender": "moderator",
                "content": day_announcement,
                "timestamp": datetime.now().isoformat(),
                "role": "moderator"
            })
            announcement = day_announcement
            print(f"DEBUG: 턴 {game_state.turn} 공지 추가됨")
        else:
            print(f"DEBUG: 3턴 완료 - 투표 페이즈로 전환")
            game_state.phase = "voting"
            # 1초 지연 후 투표 페이즈 공지
            await asyncio.sleep(1)
            voting_announcement = moderator.announce_phase("voting")
            game_state.chat_history.append({
                "sender": "moderator",
                "content": voting_announcement,
                "timestamp": datetime.now().isoformat(),
                "role": "moderator"
            })
            announcement = voting_announcement
            print(f"DEBUG: 투표 페이즈 공지 추가됨")
    elif game_state.phase == "voting":
        print(f"DEBUG: 투표 페이즈 처리 - 현재 투표 수: {len(game_state.votes)}")
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
                
                # 사람 플레이어가 죽었는지 확인
                human_players = [p for p in game_state.players if not p.startswith("플레이어")]
                if voted_out in human_players:
                    # 사람 플레이어가 죽은 경우 특별 메시지
                    vote_message = moderator.announce_human_elimination(voted_out)
                    game_state.chat_history.append({
                        "sender": "moderator",
                        "content": vote_message,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    })
                    
                    # 게임 종료
                    game_state.phase = "gameOver"
                    return {
                        "success": True,
                        "phase": game_state.phase,
                        "turn": game_state.turn,
                        "announcement": vote_message
                    }
                else:
                    # AI 플레이어가 죽은 경우 일반 메시지
                    vote_message = moderator.announce_death(voted_out, "투표")
                    vote_msg_obj = {
                        "sender": "moderator",
                        "content": vote_message,
                        "timestamp": datetime.now().isoformat(),
                        "role": "moderator"
                    }
                    game_state.chat_history.append(vote_msg_obj)
                    
                    print(f"DEBUG: 투표 사망 메시지 추가됨 - {vote_message}")
                    print(f"DEBUG: 투표 사망 메시지 객체 - {vote_msg_obj}")
                    print(f"DEBUG: 현재 채팅 히스토리 길이 - {len(game_state.chat_history)}")
                    print(f"DEBUG: 투표 사망 메시지가 채팅 히스토리에 추가됨: {game_state.chat_history[-1]}")
                
                # 게임 종료 조건 체크
                game_end_result = check_game_end_conditions()
                if game_end_result["game_ended"]:
                    game_state.phase = "gameOver"
                    game_result = moderator.announce_game_result(game_end_result["winner"], game_end_result["reason"])
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
        
        # 투표에서 밤으로 전환
        print(f"DEBUG: 투표 완료 - 밤 페이즈로 전환")
        game_state.votes = {}
        game_state.phase = "night"
        game_state.turn = 1
        # 1초 지연 후 밤 페이즈 공지
        await asyncio.sleep(2)
        night_announcement = moderator.announce_phase("night")
        game_state.chat_history.append({
            "sender": "moderator",
            "content": night_announcement,
            "timestamp": datetime.now().isoformat(),
            "role": "moderator"
        })
        announcement = night_announcement
    
    return {
        "success": True,
        "phase": game_state.phase,
        "turn": game_state.turn,
        "announcement": announcement
    }
