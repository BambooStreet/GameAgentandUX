// 채팅 관리 클래스
class ChatManager {
    constructor() {
        this.messages = [];
        this.currentFilter = 'all';
    }

    // 메시지 추가
    addMessage(type, content, sender = null, role = null) {
        const message = {
            type: type,
            content: content,
            sender: sender,
            role: role,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        return message;
    }

    // 채팅 기록 로드
    loadChatHistory(chatHistory, playerName) {
        console.log('🔍 loadChatHistory 호출됨:', { chatHistory, playerName });
        
        this.messages = chatHistory.map(msg => {
            let type = 'ai'; // 기본값
            
            if (msg.sender === playerName) {
                type = 'player';
            } else if (msg.sender === 'moderator' || msg.role === 'moderator') {
                type = 'moderator';
            } else if (msg.sender === 'system') {
                type = 'system';
            }
            
            const mappedMsg = {
                type: type,
                sender: msg.sender,
                content: msg.content,
                timestamp: msg.timestamp,
                role: msg.role
            };
            
            console.log('📝 메시지 매핑:', { original: msg, mapped: mappedMsg });
            
            // 사망 메시지인지 확인하고 로그
            if (msg.content && (
                msg.content.includes('살해') || 
                msg.content.includes('사망') || 
                msg.content.includes('제거') ||
                msg.content.includes('💀')
            )) {
                console.log('💀 사망 메시지 발견:', mappedMsg);
            }
            
            return mappedMsg;
        });
        
        console.log('✅ 최종 메시지 목록:', this.messages);
        
        // 사망 메시지가 있는지 확인
        const deathMessages = this.messages.filter(msg => 
            msg.content && (
                msg.content.includes('살해') || 
                msg.content.includes('사망') || 
                msg.content.includes('제거') ||
                msg.content.includes('💀')
            )
        );
        console.log('💀 사망 관련 메시지:', deathMessages);
        
        // 사회자 메시지 확인
        const moderatorMessages = this.messages.filter(msg => msg.type === 'moderator');
        console.log('📢 사회자 메시지:', moderatorMessages);
    }

    // 메시지 필터 설정
    setFilter(filter) {
        this.currentFilter = filter;
    }

    // 현재 필터 getter
    getCurrentFilter() {
        return this.currentFilter;
    }

    // 모든 메시지 getter
    getAllMessages() {
        return this.messages;
    }

    // 필터된 메시지 getter
    getFilteredMessages() {
        if (this.currentFilter === 'all') {
            return this.messages;
        }

        return this.messages.filter(message => {
            switch (this.currentFilter) {
                case 'moderator':
                    return message.type === 'moderator';
                case 'player':
                    return message.type === 'player';
                case 'ai':
                    return message.type === 'ai';
                default:
                    return true;
            }
        });
    }

    // 시간 포맷팅
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // 메시지 타입에 따른 정렬 결정
    getMessageAlignment(type) {
        return type === 'player' ? 'right' : 'left';
    }

    // 메시지 타입에 따른 CSS 클래스 결정
    getMessageClass(type) {
        let messageClass = `message ${type}`;
        
        if (type === 'player') {
            messageClass += ' player-message';
        } else if (type === 'moderator') {
            messageClass += ' moderator-message';
        } else if (type === 'system') {
            messageClass += ' system-message';
        } else {
            messageClass += ' ai-message';
        }
        
        return messageClass;
    }

    // 메시지 HTML 생성
    createMessageHTML(message) {
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

        // 메시지 내용에서 줄바꿈을 HTML <br> 태그로 변환
        const formattedContent = (message.content || '').replace(/\n/g, '<br>');

        if (message.type === 'player') {
            return `
                <div class="message-bubble player-bubble">
                    <span class="content">${formattedContent}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        } else if (message.type === 'moderator') {
            return `
                <div class="message-bubble moderator-bubble">
                    ${senderText}
                    <span class="content">${formattedContent}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        } else if (message.type === 'system') {
            return `
                <div class="message-bubble system-bubble">
                    ${senderText}
                    <span class="content">${formattedContent}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        } else {
            return `
                <div class="message-bubble ai-bubble">
                    ${senderText}
                    <span class="content">${formattedContent}</span>
                    <span class="timestamp">${this.formatTime(message.timestamp)}</span>
                </div>
            `;
        }
    }

    // AI 타이핑 표시 HTML 생성
    createTypingHTML() {
        return `
            <div class="message-bubble ai-bubble typing">
                <span class="sender">AI</span>
                <span class="content">...</span>
            </div>
        `;
    }

    // 투표 메시지 생성
    createVoteMessage(voter, target) {
        return {
            type: 'moderator',
            content: `🗳️ ${voter}님이 ${target}님에게 투표했습니다.`,
            sender: 'moderator',
            timestamp: new Date().toISOString()
        };
    }
}

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}
