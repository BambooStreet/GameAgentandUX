# 마피아 게임 AI 에이전트

AI 에이전트와 함께하는 마피아 게임입니다. GPT-4o-mini와 GPT-5o-mini 모델을 지원하며, 실시간 토큰 사용량과 비용을 추적할 수 있습니다.

## 🚀 주요 기능

- **AI 에이전트**: 개성과 전략을 가진 AI 플레이어들과 게임
- **실시간 채팅**: 웹소켓을 통한 실시간 게임 진행
- **모델 전환**: GPT-4o-mini와 GPT-5o-mini 모델 간 쉽게 전환
- **가격 추적**: 실시간 토큰 사용량과 비용 모니터링
- **개성 시스템**: 다양한 성격의 AI 에이전트

## 🎮 게임 규칙

1. **밤**: 마피아가 한 명을 선택하여 제거
2. **낮**: 모든 플레이어가 토론하여 의심스러운 사람을 찾음
3. **투표**: 가장 의심스러운 사람에게 투표하여 제거
4. **승리 조건**: 
   - 시민: 마피아를 모두 찾으면 승리
   - 마피아: 시민이 마피아보다 적어지면 승리

## 🛠️ 설치 및 실행

### 백엔드 설정

1. Python 가상환경 생성 및 활성화:
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

2. 의존성 설치:
```bash
pip install -r requirements.txt
```

3. 환경변수 설정:
```bash
# .env 파일 생성
cp env_example.txt .env
```

4. `.env` 파일 편집:
```env
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-4o-mini  # 또는 gpt-5o-mini
```

5. 서버 실행:
```bash
python main.py
```

### 프론트엔드 실행

1. 브라우저에서 `http://localhost:8000` 접속

## 💰 AI 모델 가격 비교

### 현재 지원 모델
- **GPT-4o-mini**: $0.00015/1K 입력 토큰, $0.0006/1K 출력 토큰
- **GPT-5o-mini**: $0.00015/1K 입력 토큰, $0.0006/1K 출력 토큰

### 모델 전환 방법
1. `.env` 파일에서 `AI_MODEL` 값을 변경:
   ```env
   AI_MODEL=gpt-4o-mini  # GPT-4o-mini 사용
   AI_MODEL=gpt-5o-mini  # GPT-5o-mini 사용
   ```

2. 서버 재시작

### 사용량 통계 확인
- 게임 화면에서 "📊 사용량 통계" 버튼 클릭
- 실시간 토큰 사용량과 비용 확인 가능
- "통계 초기화" 버튼으로 사용량 리셋

## 🎭 AI 에이전트 개성

- **공격적 (Aggressive)**: 직설적이고 적극적인 성격
- **방어적 (Defensive)**: 신중하고 보수적인 성격
- **논리적 (Logical)**: 분석적이고 체계적인 성격
- **혼돈적 (Chaotic)**: 예측 불가능한 성격
- **중립적 (Neutral)**: 균형잡힌 성격

## 📁 프로젝트 구조

```
GameAgentandUX/
├── backend/
│   ├── agents/           # AI 에이전트 관련
│   ├── api/             # API 라우트
│   ├── game/            # 게임 로직
│   ├── models/          # 데이터 모델
│   └── utils/           # 유틸리티
├── ai-chat-ui/          # 프론트엔드
│   ├── css/             # 스타일시트
│   ├── js/              # JavaScript 모듈
│   └── index.html       # 메인 페이지
└── README.md
```

## 🔧 API 엔드포인트

- `GET /api/game/state` - 게임 상태 조회
- `POST /api/game/start` - 게임 시작
- `POST /api/game/ai-introduction` - AI 자기소개
- `POST /api/game/ai-speak-first` - AI 먼저 말하기
- `POST /api/vote` - 투표 제출
- `GET /api/game/usage-stats` - 사용량 통계 조회
- `POST /api/game/reset-usage-stats` - 사용량 통계 초기화

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.