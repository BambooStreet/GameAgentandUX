// API 통신 담당 클래스
class APIClient {
    constructor(baseUrl = 'http://localhost:8000/api') {
        this.baseUrl = baseUrl;
    }

    // 서버 연결 상태 확인
    async checkConnection() {
        try {
            console.log('서버 연결 확인 중...', `${this.baseUrl}/status`);
            const response = await fetch(`${this.baseUrl}/status`);
            console.log('서버 응답:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('✅ 서버 연결 성공');
                return true;
            } else {
                console.log('❌ 서버 응답 오류:', response.status);
                return false;
            }
        } catch (error) {
            console.error('서버 연결 오류:', error);
            return false;
        }
    }

    // 게임 시작
    async startGame(playerName) {
        try {
            console.log('게임 시작 API 호출:', `${this.baseUrl}/game/start`);
            const response = await fetch(`${this.baseUrl}/game/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ player_name: playerName })
            });

            console.log('게임 시작 응답:', response.status, response.statusText);
            const data = await response.json();
            console.log('게임 시작 데이터:', data);
            
            return data;
        } catch (error) {
            console.error('게임 시작 오류:', error);
            throw error;
        }
    }

    // 게임 상태 조회
    async getGameState() {
        try {
            const response = await fetch(`${this.baseUrl}/game/state`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('게임 상태 조회 오류:', error);
            throw error;
        }
    }

    // 자기소개 완료
    async completeIntroduction() {
        try {
            const response = await fetch(`${this.baseUrl}/game/complete-introduction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('자기소개 완료 오류:', error);
            throw error;
        }
    }

    // AI 자기소개
    async getAIIntroduction() {
        try {
            const response = await fetch(`${this.baseUrl}/game/ai-introduction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('AI 자기소개 오류:', error);
            throw error;
        }
    }

    // AI 순차 자기소개
    async getAIIntroductionSequential() {
        try {
            const response = await fetch(`${this.baseUrl}/game/ai-introduction-sequential`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('AI 순차 자기소개 오류:', error);
            throw error;
        }
    }

    // 채팅 메시지 전송
    async sendMessage(message) {
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            throw error;
        }
    }

    // 투표 제출
    async submitVote(voter, target) {
        try {
            const response = await fetch(`${this.baseUrl}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voter: voter,
                    target: target
                })
            });

            return response.ok;
        } catch (error) {
            console.error('투표 제출 오류:', error);
            throw error;
        }
    }

    // AI 먼저 말하기
    async aiSpeakFirst() {
        try {
            const response = await fetch(`${this.baseUrl}/game/ai-speak-first`, {
                method: 'POST'
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('AI 먼저 말하기 오류:', error);
            throw error;
        }
    }

    // AI 순차 발화
    async aiSpeakSequential() {
        try {
            const response = await fetch(`${this.baseUrl}/game/ai-speak-sequential`, {
                method: 'POST'
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('AI 순차 발화 오류:', error);
            throw error;
        }
    }

    // AI 투표
    async aiVote() {
        try {
            const response = await fetch(`${this.baseUrl}/game/ai-vote`, {
                method: 'POST'
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('AI 투표 오류:', error);
            throw error;
        }
    }

    // 자동 진행 (밤/투표)
    async autoProgress() {
        try {
            const response = await fetch(`${this.baseUrl}/game/auto-progress`, {
                method: 'POST'
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('자동 진행 오류:', error);
            throw error;
        }
    }

    // 다음 페이즈 (수동)
    async nextPhase() {
        try {
            const response = await fetch(`${this.baseUrl}/game/next-phase`, {
                method: 'POST'
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('페이즈 진행 오류:', error);
            throw error;
        }
    }

    // 사용량 통계 조회
    async getUsageStats() {
        try {
            const response = await fetch(`${this.baseUrl}/game/usage-stats`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('사용량 통계 조회 오류:', error);
            throw error;
        }
    }

    // 사용량 통계 초기화
    async resetUsageStats() {
        try {
            const response = await fetch(`${this.baseUrl}/game/reset-usage-stats`, {
                method: 'POST'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('사용량 통계 초기화 오류:', error);
            throw error;
        }
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}
