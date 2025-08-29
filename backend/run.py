#!/usr/bin/env python3
"""
마피아 게임 백엔드 서버 실행 스크립트
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """파이썬 버전 확인"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 이상이 필요합니다.")
        print(f"현재 버전: {sys.version}")
        return False
    print(f"✅ Python 버전 확인: {sys.version.split()[0]}")
    return True

def check_dependencies():
    """의존성 패키지 확인"""
    try:
        import fastapi
        import uvicorn
        import openai
        import pydantic
        print("✅ 모든 의존성 패키지가 설치되어 있습니다.")
        return True
    except ImportError as e:
        print(f"❌ 의존성 패키지가 설치되지 않았습니다: {e}")
        print("다음 명령어로 설치해주세요:")
        print("pip install -r requirements.txt")
        return False

def check_env_file():
    """환경변수 파일 확인"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env 파일이 없습니다.")
        print("env_example.txt를 복사하여 .env 파일을 생성하고 OpenAI API 키를 설정해주세요.")
        return False
    
    # OpenAI API 키 확인
    with open(env_file, 'r', encoding='utf-8') as f:
        content = f.read()
        if "OPENAI_API_KEY=your_openai_api_key_here" in content:
            print("⚠️  OpenAI API 키가 설정되지 않았습니다.")
            print(".env 파일에서 OPENAI_API_KEY를 설정해주세요.")
            return False
    
    print("✅ 환경변수 파일이 올바르게 설정되어 있습니다.")
    return True

def main():
    """메인 실행 함수"""
    print("🎮 마피아 게임 백엔드 서버 시작")
    print("=" * 50)
    
    # 기본 검사
    if not check_python_version():
        sys.exit(1)
    
    if not check_dependencies():
        sys.exit(1)
    
    if not check_env_file():
        print("\n계속 진행하시겠습니까? (y/N): ", end="")
        response = input().strip().lower()
        if response != 'y':
            sys.exit(1)
    
    print("\n🚀 서버를 시작합니다...")
    print("서버 주소: http://localhost:8000")
    print("API 문서: http://localhost:8000/docs")
    print("종료하려면 Ctrl+C를 누르세요.")
    print("=" * 50)
    
    try:
        # uvicorn으로 서버 실행
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n👋 서버가 종료되었습니다.")
    except Exception as e:
        print(f"\n❌ 서버 실행 중 오류가 발생했습니다: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
