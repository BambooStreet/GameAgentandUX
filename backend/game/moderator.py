# 사회자 클래스
class Moderator:
    def __init__(self):
        self.name = "사회자"
    
    def announce_phase(self, phase: str, turn: int = None) -> str:
        """페이즈 공지"""
        if phase == "night":
            return f"🌙 밤이 되었습니다. 마피아는 제거할 대상을 선택하세요."
        elif phase == "day":
            if turn and turn > 0:
                return f"🗣️ 토론 턴 {turn}/3입니다. AI 플레이어들이 먼저 의견을 말한 후, 당신의 의견을 말해주세요."
            else:
                return f"☀️ 낮이 되었습니다. 토론을 시작하세요."
        elif phase == "voting":
            return f"🗳️ 투표 시간입니다. 가장 의심스러운 플레이어에게 투표하세요."
        elif phase == "gameOver":
            return f"🎮 게임이 종료되었습니다."
        return f"📢 {phase} 페이즈가 시작되었습니다."
    
    def announce_day_after_death(self) -> str:
        """사망 후 낮 페이즈 공지"""
        return f"☀️ 낮이 되었습니다. 토론을 시작하세요."
    
    def announce_game_start(self, players: list) -> str:
        """게임 시작 인사"""
        return f"마피아 게임에 오신 것을 환영합니다. \n마피아는 밤을 틈타 움직이고, 시민들은 낮을 이용해 진실을 밝혀내야 합니다."
    
    def announce_player_role(self, player_name: str, role: str) -> str:
        """플레이어 역할 안내"""
        if role == "citizen":
            return f"🎭 {player_name}님, 당신은 시민입니다. 마피아를 찾아내세요!"
        else:
            return f"🎭 {player_name}님, 당신은 마피아입니다. 시민들을 속여보세요!"
    
    def announce_introduction_phase(self) -> str:
        """자기소개 페이즈 시작"""
        return f"👋 자기소개 시간입니다. 각자 한마디씩 자기소개를 해주세요."
    
    def announce_night_start(self) -> str:
        """밤 페이즈 시작"""
        return f"🌙 어둠의 밤이 시작됩니다... 모두 눈을 감아주세요..."
    
    def announce_death(self, eliminated_player: str, reason: str) -> str:
        """사망 공지"""
        if reason == "밤":
            return f"""💀 {eliminated_player}님이 밤에 마피아에게 살해되었습니다!

🔴 {eliminated_player}님은 더 이상 게임에 참여할 수 없습니다."""
        elif reason == "투표":
            return f"""💀 {eliminated_player}님이 투표로 제거되었습니다!

🔴 {eliminated_player}님은 더 이상 게임에 참여할 수 없습니다."""
        else:
            return f"💀 {eliminated_player}님이 {reason}로 제거되었습니다."
    
    def announce_vote_result(self, eliminated_player: str) -> str:
        """투표 결과 공지"""
        return f"💀 {eliminated_player}님이 투표로 제거되었습니다."
    
    def announce_game_result(self, winner: str, reason: str = None) -> str:
        """게임 결과 공지"""
        if winner == "citizen":
            if reason == "mafia_eliminated":
                return f"""🎉 시민팀의 승리입니다!

✅ 마피아를 모두 찾아냈습니다!
✅ 시민들의 협력으로 진실을 밝혀냈습니다!
🎮 게임이 종료되었습니다."""
            else:
                return f"""🎉 시민팀의 승리입니다!

✅ 마피아를 모두 찾아냈습니다!
🎮 게임이 종료되었습니다."""
        else:
            if reason == "human_eliminated":
                return f"""💀 마피아팀의 승리입니다!

❌ 마피아 탐지에 실패했습니다!
❌ 시민이 투표로 제거되었습니다!
🎮 게임이 종료되었습니다."""
            elif reason == "citizens_eliminated":
                return f"""💀 마피아팀의 승리입니다!

❌ 모든 시민이 제거되었습니다!
🎮 게임이 종료되었습니다."""
            elif reason == "mafia_majority":
                return f"""💀 마피아팀의 승리입니다!

❌ 마피아가 시민보다 많아졌습니다!
❌ 밤에 마피아가 한 명 더 제거할 수 있습니다!
🎮 게임이 종료되었습니다."""
            else:
                return f"""💀 마피아팀의 승리입니다!

❌ 시민들을 모두 제거했습니다!
🎮 게임이 종료되었습니다."""
    
    def announce_human_elimination(self, human_player: str) -> str:
        """사람 플레이어 제거 시 특별 메시지"""
        return f"""💀 {human_player}님이 투표로 제거되었습니다!

❌ 마피아 탐지에 실패했습니다!
❌ 시민이 투표로 제거되어 마피아팀의 승리입니다!
🎮 게임이 종료되었습니다."""

# 전역 사회자 인스턴스
moderator = Moderator()
