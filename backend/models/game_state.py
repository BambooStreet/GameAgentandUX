# 게임 상태 관리
class GameState:
    def __init__(self):
        self.phase = "waiting"  # waiting, introduction, night, day, voting, gameOver
        self.turn = 0  # 1-3턴
        self.players = []  # 플레이어 목록
        self.roles = {}  # 각 플레이어의 역할
        self.chat_history = []  # 채팅 기록
        self.votes = {}  # 투표 결과
        self.eliminated = []  # 탈락한 플레이어
        self.introduction_complete = False  # 자기소개 완료 여부
        self.game_id = None

# 전역 게임 상태 인스턴스
game_state = GameState()
