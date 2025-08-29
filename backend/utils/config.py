import os
from dotenv import load_dotenv

# 환경변수 로드
load_dotenv()

# OpenAI 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# AI 모델 설정
# 사용 가능한 모델: "gpt-4o-mini", "gpt-5-mini"
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

# 모델별 가격 정보 (1000 토큰당 USD)
MODEL_PRICING = {
    "gpt-4o-mini": {
        "input": 0.00015,   # $0.00015 per 1K input tokens
        "output": 0.0006    # $0.0006 per 1K output tokens
    },
    "gpt-5o-mini": {
        "input": 0.00015,   # $0.00015 per 1K input tokens
        "output": 0.0006    # $0.0006 per 1K output tokens
    }
}

# 서버 설정
HOST = "0.0.0.0"
PORT = 8000

# 정적 파일 경로
STATIC_FILES_DIR = "../ai-chat-ui"
