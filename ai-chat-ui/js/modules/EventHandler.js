// 이벤트 처리 클래스
class EventHandler {
    constructor(gameManager, uiController, chatManager) {
        this.gameManager = gameManager;
        this.uiController = uiController;
        this.chatManager = chatManager;
        this.isConnected = false;
        
        // DOM이 완전히 로드된 후 이벤트 바인딩
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
            });
        } else {
            this.bindEvents();
        }
    }

    // 이벤트 바인딩
    bindEvents() {
        console.log('bindEvents 시작...');
        console.log('enterNameBtn 요소:', this.uiController.enterNameBtn);
        console.log('startGameBtn 요소:', this.uiController.startGameBtn);
        
        // 이름 입력 완료 이벤트
        if (this.uiController.enterNameBtn) {
            console.log('이름 입력 완료 버튼에 이벤트 리스너 추가...');
            this.uiController.enterNameBtn.addEventListener('click', () => {
                console.log('이름 입력 완료 버튼이 클릭되었습니다!');
                this.handleNameEnter();
            });
        } else {
            console.error('❌ enterNameBtn을 찾을 수 없습니다!');
        }
        
        // 게임 시작 버튼 이벤트 (모달 내부)
        if (this.uiController.startGameBtn) {
            this.uiController.startGameBtn.addEventListener('click', () => {
                console.log('게임 시작 버튼이 클릭되었습니다!');
                this.uiController.hideGameIntro();
                this.handleGameStart();
            });
        }

        // 역할 확인 버튼 이벤트
        if (this.uiController.confirmRoleBtn) {
            this.uiController.confirmRoleBtn.addEventListener('click', () => {
                console.log('역할 확인 버튼이 클릭되었습니다!');
                this.uiController.hideRoleModal();
            });
        }
        
        // 플레이어 이름 입력 엔터키
        if (this.uiController.playerNameInput) {
            this.uiController.playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleNameEnter();
                }
            });
        }

        // 게임 진행 이벤트
        if (this.uiController.completeIntroBtn) {
            this.uiController.completeIntroBtn.addEventListener('click', () => {
                this.handleCompleteIntroduction();
            });
        }

        if (this.uiController.nextPhaseBtn) {
            this.uiController.nextPhaseBtn.addEventListener('click', () => {
                this.handleNextPhase();
            });
        }

        if (this.uiController.voteBtn) {
            this.uiController.voteBtn.addEventListener('click', () => {
                this.handleVoteDialog();
            });
        }

        // 채팅 이벤트
        if (this.uiController.sendBtn) {
            this.uiController.sendBtn.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }

        if (this.uiController.messageInput) {
            this.uiController.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            });
        }

        // 탭 필터링 이벤트
        this.uiController.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.handleFilterChange(filter);
            });
        });

        // 사용량 통계 이벤트
        if (this.uiController.toggleStatsBtn) {
            this.uiController.toggleStatsBtn.addEventListener('click', () => {
                this.handleToggleStats();
            });
        }

        if (this.uiController.resetStatsBtn) {
            this.uiController.resetStatsBtn.addEventListener('click', () => {
                this.handleResetStats();
            });
        }

        // 게임 상태 업데이트 이벤트
        window.addEventListener('gameStateUpdated', (e) => {
            if (e.detail.success) {
                this.loadGameState();
            }
        });

        // AI 응답 수신 이벤트
        window.addEventListener('aiResponseReceived', (e) => {
            this.handleAIResponse(e.detail.response);
        });

        // AI 타이핑 시작 이벤트
        window.addEventListener('aiTypingStarted', (e) => {
            const sender = e.detail ? e.detail.sender : 'AI';
            this.uiController.showAITyping(this.chatManager, sender);
        });

        // 인간 플레이어 자기소개 활성화 이벤트
        window.addEventListener('enablePlayerIntroduction', () => {
            this.uiController.enablePlayerIntroduction();
            // 시스템 메시지 제거 - 사용자가 직접 입력하도록 함
        });
    }

    // 서버 연결 확인
    async checkServerConnection() {
        try {
            this.isConnected = await this.gameManager.apiClient.checkConnection();
            
            if (!this.isConnected) {
                this.handleConnectionError();
            }
        } catch (error) {
            this.handleConnectionError();
        }
    }

    // 연결 오류 처리
    handleConnectionError() {
        this.isConnected = false;
        const errorMessage1 = this.uiController.showSystemMessage('❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        const errorMessage2 = this.uiController.showSystemMessage('서버 실행: cd backend && python main.py');
        
        this.chatManager.addMessage(errorMessage1.type, errorMessage1.content);
        this.chatManager.addMessage(errorMessage2.type, errorMessage2.content);
        
        this.uiController.displayMessage(errorMessage1, this.chatManager);
        this.uiController.displayMessage(errorMessage2, this.chatManager);
    }

    // 이름 입력 완료 처리
    handleNameEnter() {
        const playerName = this.uiController.getPlayerName();
        
        // 입력값 검증
        if (!playerName || playerName.trim() === '') {
            alert('이름을 입력해주세요.');
            return;
        }
        
        // 이름 길이 제한 (1-10자)
        if (playerName.length < 1 || playerName.length > 10) {
            alert('이름은 1자 이상 10자 이하로 입력해주세요.');
            return;
        }
        
        // 특수문자 제한 (한글, 영문, 숫자만 허용)
        const nameRegex = /^[가-힣a-zA-Z0-9]+$/;
        if (!nameRegex.test(playerName)) {
            alert('이름은 한글, 영문, 숫자만 사용 가능합니다.');
            return;
        }
        
        // 플레이어 이름 저장
        this.gameManager.setPlayerName(playerName.trim());
        
        // 게임 설명 모달 표시
        this.uiController.showGameIntro();
    }

    // 게임 시작 처리
    async handleGameStart() {
        const playerName = this.gameManager.getPlayerName();
        console.log('게임 시작 시도:', playerName);
        
        // 플레이어 이름 재검증
        if (!playerName || playerName.trim() === '') {
            alert('플레이어 이름이 설정되지 않았습니다.');
            return;
        }
        
        if (!this.isConnected) {
            console.log('서버 연결 상태:', this.isConnected);
            alert('서버에 연결되지 않았습니다. 서버가 실행 중인지 확인해주세요.');
            return;
        }

        try {
            const success = await this.gameManager.startGame(playerName);
            
            if (success) {
                // 역할 안내 팝업 표시 (유저는 무조건 시민)
                this.uiController.showRoleModal('citizen');
                
                // 역할 확인 버튼 클릭 후 게임 화면으로 전환
                this.uiController.confirmRoleBtn.onclick = async () => {
                    this.uiController.hideRoleModal();
                    
                    // UI 전환
                    this.uiController.showGameArea();

                    // 게임 상태 업데이트
                    this.uiController.updateGameUI(this.gameManager.getGameState());
                    await this.loadGameState();
                    
                    // AI 순차 자기소개 시작 (1초 후)
                    setTimeout(async () => {
                        const result = await this.gameManager.getAIIntroductionSequential();
                        if (result.success) {
                            // AI 자기소개 후 게임 상태 업데이트
                            await this.loadGameState();
                        }
                    }, 1000);
                };
            } else {
                alert('게임 시작에 실패했습니다. 다시 시도해주세요.');
            }
        } catch (error) {
            console.error('게임 시작 오류:', error);
            alert('게임 시작 중 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.');
        }
    }

    // 자기소개 완료 처리
    async handleCompleteIntroduction() {
        try {
            const result = await this.gameManager.completeIntroduction();
            
            if (result.success) {
                // 사회자 공지 추가
                this.chatManager.addMessage('moderator', result.data.announcement);
                this.uiController.displayMessage(
                    this.chatManager.getAllMessages()[this.chatManager.getAllMessages().length - 1],
                    this.chatManager
                );

                this.uiController.updateGameUI(this.gameManager.getGameState());
            }
        } catch (error) {
            console.error('자기소개 완료 오류:', error);
        }
    }

    // 게임 상태 로드
    async loadGameState() {
        try {
            const result = await this.gameManager.loadGameState();
            
            if (result.success) {
                // 이전 메시지 개수 저장
                const previousMessageCount = this.chatManager.getAllMessages().length;
                
                // 채팅 기록 로드
                this.chatManager.loadChatHistory(result.data.chat_history, this.gameManager.getPlayerName());
                
                // 디버깅: 채팅 기록 확인
                console.log('채팅 기록:', result.data.chat_history);
                console.log('로드된 메시지:', this.chatManager.getAllMessages());
                
                // 사망 메시지 확인
                const deathMessages = result.data.chat_history.filter(msg => 
                    msg.content && (
                        msg.content.includes('살해') || 
                        msg.content.includes('사망') || 
                        msg.content.includes('제거') ||
                        msg.content.includes('💀')
                    )
                );
                console.log('💀 백엔드에서 받은 사망 메시지:', deathMessages);
                
                // 사회자 메시지 확인
                const moderatorMessages = result.data.chat_history.filter(msg => 
                    msg.sender === 'moderator' || msg.role === 'moderator'
                );
                console.log('📢 백엔드에서 받은 사회자 메시지:', moderatorMessages);
                
                // UI 업데이트
                this.uiController.updateGameUI(this.gameManager.getGameState());
                
                // 새로운 메시지만 추가 (첫 로드가 아니면)
                if (previousMessageCount > 0) {
                    this.uiController.addNewMessages(this.chatManager, previousMessageCount);
                } else {
                    // 첫 로드일 때는 모든 메시지를 순차적으로 표시
                    this.uiController.displayAllMessages(this.chatManager);
                }
                
                // 페이즈 전환 처리
                if (result.phaseChanged) {
                    setTimeout(() => {
                        this.gameManager.handlePhaseTransition();
                    }, 2000);
                } else {
                    this.gameManager.handlePhaseTransition();
                }
            }
        } catch (error) {
            console.error('게임 상태 로드 오류:', error);
        }
    }

    // 다음 페이즈 처리
    async handleNextPhase() {
        try {
            const result = await this.gameManager.nextPhase();
            
            if (result.success) {
                // 사회자 공지 추가
                this.chatManager.addMessage('moderator', result.data.announcement);
                this.uiController.displayMessage(
                    this.chatManager.getAllMessages()[this.chatManager.getAllMessages().length - 1],
                    this.chatManager
                );

                this.uiController.updateGameUI(this.gameManager.getGameState());
            }
        } catch (error) {
            console.error('페이즈 진행 오류:', error);
        }
    }

    // 투표 다이얼로그 처리
    handleVoteDialog() {
        const gameState = this.gameManager.getGameState();
        const alivePlayers = gameState.players.filter(
            player => !gameState.eliminated.includes(player) && player !== this.gameManager.getPlayerName()
        );

        if (alivePlayers.length === 0) {
            alert('투표할 플레이어가 없습니다.');
            return;
        }

        let playerList = '';
        alivePlayers.forEach((player, index) => {
            playerList += `${index + 1}. ${player}\n`;
        });

        const target = prompt(
            `투표할 플레이어 번호를 입력하세요:\n${playerList}`
        );

        if (target) {
            const playerIndex = parseInt(target) - 1;
            if (playerIndex >= 0 && playerIndex < alivePlayers.length) {
                this.handleVote(alivePlayers[playerIndex]);
            } else {
                alert('올바른 번호를 입력해주세요.');
            }
        }
    }

    // 투표 처리
    async handleVote(target) {
        // 이미 투표 중인지 확인
        if (this.gameManager.isVoting) {
            console.log('이미 투표 처리 중입니다.');
            return;
        }
        
        try {
            const success = await this.gameManager.submitVote(target);
            
            if (success) {
                console.log('투표가 성공적으로 제출되었습니다.');
                
                // 입력 필드 비활성화
                this.uiController.messageInput.disabled = true;
                this.uiController.sendBtn.disabled = true;
                this.uiController.messageInput.placeholder = '투표 처리 중...';
                
                // 5초 후 입력 필드 다시 활성화 (다음 페이즈를 위해)
                setTimeout(() => {
                    this.uiController.messageInput.disabled = false;
                    this.uiController.sendBtn.disabled = false;
                    this.uiController.messageInput.placeholder = '입력 대기 중...';
                }, 5000);
            }
        } catch (error) {
            console.error('투표 제출 오류:', error);
        }
    }

    // 메시지 전송 처리
    async handleSendMessage() {
        const content = this.uiController.getMessageInput();
        if (!content) return;

        if (!this.isConnected) {
            alert('서버에 연결되지 않았습니다.');
            return;
        }

        // 입력 가능한 상태인지 확인
        const gameState = this.gameManager.getGameState();
        console.log('🔍 현재 게임 상태:', gameState);
        console.log('🔍 현재 페이즈:', gameState.phase);
        console.log('🔍 canUserInput 결과:', this.gameManager.canUserInput());
        
        if (!this.gameManager.canUserInput()) {
            alert('현재는 입력할 수 없습니다. 토론 턴이나 투표 시간에만 입력 가능합니다.');
            return;
        }

        // 자기소개 페이즈에서 메시지 전송 시 자동으로 밤 페이즈로 넘어가기
        if (gameState.phase === 'introduction') {
            // 사용자 메시지를 먼저 UI에 추가
            this.chatManager.addMessage('player', content);
            this.uiController.displayMessage(
                this.chatManager.getAllMessages()[this.chatManager.getAllMessages().length - 1],
                this.chatManager
            );

            // 입력 필드 비활성화
            this.uiController.messageInput.disabled = true;
            this.uiController.sendBtn.disabled = true;
            this.uiController.messageInput.placeholder = '자기소개 완료 중...';

            // 2초 후 자기소개 완료 처리
            setTimeout(async () => {
                try {
                    const result = await this.gameManager.completeIntroduction();
                    if (result.success) {
                        // 사회자 공지 추가
                        this.chatManager.addMessage('moderator', result.data.announcement);
                        this.uiController.displayMessage(
                            this.chatManager.getAllMessages()[this.chatManager.getAllMessages().length - 1],
                            this.chatManager
                        );

                        this.uiController.updateGameUI(this.gameManager.getGameState());
                        
                        // 3초 후 밤 페이즈 자동 진행 (마피아 행동)
                        setTimeout(async () => {
                            try {
                                const autoResult = await this.gameManager.autoProgressNight();
                                if (autoResult.success) {
                                    // 전체 게임 상태를 다시 로드하여 모든 메시지 표시
                                    await this.loadGameState();
                                }
                            } catch (error) {
                                console.error('밤 페이즈 자동 진행 오류:', error);
                            }
                        }, 3000);
                    }
                } catch (error) {
                    console.error('자기소개 완료 오류:', error);
                }
            }, 2000);

            this.uiController.clearMessageInput();
            return;
        }

        // 투표 페이즈에서 숫자 입력 처리
        if (gameState.phase === 'voting') {
            const voteNumber = parseInt(content);
            
            // 전체 플레이어 목록에서 선택 (사용자 제외)
            const availablePlayers = gameState.players.filter(
                player => player !== this.gameManager.getPlayerName()
            );
            
            if (isNaN(voteNumber) || voteNumber < 1 || voteNumber > availablePlayers.length) {
                alert(`1부터 ${availablePlayers.length}까지의 숫자를 입력해주세요.`);
                this.uiController.clearMessageInput();
                return;
            }
            
            const targetPlayer = availablePlayers[voteNumber - 1];
            this.handleVote(targetPlayer);
            this.uiController.clearMessageInput();
            return;
        }

        // 일반 메시지 전송
        const message = {
            sender: this.gameManager.getPlayerName(),
            content: content,
            timestamp: new Date().toISOString(),
            role: gameState.roles[this.gameManager.getPlayerName()]
        };

        try {
            // 사용자 메시지를 먼저 UI에 추가
            this.chatManager.addMessage('player', content);
            this.uiController.displayMessage(
                this.chatManager.getAllMessages()[this.chatManager.getAllMessages().length - 1],
                this.chatManager
            );

            const data = await this.gameManager.apiClient.sendMessage(message);
            
            if (data.success) {
                // 자동 진행 처리
                if (data.auto_progress) {
                    gameState.phase = data.auto_progress.phase;
                    gameState.turn = data.auto_progress.turn;
                    
                    // 전체 게임 상태를 다시 로드하여 모든 메시지 표시
                    await this.loadGameState();
                }

                this.uiController.clearMessageInput();
            }
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            alert('메시지 전송 중 오류가 발생했습니다.');
        }
    }

    // AI 응답 처리
    async handleAIResponse(response) {
        // 타이핑 숨기고 AI 메시지 표시
        this.uiController.hideAITyping();
        
        // AI 메시지를 채팅에 추가
        const aiMessage = this.chatManager.addMessage('ai', response.content, response.sender);
        this.uiController.displayMessage(aiMessage, this.chatManager);
    }

    // 필터 변경 처리
    handleFilterChange(filter) {
        this.chatManager.setFilter(filter);
        this.uiController.updateTabButtons(filter);
        this.uiController.applyFilters(this.chatManager);
    }

    // 사용량 통계 토글 처리
    async handleToggleStats() {
        const statsContainer = document.getElementById('usageStats');
        if (statsContainer.style.display === 'none') {
            statsContainer.style.display = 'block';
            await this.loadUsageStats();
        } else {
            statsContainer.style.display = 'none';
        }
    }

    // 사용량 통계 로드
    async loadUsageStats() {
        try {
            const stats = await this.gameManager.apiClient.getUsageStats();
            if (stats.success) {
                this.uiController.updateUsageStats(stats.usage_stats);
            }
        } catch (error) {
            console.error('사용량 통계 로드 오류:', error);
        }
    }

    // 사용량 통계 초기화
    async handleResetStats() {
        if (confirm('사용량 통계를 초기화하시겠습니까?')) {
            try {
                const result = await this.gameManager.apiClient.resetUsageStats();
                if (result.success) {
                    alert('사용량 통계가 초기화되었습니다.');
                    await this.loadUsageStats();
                }
            } catch (error) {
                console.error('사용량 통계 초기화 오류:', error);
            }
        }
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventHandler;
}
