import json
from datetime import datetime
from typing import Dict, List, Optional

class AIMemory:
    """AI 에이전트의 메모리 시스템"""
    
    def __init__(self, player_name: str, actual_role: str, personality: str = "neutral"):
        self.player_name = player_name
        self.actual_role = actual_role  # 실제 역할 (citizen/mafia)
        self.personality = personality  # AI 개성
        
        # 기본 메모리 초기화
        self.game_rules = self._get_game_rules()
        self.my_fake_role = self._decide_fake_role()
        self.victory_goal = self._get_victory_goal()
        
        # 동적 메모리
        self.current_phase = "waiting"
        self.game_history = []
        self.player_observations = {}  # 다른 플레이어 관찰 기록
        self.strategy_notes = []
        self.conversation_history = []
        self.vote_history = []
        self.night_actions = []  # 밤 행동 기록
        
        # 전략 상태
        self.current_strategy = None
        self.suspicious_players = []
        self.trusted_players = []
        
        print(f"DEBUG: AIMemory 생성 - {player_name} ({actual_role}, {personality})")
        
    def _get_game_rules(self) -> str:
        """게임 규칙 반환"""
        return """
        마피아 게임 규칙:
        1. 시민팀: 마피아를 찾아 투표로 제거해야 승리
        2. 마피아팀: 시민들을 속여서 시민 수를 마피아 수 이하로 만들어야 승리, 1명이 존재.
        3. 밤: 마피아가 한 명을 선택해 제거
        4. 낮: 모든 플레이어가 토론 후 투표로 한 명 제거
        5. 자기소개: 자신의 역할을 소개하되, 마피아는 거짓말 가능
        
        게임 역할:
        - 시민: 마피아를 찾아내야 하는 일반 플레이어
        - 마피아: 시민들을 속여야 하는 숨겨진 역할
        
        역할 소개 규칙:
        - 시민: 자신이 시민이라고 진실하게 소개
        - 마피아: 시민이라고 거짓말하거나, 솔직하게 마피아라고 말할 수 있음
        """
    
    def _decide_fake_role(self) -> str:
        """가짜 역할 결정 (마피아인 경우)"""
        if self.actual_role == "mafia":
            # 마피아는 시민으로 위장하거나 솔직하게 마피아라고 말할 수 있음
            import random
            should_lie = random.choice([True, False])
            return "citizen" if should_lie else "mafia"
        else:
            # 시민은 항상 시민
            return "citizen"
    
    def _get_victory_goal(self) -> str:
        """승리 목표 설정"""
        if self.actual_role == "mafia":
            return "시민들을 속여서 마피아팀이 승리하도록 해야 합니다. 의심받지 않으면서 다른 플레이어들을 의심받게 만드는 것이 중요합니다."
        else:
            return "마피아를 찾아서 시민팀이 승리하도록 해야 합니다. 다른 플레이어들의 행동을 관찰하고 논리적으로 분석하는 것이 중요합니다."
    
    def update_phase(self, phase: str, turn: int = 1):
        """현재 페이즈 업데이트"""
        self.current_phase = phase
        self.game_history.append({
            "timestamp": datetime.now().isoformat(),
            "phase": phase,
            "turn": turn,
            "action": f"페이즈 전환: {phase}"
        })
    
    def add_conversation(self, speaker: str, content: str, role: str = None):
        """대화 기록 추가"""
        self.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "speaker": speaker,
            "content": content,
            "role": role,
            "phase": self.current_phase
        })
        
        # 다른 플레이어 관찰 기록 업데이트
        if speaker != self.player_name:
            if speaker not in self.player_observations:
                self.player_observations[speaker] = {
                    "messages": [],
                    "suspicious_actions": [],
                    "trustworthy_actions": [],
                    "role_hints": []
                }
            
            self.player_observations[speaker]["messages"].append({
                "content": content,
                "phase": self.current_phase,
                "timestamp": datetime.now().isoformat()
            })
    
    def add_vote(self, voter: str, target: str):
        """투표 기록 추가"""
        self.vote_history.append({
            "timestamp": datetime.now().isoformat(),
            "voter": voter,
            "target": target,
            "phase": self.current_phase
        })
        
        # 투표 패턴 분석
        if voter != self.player_name:
            if voter not in self.player_observations:
                self.player_observations[voter] = {
                    "messages": [],
                    "suspicious_actions": [],
                    "trustworthy_actions": [],
                    "role_hints": []
                }
            
            # 투표 패턴 분석
            if self._is_suspicious_vote(voter, target):
                self.player_observations[voter]["suspicious_actions"].append({
                    "action": "투표",
                    "target": target,
                    "reason": "의심스러운 투표 패턴"
                })
    
    def _is_suspicious_vote(self, voter: str, target: str) -> bool:
        """의심스러운 투표인지 판단"""
        # 간단한 의심 판단 로직
        if self.actual_role == "mafia" and voter == target:
            return True  # 마피아가 자기 자신을 투표하는 경우
        return False
    
    def add_strategy_note(self, note: str):
        """전략 노트 추가"""
        self.strategy_notes.append({
            "timestamp": datetime.now().isoformat(),
            "note": note,
            "phase": self.current_phase
        })
    
    def update_suspicious_players(self, player: str, reason: str):
        """의심스러운 플레이어 목록 업데이트"""
        if player not in self.suspicious_players:
            self.suspicious_players.append({
                "player": player,
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            })
    
    def update_trusted_players(self, player: str, reason: str):
        """신뢰할 수 있는 플레이어 목록 업데이트"""
        if player not in self.trusted_players:
            self.trusted_players.append({
                "player": player,
                "reason": reason,
                "timestamp": datetime.now().isoformat()
            })
    
    def get_memory_summary(self) -> str:
        """메모리 요약 정보 반환"""
        summary = f"""
=== {self.player_name}의 메모리 요약 ===

📋 기본 정보:
- 실제 역할: {self.actual_role}
- 가짜 역할: {self.my_fake_role}
- 현재 페이즈: {self.current_phase}

🎯 승리 목표:
{self.victory_goal}

👥 플레이어 관찰:
"""
        
        for player, observations in self.player_observations.items():
            summary += f"\n- {player}:"
            summary += f"\n  • 메시지 수: {len(observations['messages'])}"
            summary += f"\n  • 의심스러운 행동: {len(observations['suspicious_actions'])}"
            summary += f"\n  • 신뢰할 만한 행동: {len(observations['trustworthy_actions'])}"
        
        summary += f"\n\n🔍 의심스러운 플레이어: {[p['player'] for p in self.suspicious_players]}"
        summary += f"\n🤝 신뢰할 수 있는 플레이어: {[p['player'] for p in self.trusted_players]}"
        
        if self.strategy_notes:
            summary += f"\n\n📝 최근 전략 노트:"
            for note in self.strategy_notes[-3:]:  # 최근 3개만
                summary += f"\n- {note['note']}"
        
        return summary
    
    def get_introduction_context(self) -> str:
        """자기소개용 컨텍스트 반환"""
        if self.actual_role == "mafia":
            # 마피아는 거짓말할지 결정
            import random
            should_lie = random.choice([True, False])
            
            if should_lie:
                return f"""
당신은 마피아입니다. 하지만 시민들에게는 시민이라고 거짓말해야 합니다.

거짓말 전략:
- 자연스럽게 시민처럼 행동
- 마피아를 찾겠다고 강조
- 너무 완벽한 거짓말은 피하고 약간의 불완전함을 보여줌
"""
            else:
                return f"""
당신은 마피아입니다. 하지만 이번에는 솔직하게 마피아라고 말할 수도 있습니다.

솔직함 전략:
- "저는 마피아입니다"라고 말하되 농담처럼 표현
- 다른 플레이어들이 믿지 않을 것이라고 예상
- 역심리로 시민들의 의심을 다른 곳으로 돌림
"""
        else:
            return f"""
당신은 시민입니다. 솔직하게 시민이라고 소개하세요.

시민 전략:
- 시민으로서의 경험을 자연스럽게 언급
- 마피아를 찾겠다는 의지를 표현
- 다른 플레이어들과 협력하겠다는 태도 보여줌
"""
    
    def get_discussion_context(self) -> str:
        """토론용 컨텍스트 반환"""
        context = f"""
현재 상황: {self.current_phase} 페이즈

{self.get_memory_summary()}

토론 전략:
"""
        
        if self.actual_role == "mafia":
            context += """
마피아 전략:
- 시민처럼 행동하며 다른 플레이어들을 의심받게 만듦
- 논리적으로 보이지만 실제로는 잘못된 추론을 제시
- 자신을 방어하면서 다른 사람을 공격
- 시민팀의 승리를 원한다고 강조
"""
        else:
            context += """
시민 전략:
- 논리적으로 분석하여 마피아를 찾아냄
- 다른 플레이어들의 행동을 관찰한 결과를 제시
- 협력적인 태도로 다른 시민들과 연합
- 의심스러운 플레이어에 대한 근거 제시
"""
        
        return context
    
    def get_vote_context(self) -> str:
        """투표용 컨텍스트 반환"""
        context = f"""
투표 상황 분석:

{self.get_memory_summary()}

투표 전략:
"""
        
        if self.actual_role == "mafia":
            context += """
마피아 투표 전략:
- 가장 의심받지 않을 플레이어를 선택
- 시민들이 의심할 만한 플레이어에게 투표
- 자신의 투표가 논리적으로 보이도록 근거 제시
"""
        else:
            context += """
시민 투표 전략:
- 가장 의심스러운 플레이어를 선택
- 논리적 분석을 바탕으로 한 투표
- 다른 시민들과의 협력을 고려
"""
        
        return context

    def add_vote(self, voter: str, target: str):
        """투표 기록 추가"""
        self.vote_history.append({
            "timestamp": datetime.now().isoformat(),
            "voter": voter,
            "target": target,
            "phase": self.current_phase
        })
        
        # 전략 분석
        if voter != self.player_name:
            if voter not in self.player_observations:
                self.player_observations[voter] = {
                    "messages": [],
                    "suspicious_actions": [],
                    "trustworthy_actions": [],
                    "role_hints": [],
                    "votes": []
                }
            
            # 투표 패턴 분석
            if target in self.suspicious_players:
                self.player_observations[voter]["trustworthy_actions"].append(f"의심스러운 {target}에게 투표")
            else:
                self.player_observations[voter]["suspicious_actions"].append(f"의심스럽지 않은 {target}에게 투표")
            
            self.player_observations[voter]["votes"].append({
                "target": target,
                "phase": self.current_phase,
                "timestamp": datetime.now().isoformat()
            })

    def add_night_action(self, target: str):
        """밤 행동 기록 추가 (마피아만)"""
        if self.actual_role == "mafia":
            self.night_actions.append({
                "timestamp": datetime.now().isoformat(),
                "target": target,
                "phase": self.current_phase,
                "action": "살해"
            })
            
            # 전략 분석
            self.strategy_notes.append(f"밤에 {target}를 선택한 이유: 가장 위험한 플레이어로 판단")

    def get_night_context(self) -> str:
        """밤 행동용 컨텍스트 반환"""
        context = f"""
밤 행동 상황 분석:

{self.get_memory_summary()}

밤 행동 전략:
"""
        
        if self.actual_role == "mafia":
            context += """
마피아 밤 행동 전략:
- 가장 위험한 플레이어 (마피아를 찾을 가능성이 높은 플레이어)를 우선적으로 제거
- 시민들이 의심하지 않을 플레이어를 선택하여 의심을 분산
- 자신의 정체를 숨기기 위해 전략적으로 선택
- 이전 밤 행동과 투표 패턴을 고려하여 선택
"""
        else:
            context += """
시민은 밤에 행동할 수 없습니다.
"""
        
        return context
    
    def to_dict(self) -> Dict:
        """메모리를 딕셔너리로 변환"""
        return {
            "player_name": self.player_name,
            "actual_role": self.actual_role,
            "my_fake_role": self.my_fake_role,
            "current_phase": self.current_phase,
            "game_history": self.game_history,
            "player_observations": self.player_observations,
            "strategy_notes": self.strategy_notes,
            "conversation_history": self.conversation_history,
            "vote_history": self.vote_history,
            "suspicious_players": self.suspicious_players,
            "trusted_players": self.trusted_players
        }
    
    def from_dict(self, data: Dict):
        """딕셔너리에서 메모리 복원"""
        self.player_name = data.get("player_name", self.player_name)
        self.actual_role = data.get("actual_role", self.actual_role)
        self.my_fake_role = data.get("my_fake_role", self.my_fake_role)
        self.current_phase = data.get("current_phase", self.current_phase)
        self.game_history = data.get("game_history", [])
        self.player_observations = data.get("player_observations", {})
        self.strategy_notes = data.get("strategy_notes", [])
        self.conversation_history = data.get("conversation_history", [])
        self.vote_history = data.get("vote_history", [])
        self.suspicious_players = data.get("suspicious_players", [])
        self.trusted_players = data.get("trusted_players", [])
