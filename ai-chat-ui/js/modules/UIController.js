// UI 제어 클래스
class UIController {
    constructor() {
        this.initializeElements();
    }

    // DOM 요소 초기화
    initializeElements() {
        console.log('initializeElements 시작...');
        console.log('document.readyState:', document.readyState);
        
        // DOM이 완전히 로드될 때까지 대기
        if (document.readyState === 'loading') {
            console.log('DOM이 로딩 중입니다. DOMContentLoaded 이벤트를 기다립니다...');
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOMContentLoaded 이벤트 발생!');
                this.initializeElementsInternal();
            });
        } else {
            console.log('DOM이 이미 로드되었습니다. 바로 초기화합니다.');
            this.initializeElementsInternal();
        }
    }

    // 실제 DOM 요소 초기화
    initializeElementsInternal() {
        console.log('initializeElementsInternal 시작...');
        
        // 게임 시작 화면
        this.gameStart = document.getElementById('gameStart');
        this.gameArea = document.getElementById('gameArea');
        this.playerNameInput = document.getElementById('playerName');
        this.enterNameBtn = document.getElementById('enterNameBtn');
        this.gameIntroModal = document.getElementById('gameIntroModal');
        this.startGameBtn = document.getElementById('startGameBtn');
        
        console.log('gameStart 찾기:', this.gameStart);
        console.log('playerNameInput 찾기:', this.playerNameInput);
        console.log('이름 입력 완료 버튼 찾기:', this.enterNameBtn);
        console.log('게임 시작 버튼 찾기:', this.startGameBtn);
        console.log('gameIntroModal 찾기:', this.gameIntroModal);

        // 게임 진행 화면
        this.phaseIndicator = document.getElementById('phaseIndicator');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.playerList = document.getElementById('playerList');
        this.completeIntroBtn = document.getElementById('completeIntroBtn');
        this.nextPhaseBtn = document.getElementById('nextPhaseBtn');
        this.voteBtn = document.getElementById('voteBtn');

        // 역할 안내 팝업
        this.roleModal = document.getElementById('roleModal');
        this.roleIcon = document.getElementById('roleIcon');
        this.roleText = document.getElementById('roleText');
        this.roleDescription = document.getElementById('roleDescription');
        this.confirmRoleBtn = document.getElementById('confirmRoleBtn');

        // 채팅 관련
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.tabBtns = document.querySelectorAll('.tab-btn');

        // 사용량 통계 관련
        this.toggleStatsBtn = document.getElementById('toggleStatsBtn');
        this.resetStatsBtn = document.getElementById('resetStatsBtn');
        this.currentModelElement = document.getElementById('currentModel');
        this.inputTokensElement = document.getElementById('inputTokens');
        this.outputTokensElement = document.getElementById('outputTokens');
        this.totalCostElement = document.getElementById('totalCost');
        
        console.log('initializeElements 완료');
    }

    // 게임 시작 화면으로 전환
    showGameStart() {
        this.gameStart.style.display = 'block';
        this.gameArea.style.display = 'none';
    }

    // 게임 진행 화면으로 전환
    showGameArea() {
        this.gameStart.style.display = 'none';
        this.gameArea.style.display = 'flex';
    }

    // 게임 설명 모달 표시
    showGameIntro() {
        if (this.gameIntroModal) {
            this.gameIntroModal.style.display = 'flex';
        }
    }

    // 게임 설명 모달 숨기기
    hideGameIntro() {
        if (this.gameIntroModal) {
            this.gameIntroModal.style.display = 'none';
        }
    }

    // 역할 안내 팝업 표시
    showRoleModal(role) {
        if (this.roleModal) {
            if (role === 'citizen') {
                this.roleIcon.textContent = '👤';
                this.roleText.textContent = '시민';
                this.roleText.className = 'role-text citizen';
                this.roleDescription.textContent = '마피아를 찾아내서 시민팀의 승리를 이끌어주세요!';
            } else {
                this.roleIcon.textContent = '🦹';
                this.roleText.textContent = '마피아';
                this.roleText.className = 'role-text mafia';
                this.roleDescription.textContent = '시민들을 속여서 마피아팀의 승리를 이끌어주세요!';
            }
            this.roleModal.style.display = 'flex';
        }
    }

    // 역할 안내 팝업 숨기기
    hideRoleModal() {
        if (this.roleModal) {
            this.roleModal.style.display = 'none';
        }
    }

    // 게임 상태 UI 업데이트
    updateGameUI(gameState) {
        // 페이즈 표시
        if (this.phaseIndicator) {
            this.phaseIndicator.textContent = this.getPhaseText(gameState.phase);
        }

        // 턴 표시
        if (this.turnIndicator) {
            this.turnIndicator.textContent = `턴: ${gameState.turn}`;
        }

        // 플레이어 목록 업데이트
        this.updatePlayerList(gameState.players, gameState.eliminated, gameState.phase);

        // 버튼 상태 업데이트
        this.updateButtonStates(gameState.phase);

        // 입력 필드 상태 업데이트
        this.updateInputState(gameState.phase);
    }

    // 페이즈 텍스트 변환
    getPhaseText(phase) {
        switch (phase) {
            case 'waiting': return '대기 중';
            case 'introduction': return '👋 자기소개';
            case 'night': return '🌙 밤';
            case 'day': return '☀️ 낮';
            case 'voting': return '🗳️ 투표';
            case 'gameOver': return '🎮 게임 종료';
            default: return phase;
        }
    }

    // 플레이어 목록 업데이트
    updatePlayerList(players, eliminated, phase) {
        if (!this.playerList) return;

        this.playerList.innerHTML = '';
        
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const isEliminated = eliminated.includes(player);
            const isVotingPhase = phase === 'voting';
            
            // 생존/사망 상태 표시
            const statusDiv = document.createElement('div');
            statusDiv.className = `player-status ${isEliminated ? 'dead' : 'alive'}`;
            playerItem.appendChild(statusDiv);
            
            // 플레이어 이름
            const nameDiv = document.createElement('div');
            nameDiv.className = 'player-name';
            
            if (isEliminated) {
                playerItem.classList.add('eliminated');
                nameDiv.textContent = player;
            } else {
                nameDiv.textContent = player;
                if (isVotingPhase) {
                    nameDiv.textContent = `🗳️ ${player}`;
                }
            }
            
            playerItem.appendChild(nameDiv);
            this.playerList.appendChild(playerItem);
        });
    }

    // 버튼 상태 업데이트
    updateButtonStates(phase) {
        // 자기소개 완료 버튼
        if (this.completeIntroBtn) {
            this.completeIntroBtn.style.display = phase === 'introduction' ? 'inline-block' : 'none';
        }

        // 다음 페이즈 버튼
        if (this.nextPhaseBtn) {
            this.nextPhaseBtn.style.display = phase === 'waiting' ? 'none' : 'inline-block';
        }

        // 투표 버튼 숨기기 (채팅으로만 투표)
        if (this.voteBtn) {
            this.voteBtn.style.display = 'none';
        }
    }

    // 입력 필드 상태 업데이트
    updateInputState(phase) {
        if (!this.messageInput) return;

        const canInput = phase === 'day' || phase === 'voting' || phase === 'introduction';
        this.messageInput.disabled = !canInput;
        this.sendBtn.disabled = !canInput;

        if (canInput) {
            if (phase === 'voting') {
                this.messageInput.placeholder = '투표할 플레이어 번호를 입력하세요 (1-4)';
            } else if (phase === 'introduction') {
                this.messageInput.placeholder = '자기소개를 입력해주세요...';
            } else {
                this.messageInput.placeholder = '토론에 참여하세요...';
            }
        } else {
            this.messageInput.placeholder = '입력 대기 중...';
        }
    }

    // 메시지 표시
    displayMessage(message, chatManager) {
        console.log('🔍 displayMessage 호출됨:', message);
        console.log('🔍 messagesContainer 존재:', !!this.messagesContainer);
        
        if (!this.messagesContainer) {
            console.error('❌ messagesContainer가 없습니다!');
            return;
        }
        
        const messageDiv = document.createElement('div');
        
        const alignment = chatManager.getMessageAlignment(message.type);
        const messageClass = chatManager.getMessageClass(message.type);
        
        console.log('🔍 메시지 클래스:', messageClass);
        console.log('🔍 메시지 정렬:', alignment);
        
        messageDiv.className = messageClass;
        messageDiv.style.textAlign = alignment;
        
        const html = chatManager.createMessageHTML(message);
        console.log('🔍 생성된 HTML:', html);
        
        messageDiv.innerHTML = html;

        this.messagesContainer.appendChild(messageDiv);
        console.log('✅ 메시지 div가 messagesContainer에 추가됨');
        
        // 애니메이션 클래스 추가
        setTimeout(() => {
            messageDiv.classList.add('message-appear');
        }, 10);
        
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        console.log('✅ 스크롤 완료');
    }

    // 모든 메시지 표시 (새로고침 없이)
    displayAllMessages(chatManager) {
        console.log('🔍 displayAllMessages 호출됨');
        console.log('🔍 messagesContainer 존재:', !!this.messagesContainer);
        
        if (!this.messagesContainer) {
            console.error('❌ messagesContainer가 없습니다!');
            return;
        }
        
        this.messagesContainer.innerHTML = '';
        const messages = chatManager.getAllMessages();
        
        console.log('🔍 표시할 메시지 개수:', messages.length);
        console.log('🔍 메시지 목록:', messages);
        
        // 메시지를 하나씩 순차적으로 표시
        messages.forEach((message, index) => {
            console.log(`🔍 메시지 ${index} 표시 예정:`, message);
            setTimeout(() => {
                this.displayMessage(message, chatManager);
            }, index * 100); // 100ms 간격으로 표시
        });
    }

    // 새로운 메시지만 추가 (기존 메시지는 유지)
    addNewMessages(chatManager, startIndex = 0) {
        const messages = chatManager.getAllMessages();
        
        console.log('🔍 addNewMessages 호출됨');
        console.log('🔍 startIndex:', startIndex);
        console.log('🔍 전체 메시지 개수:', messages.length);
        console.log('🔍 추가할 메시지 개수:', messages.length - startIndex);
        
        // startIndex부터 끝까지의 메시지만 추가
        for (let i = startIndex; i < messages.length; i++) {
            console.log(`🔍 메시지 ${i} 추가 예정:`, messages[i]);
            setTimeout(() => {
                this.displayMessage(messages[i], chatManager);
            }, (i - startIndex) * 100);
        }
    }

    // AI 타이핑 표시
    showAITyping(chatManager, sender = 'AI') {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai ai-message typing-indicator';
        typingDiv.style.textAlign = 'left';
        typingDiv.innerHTML = `<div class="message-content">
            <div class="sender">${sender}</div>
            <div class="content">...</div>
        </div>`;
        typingDiv.id = 'typing-indicator';
        
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // AI 타이핑 숨기기
    hideAITyping() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 탭 필터링 적용
    applyFilters(chatManager) {
        const messages = document.querySelectorAll('.message');
        
        messages.forEach(message => {
            let shouldShow = true;
            const currentFilter = chatManager.getCurrentFilter();

            switch (currentFilter) {
                case 'all':
                    shouldShow = true;
                    break;
                case 'moderator':
                    shouldShow = message.classList.contains('moderator');
                    break;
                case 'player':
                    shouldShow = message.classList.contains('player');
                    break;
                case 'ai':
                    shouldShow = message.classList.contains('ai');
                    break;
            }
            
            message.style.display = shouldShow ? 'block' : 'none';
        });
    }

    // 탭 버튼 활성화 상태 변경
    updateTabButtons(activeFilter) {
        this.tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === activeFilter) {
                btn.classList.add('active');
            }
        });
    }

    // 플레이어 이름 입력값 가져오기
    getPlayerName() {
        return this.playerNameInput ? this.playerNameInput.value.trim() : '';
    }

    // 메시지 입력값 가져오기
    getMessageInput() {
        return this.messageInput ? this.messageInput.value.trim() : '';
    }

    // 메시지 입력값 초기화
    clearMessageInput() {
        if (this.messageInput) {
            this.messageInput.value = '';
        }
    }

    // 시스템 메시지 표시
    showSystemMessage(content) {
        const message = {
            type: 'system',
            content: content,
            timestamp: new Date().toISOString()
        };
        return message;
    }

    // 인간 플레이어 자기소개 활성화
    enablePlayerIntroduction() {
        // 메시지 입력 필드 활성화
        if (this.messageInput) {
            this.messageInput.disabled = false;
            this.messageInput.placeholder = '자기소개를 입력해주세요...';
        }
        
        // 전송 버튼 활성화
        if (this.sendBtn) {
            this.sendBtn.disabled = false;
        }
        
        // 자기소개 완료 버튼 표시
        if (this.completeIntroBtn) {
            this.completeIntroBtn.style.display = 'block';
        }
        
        // 시스템 메시지 제거 - 사용자가 직접 입력하도록 함
    }

    // 사용량 통계 업데이트
    updateUsageStats(stats) {
        if (this.currentModelElement) {
            this.currentModelElement.textContent = stats.current_model;
        }
        if (this.inputTokensElement) {
            this.inputTokensElement.textContent = stats.total_input_tokens.toLocaleString();
        }
        if (this.outputTokensElement) {
            this.outputTokensElement.textContent = stats.total_output_tokens.toLocaleString();
        }
        if (this.totalCostElement) {
            this.totalCostElement.textContent = `$${stats.total_cost_usd.toFixed(6)}`;
        }
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
