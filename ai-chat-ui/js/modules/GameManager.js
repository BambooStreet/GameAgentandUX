// 게임 상태 관리 클래스
class GameManager {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.gameState = {
            phase: 'waiting',
            turn: 0,
            players: [],
            roles: {},
            eliminated: []
        };
        this.playerName = '';
        this.aiSpoken = false;
        this.lastTurn = 0;
        this.isVoting = false;
    }

    // 플레이어 이름 설정
    setPlayerName(playerName) {
        this.playerName = playerName;
    }

    // 플레이어 이름 가져오기
    getPlayerName() {
        return this.playerName;
    }

    // 게임 시작
    async startGame(playerName) {
        try {
            const data = await this.apiClient.startGame(playerName);
            
            if (data.success) {
                this.gameState = {
                    phase: data.phase,
                    turn: 1,
                    players: data.players,
                    roles: data.roles,
                    eliminated: []
                };
                return true;
            }
            return false;
        } catch (error) {
            console.error('게임 시작 실패:', error);
            return false;
        }
    }

    // 자기소개 완료
    async completeIntroduction() {
        try {
            const data = await this.apiClient.completeIntroduction();
            
            if (data.success) {
                this.gameState.phase = data.phase;
                return {
                    success: true,
                    data: data
                };
            }
            return { success: false };
        } catch (error) {
            console.error('자기소개 완료 실패:', error);
            return { success: false, error };
        }
    }

    // AI 자기소개
    async getAIIntroduction() {
        try {
            const data = await this.apiClient.getAIIntroduction();
            
            if (data.success && data.ai_introductions) {
                // AI 자기소개들을 채팅에 추가
                data.ai_introductions.forEach(intro => {
                    // AI 자기소개를 채팅 매니저에 추가하는 이벤트 발생
                    window.dispatchEvent(new CustomEvent('aiResponseReceived', { 
                        detail: { response: intro } 
                    }));
                });
            }
            
            return { success: true, data: data };
        } catch (error) {
            console.error('AI 자기소개 실패:', error);
            return { success: false, error };
        }
    }

    // AI 순차 자기소개
    async getAIIntroductionSequential() {
        try {
            const data = await this.apiClient.getAIIntroductionSequential();
            
            if (data.success && data.ai_introductions) {
                // AI 자기소개들을 순차적으로 처리
                for (let i = 0; i < data.ai_introductions.length; i++) {
                    const intro = data.ai_introductions[i];
                    
                    // AI 타이핑 시작 이벤트 발생
                    window.dispatchEvent(new CustomEvent('aiTypingStarted', { 
                        detail: { sender: intro.sender } 
                    }));
                    
                    // 2초 후 AI 메시지 표시
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // AI 타이핑 종료 및 메시지 표시
                    window.dispatchEvent(new CustomEvent('aiResponseReceived', { 
                        detail: { response: intro } 
                    }));
                    
                    // 다음 AI 전 1초 대기
                    if (i < data.ai_introductions.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
                
                // AI 자기소개 완료 후 인간 플레이어 자기소개 입력 활성화
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('enablePlayerIntroduction', {}));
                }, 1000);
            }
            
            return { success: true, data: data };
        } catch (error) {
            console.error('AI 순차 자기소개 실패:', error);
            return { success: false, error };
        }
    }

    // 게임 상태 로드
    async loadGameState() {
        try {
            const data = await this.apiClient.getGameState();
            
            // 이전 페이즈 저장
            const previousPhase = this.gameState ? this.gameState.phase : null;
            
            this.gameState = {
                phase: data.phase,
                turn: data.turn,
                players: data.players,
                roles: data.roles,
                eliminated: data.eliminated
            };
            
            // 턴이 바뀌면 AI 발화 플래그 리셋
            if (this.gameState.phase === 'day' && this.gameState.turn > 0) {
                if (this.lastTurn !== this.gameState.turn) {
                    this.aiSpoken = false;
                    this.lastTurn = this.gameState.turn;
                }
            }

            return {
                success: true,
                data: data,
                phaseChanged: previousPhase && previousPhase !== this.gameState.phase
            };
        } catch (error) {
            console.error('게임 상태 로드 오류:', error);
            return { success: false, error };
        }
    }

    // 페이즈 전환 처리
    handlePhaseTransition() {
        if (this.gameState.phase === 'night') {
            setTimeout(async () => {
                const result = await this.autoProgressNight();
                if (result.success) {
                    // 게임 상태 업데이트 후 UI 새로고침을 위해 이벤트 발생
                    window.dispatchEvent(new CustomEvent('gameStateUpdated', { 
                        detail: { success: true, data: result.data } 
                    }));
                }
            }, 1000);
        } else if (this.gameState.phase === 'day' && !this.aiSpoken) {
            this.aiSpoken = true;
            setTimeout(async () => {
                // AI 순차 발화 시작
                const result = await this.aiSpeakSequential();
                if (result.success) {
                    // AI가 말한 후 게임 상태 업데이트를 위해 이벤트 발생
                    window.dispatchEvent(new CustomEvent('gameStateUpdated', { 
                        detail: { success: true, data: result } 
                    }));
                }
            }, 1000);
        } else if (this.gameState.phase === 'voting') {
            setTimeout(async () => {
                const result = await this.aiVote();
                if (result.success) {
                    // AI 투표 후 자동으로 다음 페이즈로 진행
                    setTimeout(async () => {
                        const autoResult = await this.autoProgressVoting();
                        if (autoResult.success) {
                            // 게임 상태 업데이트를 위해 이벤트 발생
                            window.dispatchEvent(new CustomEvent('gameStateUpdated', { 
                                detail: { success: true, data: autoResult.data } 
                            }));
                        }
                    }, 3000); // 3초 후 자동 진행
                }
            }, 1000);
        }
    }

    // 밤 자동 진행
    async autoProgressNight() {
        try {
            const data = await this.apiClient.autoProgress();
            
            if (data.success) {
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;
                return { success: true, data };
            }
            return { success: false };
        } catch (error) {
            console.error('자동 진행 오류:', error);
            return { success: false, error };
        }
    }

    // AI 먼저 말하기
    async aiSpeakFirst() {
        try {
            const data = await this.apiClient.aiSpeakFirst();
            
            if (data.success && data.ai_responses) {
                // AI 응답들을 채팅에 추가
                data.ai_responses.forEach(response => {
                    // AI 응답을 채팅 매니저에 추가하는 이벤트 발생
                    window.dispatchEvent(new CustomEvent('aiResponseReceived', { 
                        detail: { response } 
                    }));
                });
            }
            
            return data;
        } catch (error) {
            console.error('AI 먼저 말하기 오류:', error);
            return { success: false, error };
        }
    }

    // AI 순차 발화
    async aiSpeakSequential() {
        try {
            const data = await this.apiClient.aiSpeakSequential();
            
            if (data.success && data.ai_responses) {
                // AI 응답들을 순차적으로 처리
                for (let i = 0; i < data.ai_responses.length; i++) {
                    const response = data.ai_responses[i];
                    
                    // AI 타이핑 시작 이벤트 발생
                    window.dispatchEvent(new CustomEvent('aiTypingStarted', { 
                        detail: { sender: response.sender } 
                    }));
                    
                    // 2초 후 AI 메시지 표시
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // AI 타이핑 종료 및 메시지 표시
                    window.dispatchEvent(new CustomEvent('aiResponseReceived', { 
                        detail: { response } 
                    }));
                    
                    // 다음 AI 전 1초 대기
                    if (i < data.ai_responses.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            return data;
        } catch (error) {
            console.error('AI 순차 발화 오류:', error);
            return { success: false, error };
        }
    }

    // AI 투표
    async aiVote() {
        try {
            const data = await this.apiClient.aiVote();
            return data;
        } catch (error) {
            console.error('AI 투표 오류:', error);
            return { success: false, error };
        }
    }

    // 투표 제출
    async submitVote(target) {
        try {
            // 이미 투표 중인지 확인
            if (this.isVoting) {
                console.log('이미 투표 처리 중입니다.');
                return false;
            }
            
            this.isVoting = true;
            const success = await this.apiClient.submitVote(this.playerName, target);
            
            if (success) {
                // 8초 후 자동 진행 (AI들이 모두 투표할 시간 확보)
                setTimeout(async () => {
                    this.isVoting = false;
                    const result = await this.autoProgressVoting();
                    if (result.success) {
                        // 게임 상태 업데이트를 위해 이벤트 발생
                        window.dispatchEvent(new CustomEvent('gameStateUpdated', { 
                            detail: { success: true, data: result.data } 
                        }));
                    }
                }, 8000);
            } else {
                this.isVoting = false;
            }
            
            return success;
        } catch (error) {
            console.error('투표 제출 오류:', error);
            this.isVoting = false;
            return false;
        }
    }

    // 투표 자동 진행
    async autoProgressVoting() {
        try {
            const data = await this.apiClient.autoProgress();
            
            if (data.success) {
                // 투표 결과를 먼저 표시하고, 그 다음에 페이즈 변경
                const previousPhase = this.gameState.phase;
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;
                
                return { 
                    success: true, 
                    data,
                    previousPhase: previousPhase,
                    phaseChanged: true
                };
            }
            return { success: false };
        } catch (error) {
            console.error('투표 자동 진행 오류:', error);
            return { success: false, error };
        }
    }

    // 다음 페이즈 (수동)
    async nextPhase() {
        try {
            const data = await this.apiClient.nextPhase();
            
            if (data.success) {
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;
                return { success: true, data };
            }
            return { success: false };
        } catch (error) {
            console.error('페이즈 진행 오류:', error);
            return { success: false, error };
        }
    }

    // 사용자 입력 가능 여부 확인
    canUserInput() {
        return this.gameState.phase === 'day' || this.gameState.phase === 'voting' || this.gameState.phase === 'introduction';
    }

    // 게임 상태 getter
    getGameState() {
        return this.gameState;
    }

    // 플레이어 이름 getter
    getPlayerName() {
        return this.playerName;
    }

    // AI 발화 상태 getter
    getAiSpoken() {
        return this.aiSpoken;
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameManager;
}
