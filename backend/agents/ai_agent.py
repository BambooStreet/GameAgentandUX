import os
import re
import random
from datetime import datetime
from agents.agent_configs import AGENT_CONFIGS
from models.game_state import game_state
from agents.ai_memory import AIMemory
from utils.config import AI_MODEL, MODEL_PRICING

import httpx
from openai import AsyncOpenAI  # ✅ 비동기 클라이언트 사용

# --- OpenAI/HTTPX 클라이언트(비동기) 전역 준비 ---------------------------------
API_KEY = os.getenv("OPENAI_API_KEY")
# 표준 프록시 환경변수 사용 (있으면 자동 적용)
_proxy = os.getenv("HTTPS_PROXY") or os.getenv("HTTP_PROXY") or None

# httpx 0.28+ : proxies 인자 대신 transport에서 proxy 지정
_transport = httpx.AsyncHTTPTransport(proxy=_proxy) if _proxy else httpx.AsyncHTTPTransport()
_http_client = httpx.AsyncClient(transport=_transport, timeout=60.0)

# openai>=1.0 API (Responses/Chat Completions 지원)
_openai = AsyncOpenAI(api_key=API_KEY, http_client=_http_client)

# 가격 추적을 위한 전역 변수
_total_tokens_used = {"input": 0, "output": 0}
_total_cost = 0.0
# -----------------------------------------------------------------------------

# AI 개성 프롬프트 정의
PERSONALITY_PROMPTS = {
    "aggressive": "당신은 공격적이고 직설적인 성격입니다. 의심스러운 플레이어를 적극적으로 지적하고, 논리적이지만 때로는 감정적으로 반응합니다. 마피아라면 적극적으로 시민을 의심받게 만들고, 시민이라면 마피아를 찾기 위해 적극적으로 추적합니다.",
    "defensive": "당신은 방어적이고 신중한 성격입니다. 자신을 보호하는 데 집중하며, 다른 사람의 의심을 피하려고 노력합니다. 마피아라면 자신의 정체를 숨기기 위해 매우 신중하게 행동하고, 시민이라면 자신이 의심받지 않도록 조심스럽게 행동합니다.",
    "logical": "당신은 논리적이고 분석적인 성격입니다. 증거를 바탕으로 판단하며, 감정보다는 이성을 중시합니다. 마피아라면 논리적으로 시민을 의심받게 만들고, 시민이라면 체계적으로 마피아를 찾아냅니다.",
    "chaotic": "당신은 예측하기 어려운 성격입니다. 때로는 논리적이지만 때로는 직감에 의존하며, 다른 플레이어들이 당신을 읽기 어렵게 만듭니다. 마피아라면 예측 불가능한 행동으로 시민들을 혼란시키고, 시민이라면 직감적인 판단으로 마피아를 찾습니다.",
    "neutral": "당신은 균형잡힌 성격입니다. 논리와 직감을 적절히 조합하여 행동하며, 상황에 따라 유연하게 대응합니다. 마피아라면 적당히 시민을 의심받게 만들고, 시민이라면 균형잡힌 관점으로 마피아를 찾습니다."
}

