from models.game_state import game_state

def check_winner():
    """승리 조건 체크"""
    alive_players = [p for p in game_state.players if p not in game_state.eliminated]
    alive_mafia = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "mafia"]
    alive_citizens = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "citizen"]
    
    print(f"DEBUG: 승리 조건 체크 - 살아있는 플레이어: {alive_players}")
    print(f"DEBUG: 살아있는 마피아: {alive_mafia}")
    print(f"DEBUG: 살아있는 시민: {alive_citizens}")
    
    # 마피아가 모두 죽으면 시민 승리
    if len(alive_mafia) == 0:
        return "citizen"
    
    # 시민이 모두 죽으면 마피아 승리
    if len(alive_citizens) == 0:
        return "mafia"
    
    # 마피아와 시민 수가 같으면 마피아 승리 (밤에 마피아가 한 명 더 제거할 수 있음)
    if len(alive_mafia) >= len(alive_citizens):
        return "mafia"
    
    return None

def check_game_end_conditions():
    """게임 종료 조건 체크 (상세한 정보 포함)"""
    alive_players = [p for p in game_state.players if p not in game_state.eliminated]
    alive_mafia = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "mafia"]
    alive_citizens = [p for p in alive_players if p in game_state.roles and game_state.roles[p] == "citizen"]
    
    # 사람 플레이어가 죽었는지 확인
    human_players = [p for p in game_state.players if not p.startswith("플레이어")]
    dead_humans = [p for p in human_players if p in game_state.eliminated]
    
    result = {
        "game_ended": False,
        "winner": None,
        "reason": None,
        "details": {
            "alive_players": alive_players,
            "alive_mafia": alive_mafia,
            "alive_citizens": alive_citizens,
            "dead_humans": dead_humans
        }
    }
    
    # 사람 플레이어가 죽은 경우
    if dead_humans:
        result["game_ended"] = True
        result["winner"] = "mafia"
        result["reason"] = "human_eliminated"
        return result
    
    # 마피아가 모두 죽은 경우
    if len(alive_mafia) == 0:
        result["game_ended"] = True
        result["winner"] = "citizen"
        result["reason"] = "mafia_eliminated"
        return result
    
    # 시민이 모두 죽은 경우
    if len(alive_citizens) == 0:
        result["game_ended"] = True
        result["winner"] = "mafia"
        result["reason"] = "citizens_eliminated"
        return result
    
    # 마피아와 시민 수가 같거나 마피아가 더 많은 경우
    if len(alive_mafia) >= len(alive_citizens):
        result["game_ended"] = True
        result["winner"] = "mafia"
        result["reason"] = "mafia_majority"
        return result
    
    return result
