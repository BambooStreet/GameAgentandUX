// 메인 애플리케이션 클래스
class MafiaGameApp {
    constructor() {
        console.log('JavaScript 파일이 로드되었습니다!');
        
        // 모듈들 초기화
        this.apiClient = new APIClient();
        this.gameManager = new GameManager(this.apiClient);
        this.chatManager = new ChatManager();
        this.uiController = new UIController();
        this.eventHandler = new EventHandler(this.gameManager, this.uiController, this.chatManager);
        
        // 서버 연결 확인
        this.eventHandler.checkServerConnection();
        
        console.log('MafiaGameApp 인스턴스 생성 완료:', this);
    }
}

// DOM 로드 완료 후 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM이 로드되었습니다! MafiaGameApp 인스턴스를 생성합니다.');
    const app = new MafiaGameApp();
    console.log('MafiaGameApp 인스턴스 생성 완료:', app);
});