# AI 에이전트 클래스
class AIAgent:
    def __init__(self, name: str, role: str, personality: str = None):
        self.name = name
        self.role = role
        self.config = AGENT_CONFIGS[role]
        self.conversation_history = []
        
        # 개성 설정 (개성이 지정되지 않으면 랜덤 선택)
        if personality is None:
            personality = random.choice(list(PERSONALITY_PROMPTS.keys()))
        self.personality = personality
        self.personality_prompt = PERSONALITY_PROMPTS.get(personality, PERSONALITY_PROMPTS["neutral"])
        
        # AI 메모리 시스템 초기화 (개성 포함)
        self.memory = AIMemory(name, role, personality)
        
        print(f"🎭 AI 에이전트 생성 - {name} ({role}, {personality})")
        print(f"   개성 프롬프트: {self.personality_prompt[:100]}...")
        print(f"   사용 모델: {AI_MODEL}")
    
    @staticmethod
    def get_usage_stats():
        """토큰 사용량과 비용 통계 반환"""
        return {
            "total_input_tokens": _total_tokens_used["input"],
            "total_output_tokens": _total_tokens_used["output"],
            "total_cost_usd": round(_total_cost, 6),
            "current_model": AI_MODEL,
            "model_pricing": MODEL_PRICING[AI_MODEL]
        }
    
    @staticmethod
    def reset_usage_stats():
        """사용량 통계 초기화"""
        global _total_tokens_used, _total_cost
        _total_tokens_used = {"input": 0, "output": 0}
        _total_cost = 0.0
        print("📊 사용량 통계가 초기화되었습니다.")
    
    @staticmethod
    def calculate_cost(input_tokens: int, output_tokens: int) -> float:
        """토큰 사용량에 따른 비용 계산"""
        model_pricing = MODEL_PRICING[AI_MODEL]
        input_cost = (input_tokens / 1000) * model_pricing["input"]
        output_cost = (output_tokens / 1000) * model_pricing["output"]
        return input_cost + output_cost
    
    async def get_action(self, game_context: str, current_phase: str) -> str:
        """AI 에이전트의 행동 결정 (비동기)"""
        try:
            # 메모리 업데이트
            self.memory.update_phase(current_phase)
            
            # 최근 대화 기록을 메모리에 추가
            recent_messages = [
                msg["content"]
                for msg in game_state.chat_history[-5:]
                if msg["sender"] != self.name
            ]
            
            # 다른 플레이어들의 발언을 메모리에 기록
            for msg in game_state.chat_history[-5:]:
                if msg["sender"] != self.name:
                    self.memory.add_conversation(msg["sender"], msg["content"], msg.get("role"))

            if not API_KEY or API_KEY == "your_openai_api_key_here":
                return f"[{self.name}] OpenAI API 키가 설정되지 않았습니다."

            # 메모리에서 토론 컨텍스트 가져오기
            memory_context = self.memory.get_discussion_context()

            messages = [
                {
                    "role": "system",
                    "content": f"""당신은 마피아 게임의 플레이어입니다.

{self.personality_prompt}

{memory_context}

토론 규칙:
- 이전에 말한 내용을 반복하지 말고, 새로운 의견이나 관찰을 제시
- 메모리의 관찰 기록을 바탕으로 논리적인 분석 제시
- 자신의 역할에 맞는 전략적 발언
- 응답은 두 문장 이내로 간결하게 작성
- 자신의 개성에 맞는 말투와 행동을 유지
""",
                },
                {
                    "role": "user",
                    "content": (
                        f"현재 게임 상황: {game_context}\n"
                        f"현재 페이즈: {current_phase}\n"
                        f"당신의 역할: {self.role}\n"
                        f"당신의 개성: {self.personality}\n\n"
                        f"최근 다른 플레이어들의 발언: {' | '.join(recent_messages)}\n\n"
                        f"메모리의 정보를 바탕으로 전략적인 의견을 두 문장 이내로 제시해주세요."
                    ),
                },
            ]

            # ✅ 비동기 호출
            resp = await _openai.chat.completions.create(
                model=AI_MODEL,
                messages=messages,
                max_tokens=120,
                temperature=0.7,
            )
            
            response = (resp.choices[0].message.content or "").strip()
            
            # 토큰 사용량 추적
            global _total_tokens_used, _total_cost
            if hasattr(resp, 'usage') and resp.usage:
                input_tokens = resp.usage.prompt_tokens
                output_tokens = resp.usage.completion_tokens
                _total_tokens_used["input"] += input_tokens
                _total_tokens_used["output"] += output_tokens
                cost = self.calculate_cost(input_tokens, output_tokens)
                _total_cost += cost
                print(f"💰 토큰 사용량: 입력 {input_tokens}, 출력 {output_tokens}, 비용 ${cost:.6f}")
            
            # 메모리에 자신의 발언 기록
            self.memory.add_conversation(self.name, response, self.role)
            
            return response

        except Exception as e:
            print(f"AI 에이전트 오류: {e}")
            return f"[{self.name}] 시스템 오류로 인해 응답할 수 없습니다."
    
    async def get_introduction(self, intro_prompt: str) -> str:
        """AI 에이전트의 자기소개 생성 (비동기)"""
        try:
            if not API_KEY or API_KEY == "your_openai_api_key_here":
                return f"[{self.name}] 안녕하세요! 저는 {self.name}입니다."

            # 메모리에서 자기소개 컨텍스트 가져오기
            memory_context = self.memory.get_introduction_context()
            
            messages = [
                {
                    "role": "system",
                    "content": f"""당신은 마피아 게임의 플레이어입니다. 
                    
{self.personality_prompt}

{memory_context}

자기소개 규칙:
- 간단하고 자연스러운 한 문장으로 소개
- 자신의 직업을 언급
- 게임에 대한 기대감이나 의지를 표현
- 너무 길지 않게 간결하게
- 자신이 몇 번째 플레이어인지 언급하지 말고 자신의 역할을 언급
- 자신의 개성에 맞는 말투로 소개
"""
                },
                {
                    "role": "user",
                    "content": intro_prompt
                }
            ]

            # ✅ 비동기 호출
            resp = await _openai.chat.completions.create(
                model=AI_MODEL,
                messages=messages,
                max_tokens=80,
                temperature=0.7,
            )
            
            introduction = (resp.choices[0].message.content or "").strip()
            
            # 토큰 사용량 추적
            global _total_tokens_used, _total_cost
            if hasattr(resp, 'usage') and resp.usage:
                input_tokens = resp.usage.prompt_tokens
                output_tokens = resp.usage.completion_tokens
                _total_tokens_used["input"] += input_tokens
                _total_tokens_used["output"] += output_tokens
                cost = self.calculate_cost(input_tokens, output_tokens)
                _total_cost += cost
                print(f"💰 토큰 사용량: 입력 {input_tokens}, 출력 {output_tokens}, 비용 ${cost:.6f}")
            
            # 메모리에 자기소개 기록
            self.memory.add_conversation(self.name, introduction, self.role)
            
            return introduction

        except Exception as e:
            print(f"AI 자기소개 오류: {e}")
            return f"[{self.name}] 안녕하세요! 저는 {self.name}입니다."

    async def get_vote_target(self, game_context: str, alive_players: list) -> str:
        """AI 에이전트의 투표 대상 결정 (비동기)"""
        try:
            if not API_KEY or API_KEY == "your_openai_api_key_here":
                return random.choice(alive_players)  # 키 없으면 랜덤

            # 메모리에서 투표 컨텍스트 가져오기
            memory_context = self.memory.get_vote_context()

            vote_prompt = f"""당신은 마피아 게임에서 투표를 해야 합니다.

{self.personality_prompt}

{memory_context}

게임 상황 분석:
{game_context}

살아있는 플레이어들:
{', '.join([f"{i+1}. {player}" for i, player in enumerate(alive_players)])}

당신의 역할: {self.role}
당신의 개성: {self.personality}

메모리의 관찰 기록과 전략을 바탕으로 가장 적절한 투표 대상을 선택하세요.
마피아라면 시민을 의심받게 만들기 위해 전략적으로 투표하세요.
시민이라면 마피아를 찾기 위해 논리적으로 분석해서 투표하세요.
당신의 개성에 맞는 투표 전략을 사용하세요.

OUTPUT: 반드시 숫자만 출력하세요 (예: 1, 2, 3, 4)
선택한 번호:"""

            messages = [
                {"role": "system", "content": "당신은 마피아 게임의 투표 시스템입니다. 메모리의 정보를 바탕으로 전략적으로 투표하세요. 반드시 숫자만 출력하세요."},
                {"role": "user", "content": vote_prompt},
            ]

            # ✅ 비동기 호출
            resp = await _openai.chat.completions.create(
                model=AI_MODEL,
                messages=messages,
                max_tokens=10,
                temperature=0.3,
            )

            text = (resp.choices[0].message.content or "").strip()
            
            # 토큰 사용량 추적
            global _total_tokens_used, _total_cost
            if hasattr(resp, 'usage') and resp.usage:
                input_tokens = resp.usage.prompt_tokens
                output_tokens = resp.usage.completion_tokens
                _total_tokens_used["input"] += input_tokens
                _total_tokens_used["output"] += output_tokens
                cost = self.calculate_cost(input_tokens, output_tokens)
                _total_cost += cost
                print(f"💰 토큰 사용량: 입력 {input_tokens}, 출력 {output_tokens}, 비용 ${cost:.6f}")
            
            nums = re.findall(r"\d+", text)
            if nums:
                n = int(nums[0])
                if 1 <= n <= len(alive_players):
                    target = alive_players[n - 1]
                    
                    # 메모리에 투표 기록
                    self.memory.add_vote(self.name, target)
                    
                    return target

            return random.choice(alive_players)

        except Exception as e:
            print(f"AI 투표 오류: {e}")
            return random.choice(alive_players)

    async def get_night_action(self, alive_players: list) -> str:
        """AI 마피아의 밤 행동 결정 (비동기)"""
        try:
            print(f"DEBUG: get_night_action 호출됨 - 플레이어: {self.name}, 역할: {self.role}")
            print(f"DEBUG: 살아있는 플레이어들: {alive_players}")
            
            if self.role != "mafia":
                print(f"DEBUG: 마피아가 아님 - 밤 행동 없음")
                return None  # 마피아가 아니면 밤 행동 없음
                
            if not API_KEY or API_KEY == "your_openai_api_key_here":
                print(f"DEBUG: API 키 없음 - 랜덤 선택")
                return random.choice(alive_players)  # 키 없으면 랜덤

            # 메모리에서 밤 행동 컨텍스트 가져오기
            memory_context = self.memory.get_night_context()

            night_prompt = f"""당신은 마피아 게임의 마피아입니다. 밤에 누군가를 살해해야 합니다.

{self.personality_prompt}

{memory_context}

살아있는 플레이어들 (당신 제외):
{', '.join([f"{i+1}. {player}" for i, player in enumerate(alive_players) if player != self.name])}

게임 상황 분석:
- 지금까지의 대화와 투표 패턴을 분석
- 가장 위험한 플레이어 (마피아를 찾을 가능성이 높은 플레이어)를 우선적으로 제거
- 시민들이 의심하지 않을 플레이어를 선택하여 의심을 분산
- 자신의 정체를 숨기기 위해 전략적으로 선택
- 당신의 개성에 맞는 전략을 사용하세요

OUTPUT: 반드시 숫자만 출력하세요 (예: 1, 2, 3, 4)
선택한 번호:"""

            messages = [
                {"role": "system", "content": "당신은 마피아 게임의 마피아입니다. 밤에 살해할 대상을 선택하세요. 반드시 숫자만 출력하세요."},
                {"role": "user", "content": night_prompt},
            ]

            # ✅ 비동기 호출
            resp = await _openai.chat.completions.create(
                model=AI_MODEL,
                messages=messages,
                max_tokens=10,
                temperature=0.3,
            )

            text = (resp.choices[0].message.content or "").strip()
            
            # 토큰 사용량 추적
            global _total_tokens_used, _total_cost
            if hasattr(resp, 'usage') and resp.usage:
                input_tokens = resp.usage.prompt_tokens
                output_tokens = resp.usage.completion_tokens
                _total_tokens_used["input"] += input_tokens
                _total_tokens_used["output"] += output_tokens
                cost = self.calculate_cost(input_tokens, output_tokens)
                _total_cost += cost
                print(f"💰 토큰 사용량: 입력 {input_tokens}, 출력 {output_tokens}, 비용 ${cost:.6f}")
            
            nums = re.findall(r"\d+", text)
            if nums:
                n = int(nums[0])
                available_targets = [p for p in alive_players if p != self.name]
                if 1 <= n <= len(available_targets):
                    target = available_targets[n - 1]
                    # 메모리에 밤 행동 기록
                    self.memory.add_night_action(target)
                    return target

            # 기본값: 랜덤 선택 (AI 플레이어만)
            available_targets = [p for p in alive_players if p != self.name and p.startswith("플레이어")]
            if available_targets:
                target = random.choice(available_targets)
                self.memory.add_night_action(target)
                return target

            return None

        except Exception as e:
            print(f"AI 밤 행동 오류: {e}")
            available_targets = [p for p in alive_players if p != self.name and p.startswith("플레이어")]
            if available_targets:
                return random.choice(available_targets)
            return None
