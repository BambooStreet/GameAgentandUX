class MafiaGame {
    constructor() {
        this.messages = [];
        this.currentFilter = 'all';
        this.gameState = {
            phase: 'waiting',
            turn: 0,
            players: [],
            roles: {},
            eliminated: []
        };
        this.playerName = '';
        this.apiBaseUrl = 'http://localhost:8000/api';
        this.isConnected = false;
        this.aiSpoken = false; // AI 발화 플래그
        this.lastTurn = 0; // 마지막 턴 추적

        this.initializeElements();
        this.bindEvents();
        this.checkServerConnection();
    }

    initializeElements() {
        console.log('initializeElements 시작...');
        
        // 게임 시작 화면
        this.gameStart = document.getElementById('gameStart');
        this.gameArea = document.getElementById('gameArea');
        this.playerNameInput = document.getElementById('playerName');
        this.enterNameBtn = document.getElementById('enterNameBtn');
        this.gameIntroModal = document.getElementById('gameIntroModal');
        this.startGameBtn = document.getElementById('startGameBtn');
        
        console.log('게임 시작 버튼 찾기:', this.enterNameBtn);

        // 게임 진행 화면
        this.phaseIndicator = document.getElementById('phaseIndicator');
        this.turnIndicator = document.getElementById('turnIndicator');
        this.playerList = document.getElementById('playerList');
        this.nextPhaseBtn = document.getElementById('nextPhaseBtn');
        this.voteBtn = document.getElementById('voteBtn');

        // 채팅 관련
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        
        console.log('initializeElements 완료');
    }

    bindEvents() {
        console.log('bindEvents 시작...');
        console.log('enterNameBtn 요소:', this.enterNameBtn);
        
        // 이름 입력 완료 이벤트
        if (this.enterNameBtn) {
            console.log('이름 입력 완료 버튼에 이벤트 리스너 추가...');
            this.enterNameBtn.addEventListener('click', () => {
                console.log('이름 입력 완료 버튼이 클릭되었습니다!');
                this.showGameIntro();
            });
        } else {
            console.error('❌ enterNameBtn을 찾을 수 없습니다!');
        }
        
        // 게임 시작 버튼 이벤트 (모달 내부)
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => {
                console.log('게임 시작 버튼이 클릭되었습니다!');
                this.hideGameIntro();
                this.startGame();
            });
        }
        
        this.playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.showGameIntro();
        });

        // 게임 진행 이벤트
        this.nextPhaseBtn.addEventListener('click', () => this.nextPhase());
        this.voteBtn.addEventListener('click', () => this.showVoteDialog());

        // 채팅 이벤트
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // 탭 필터링 이벤트
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });
    }

    async checkServerConnection() {
        try {
            console.log('서버 연결 확인 중...', `${this.apiBaseUrl}/status`);
            const response = await fetch(`${this.apiBaseUrl}/status`);
            console.log('서버 응답:', response.status, response.statusText);
            
            if (response.ok) {
                this.isConnected = true;
                console.log('✅ 서버 연결 성공');
                this.addMessage('system', '✅ 서버에 연결되었습니다.');
            } else {
                console.log('❌ 서버 응답 오류:', response.status);
                this.handleConnectionError();
            }
        } catch (error) {
            console.error('서버 연결 오류:', error);
            this.handleConnectionError();
        }
    }

    handleConnectionError() {
        this.isConnected = false;
        this.addMessage('system', '❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
        this.addMessage('system', '서버 실행: cd backend && python main.py');
    }

    showGameIntro() {
        const playerName = this.playerNameInput.value.trim();
        if (!playerName) {
            alert('이름을 입력해주세요.');
            return;
        }
        
        this.playerName = playerName;
        this.gameIntroModal.style.display = 'flex';
    }

    hideGameIntro() {
        this.gameIntroModal.style.display = 'none';
    }

    async startGame() {
        console.log('게임 시작 시도:', this.playerName);
        
        if (!this.isConnected) {
            console.log('서버 연결 상태:', this.isConnected);
            alert('서버에 연결되지 않았습니다.');
            return;
        }

        try {
            console.log('게임 시작 API 호출:', `${this.apiBaseUrl}/game/start`);
            const response = await fetch(`${this.apiBaseUrl}/game/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ player_name: this.playerName })
            });

            console.log('게임 시작 응답:', response.status, response.statusText);
            const data = await response.json();
            console.log('게임 시작 데이터:', data);
            
            if (data.success) {
                this.gameState = {
                    phase: data.phase,
                    turn: 1,
                    players: data.players,
                    roles: data.roles,
                    eliminated: []
                };

                // UI 전환
                this.gameStart.style.display = 'none';
                this.gameArea.style.display = 'flex';

                // 게임 상태 업데이트
                this.updateGameUI();
                this.loadGameState();

                this.addMessage('system', '🎮 게임이 시작되었습니다!');
            } else {
                alert('게임 시작에 실패했습니다.');
            }
        } catch (error) {
            console.error('게임 시작 오류:', error);
            alert('게임 시작 중 오류가 발생했습니다.');
        }
    }

    async loadGameState() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/game/state`);
            const data = await response.json();
            
            // 이전 페이즈 저장
            const previousPhase = this.gameState ? this.gameState.phase : null;
            
            this.gameState = {
                phase: data.phase,
                turn: data.turn,
                players: data.players,
                roles: data.roles,
                eliminated: data.eliminated
            };
            
            // 페이즈가 변경되었고, 이전 페이즈가 존재할 때만 딜레이 적용
            const phaseChanged = previousPhase && previousPhase !== this.gameState.phase;
            
            // 턴이 바뀌면 AI 발화 플래그 리셋 (이전 턴과 다른 경우에만)
            if (this.gameState.phase === 'day' && this.gameState.turn > 0) {
                if (this.lastTurn !== this.gameState.turn) {
                    this.aiSpoken = false;
                    this.lastTurn = this.gameState.turn;
                }
            }

            // 채팅 기록 로드
            this.messages = data.chat_history.map(msg => {
                let type = 'ai'; // 기본값
                
                if (msg.sender === this.playerName) {
                    type = 'player';
                } else if (msg.sender === 'moderator') {
                    type = 'moderator';
                } else if (msg.sender === 'system') {
                    type = 'system';
                }
                
                return {
                    type: type,
                    sender: msg.sender,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    role: msg.role
                };
            });

            this.updateGameUI();
            this.displayMessages();
            
            // 페이즈 전환 시 2초 딜레이 적용
            if (phaseChanged) {
                setTimeout(() => {
                    this.handlePhaseTransition();
                }, 2000);
            } else {
                            // 페이즈 전환이 아닌 경우 즉시 처리
            this.handlePhaseTransition();
        }
    } catch (error) {
        console.error('게임 상태 로드 오류:', error);
    }
    }
    
    handlePhaseTransition() {
        // 밤 페이즈일 때 자동 진행
        if (this.gameState.phase === 'night') {
            setTimeout(() => this.autoProgressNight(), 1000); // 1초 후 자동 진행
        }
        // 낮 페이즈일 때 AI들이 먼저 말하도록 (한 번만 실행)
        else if (this.gameState.phase === 'day' && !this.aiSpoken) {
            this.aiSpoken = true; // 플래그 설정
            setTimeout(() => this.aiSpeakFirst(), 1000); // 1초 후 AI들이 먼저 말
        }
        // 투표 페이즈일 때 AI들이 투표하도록
        else if (this.gameState.phase === 'voting') {
            setTimeout(() => this.aiVote(), 1000); // 1초 후 AI들이 투표
        }
    }
    
    async autoProgressNight() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/game/auto-progress`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;
                
                // 전체 게임 상태를 다시 로드하여 모든 메시지 표시
                await this.loadGameState();
            }
        } catch (error) {
            console.error('자동 진행 오류:', error);
        }
    }
    
    async aiSpeakFirst() {
        try {
            // AI가 말하기 시작한다는 표시
            this.showAITyping();
            
            const response = await fetch(`${this.apiBaseUrl}/game/ai-speak-first`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // AI 타이핑 표시 제거
                this.hideAITyping();
                
                // AI 응답들을 화면에 추가
                data.ai_responses.forEach(aiResponse => {
                    this.addMessage('ai', aiResponse.content, aiResponse.sender, aiResponse.role);
                });
                
                // 게임 상태만 업데이트 (loadGameState 호출하지 않음)
                this.updateGameUI();
            }
        } catch (error) {
            console.error('AI 먼저 말하기 오류:', error);
            this.hideAITyping();
        }
    }
    
    showAITyping() {
        // AI 타이핑 표시 추가
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai ai-message typing-indicator';
        typingDiv.style.textAlign = 'left';
        typingDiv.innerHTML = `
            <div class="message-bubble ai-bubble typing">
                <span class="sender">AI</span>
                <span class="content">...</span>
            </div>
        `;
        typingDiv.id = 'typing-indicator';
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    hideAITyping() {
        // AI 타이핑 표시 제거
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    async aiVote() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/game/ai-vote`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                // AI 투표들을 화면에 추가
                data.ai_votes.forEach(aiVote => {
                    this.addMessage('moderator', `🗳️ ${aiVote.voter}님이 ${aiVote.target}님에게 투표했습니다.`);
                });
                
                // 게임 상태만 업데이트 (loadGameState 호출하지 않음)
                this.updateGameUI();
            }
        } catch (error) {
            console.error('AI 투표 오류:', error);
        }
    }

    updateGameUI() {
        // 페이즈 표시
        const phaseText = this.getPhaseText(this.gameState.phase);
        this.phaseIndicator.textContent = phaseText;
        this.phaseIndicator.className = `phase-indicator ${this.gameState.phase}`;

        // 턴 표시
        this.turnIndicator.textContent = `턴: ${this.gameState.turn}`;

        // 플레이어 목록 업데이트
        this.updatePlayerList();

        // 버튼 상태 업데이트
        this.updateButtonStates();
    }

    getPhaseText(phase) {
        switch (phase) {
            case 'waiting': return '대기 중';
            case 'night': return '🌙 밤';
            case 'day': return '☀️ 낮';
            case 'voting': return '🗳️ 투표';
            case 'gameOver': return '🎮 게임 종료';
            default: return phase;
        }
    }

    updatePlayerList() {
        this.playerList.innerHTML = '';
        
        this.gameState.players.forEach((player, index) => {
            const role = this.gameState.roles[player];
            const isEliminated = this.gameState.eliminated.includes(player);
            const isCurrentPlayer = player === this.playerName;
            
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${role} ${isEliminated ? 'eliminated' : ''} ${isCurrentPlayer ? 'player' : ''}`;
            
            // 플레이어 이름만 표시 (번호 제거)
            playerItem.textContent = player;
            
            if (isEliminated) {
                playerItem.textContent += ' 💀';
            }
            
            if (isCurrentPlayer) {
                playerItem.title = `당신 (${role === 'mafia' ? '마피아' : '시민'})`;
            }
            
            // 투표 페이즈일 때 투표 가능한 플레이어 표시
            if (this.gameState.phase === 'voting' && !isEliminated && !isCurrentPlayer) {
                playerItem.textContent += ' 🗳️';
            }
            
            this.playerList.appendChild(playerItem);
        });
    }

    updateButtonStates() {
        // 다음 페이즈 버튼
        if (this.gameState.phase === 'voting') {
            this.nextPhaseBtn.textContent = '투표 결과';
        } else {
            this.nextPhaseBtn.textContent = '다음 페이즈';
        }

        // 투표 버튼 숨기기 (채팅으로만 투표)
        this.voteBtn.style.display = 'none';

        // 입력 필드 상태 업데이트
        this.updateInputState();
    }

    canUserInput() {
        // 토론 페이즈의 각 턴이거나 투표 페이즈일 때만 입력 가능
        return (this.gameState.phase === 'day' && this.gameState.turn > 0) || 
               this.gameState.phase === 'voting';
    }

    updateInputState() {
        const canInput = this.canUserInput();
        this.messageInput.disabled = !canInput;
        this.sendBtn.disabled = !canInput;
        
        if (canInput) {
            this.messageInput.placeholder = this.gameState.phase === 'voting' 
                ? '투표할 플레이어 번호를 입력하세요 (1-4)' 
                : '토론에 참여하세요...';
        } else {
            this.messageInput.placeholder = '입력 대기 중...';
        }
    }

    async nextPhase() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/game/next-phase`, {
                method: 'POST'
            });

            const data = await response.json();
            
            if (data.success) {
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;

                // 사회자 공지 추가
                this.addMessage('moderator', data.announcement);

                this.updateGameUI();
            }
        } catch (error) {
            console.error('페이즈 진행 오류:', error);
        }
    }

    showVoteDialog() {
        const alivePlayers = this.gameState.players.filter(
            player => !this.gameState.eliminated.includes(player) && player !== this.playerName
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
                this.submitVote(alivePlayers[playerIndex]);
            } else {
                alert('올바른 번호를 입력해주세요.');
            }
        }
    }

    async submitVote(target) {
        // 투표 로직 구현
        this.addMessage('player', `🗳️ ${target}에게 투표했습니다.`);
        
        // 투표 결과를 서버에 전송 (향후 구현)
        try {
            const response = await fetch(`${this.apiBaseUrl}/vote`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                    voter: this.playerName,
                    target: target
                    })
                });

            if (response.ok) {
                console.log('투표가 성공적으로 제출되었습니다.');
                
                // 투표 후 5초 뒤 자동 진행
                setTimeout(() => this.autoProgressVoting(), 5000);
            }
        } catch (error) {
            console.error('투표 제출 오류:', error);
        }
    }
    
    async autoProgressVoting() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/game/auto-progress`, {
                method: 'POST'
            });

                const data = await response.json();
                
            if (data.success) {
                this.gameState.phase = data.phase;
                this.gameState.turn = data.turn;
                
                // 전체 게임 상태를 다시 로드하여 모든 메시지 표시
                await this.loadGameState();
            }
        } catch (error) {
            console.error('투표 자동 진행 오류:', error);
        }
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;

        if (!this.isConnected) {
            alert('서버에 연결되지 않았습니다.');
            return;
        }

        // 입력 가능한 상태인지 확인
        if (!this.canUserInput()) {
            alert('현재는 입력할 수 없습니다. 토론 턴이나 투표 시간에만 입력 가능합니다.');
            return;
        }

        // 투표 페이즈에서 숫자 입력 처리
        if (this.gameState.phase === 'voting') {
            const voteNumber = parseInt(content);
            
            // 전체 플레이어 목록에서 선택 (사용자 제외)
            const availablePlayers = this.gameState.players.filter(
                player => player !== this.playerName
            );
            
            if (isNaN(voteNumber) || voteNumber < 1 || voteNumber > availablePlayers.length) {
                alert(`1부터 ${availablePlayers.length}까지의 숫자를 입력해주세요.`);
                this.messageInput.value = '';
                return;
            }
            
            const targetPlayer = availablePlayers[voteNumber - 1];
            this.submitVote(targetPlayer);
            this.messageInput.value = '';
            return;
        }

        const message = {
            sender: this.playerName,
            content: content,
            timestamp: new Date().toISOString(),
            role: this.gameState.roles[this.playerName]
        };

        try {
                const response = await fetch(`${this.apiBaseUrl}/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                body: JSON.stringify(message)
                });

                const data = await response.json();
                
                if (data.success) {
                // 사용자 메시지는 이미 서버에서 처리되었으므로 UI에만 추가
                this.addMessage('player', content);

                // 자동 진행 처리
                if (data.auto_progress) {
                    this.gameState.phase = data.auto_progress.phase;
                    this.gameState.turn = data.auto_progress.turn;
                    
                    // 전체 게임 상태를 다시 로드하여 모든 메시지 표시
                    await this.loadGameState();
                }

                this.messageInput.value = '';
            }
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            alert('메시지 전송 중 오류가 발생했습니다.');
        }
    }

    addMessage(type, content, sender = null, role = null) {
        const message = {
            type: type,
            content: content,
            sender: sender,
            role: role,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.displayMessage(message);
    }

    displayMessages() {
        this.messagesContainer.innerHTML = '';
        this.messages.forEach(message => {
            this.displayMessage(message);
        });
    }

    displayMessage(message) {
        const messageDiv = document.createElement('div');
        
        // 메시지 타입에 따른 정렬 결정
        let messageClass = `message ${message.type}`;
        let alignment = 'right'; // 기본값
        
        if (message.type === 'player') {
            alignment = 'right';
            messageClass += ' player-message';
        } else {
            // AI, 사회자, 시스템 메시지는 왼쪽 정렬
            alignment = 'left';
            messageClass += ' ai-message';
        }
        
        messageDiv.className = messageClass;
        messageDiv.style.textAlign = alignment;
        
        this.createMessageContent(messageDiv, message, alignment);
    }
    
    createMessageContent(messageDiv, message, alignment) {

        let senderText = '';
        if (message.sender) {
            senderText = `<span class="sender">${message.sender}</span>`;
        } else {
            switch (message.type) {
                case 'player': senderText = '<span class="sender">당신</span>'; break;
                case 'moderator': senderText = '<span class="sender">사회자</span>'; break;
                case 'system': senderText = '<span class="sender">시스템</span>'; break;
                default: senderText = '<span class="sender">알 수 없음</span>';
            }
        }

        // 메시지 타입에 따른 다른 레이아웃
        if (message.type === 'player') {
            messageDiv.innerHTML = `
                <div class="message-bubble player-bubble">
                    <span class="content">${message.content}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        } else {
            // AI, 사회자, 시스템 메시지
            messageDiv.innerHTML = `
                <div class="message-bubble ai-bubble">
                    ${senderText}
                    <span class="content">${message.content}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // 탭 버튼 활성화 상태 변경
        this.tabBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });

        // 메시지 필터링 적용
        this.applyFilters();
    }

    applyFilters() {
        const messages = document.querySelectorAll('.message');
        
        messages.forEach(message => {
            let shouldShow = true;

            switch (this.currentFilter) {
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
}

// 게임 시작
console.log('JavaScript 파일이 로드되었습니다!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM이 로드되었습니다! MafiaGame 인스턴스를 생성합니다.');
    const game = new MafiaGame();
    console.log('MafiaGame 인스턴스 생성 완료:', game);
});