# AI Chat Server

ChatGPT API 기반의 4개 AI 채팅 백엔드 서버

## 설정 방법

### 1. 의존성 설치
```bash
cd ai/server
npm install
```

### 2. 환경변수 설정
`.env.example` 파일을 `.env`로 복사하고 OpenAI API 키를 설정하세요:

```bash
cp .env.example .env
```

`.env` 파일에서 다음 설정을 수정하세요:
```
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. 서버 실행
```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

서버는 http://localhost:3001 에서 실행됩니다.

## API 엔드포인트

### POST `/api/chat`
단일 AI와 채팅
```json
{
  "message": "안녕하세요",
  "aiId": "ai1"
}
```

### POST `/api/chat/multiple`
모든 AI와 동시 채팅
```json
{
  "message": "안녕하세요",
  "aiIds": ["ai1", "ai2", "ai3", "ai4"]
}
```

### GET `/api/status`
서버 상태 확인

### POST `/api/clear-history`
대화 기록 초기화

## AI 성격 설정

각 AI는 고유한 성격을 가집니다:

- **AI1**: 분석적, 데이터 중심
- **AI2**: 도움이 되는, 지지적
- **AI3**: 창의적, 혁신적
- **AI4**: 기술적, 구현 중심

## UI와 연동

프론트엔드 UI는 자동으로 서버 연결을 시도합니다:
- 연결 성공: 실제 ChatGPT API 응답
- 연결 실패: 오프라인 모드로 전환

## 문제 해결

1. **API 키 오류**: `.env` 파일에 올바른 OpenAI API 키가 설정되어 있는지 확인
2. **포트 충돌**: `PORT=3001`을 다른 포트로 변경
3. **CORS 오류**: 프론트엔드가 다른 도메인에서 실행되는 경우 CORS 설정 확인