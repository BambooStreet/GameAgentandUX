# Multi-AI Chat Interface

A responsive web interface for interacting with 4 different AI assistants simultaneously.

## Features

- **4 AI Recognition**: Each AI (AI1-AI4) has distinct colors and identities
- **Unified Chat View**: See all conversations in one stream
- **Individual Filtering**: View messages from specific AIs only
- **Tabbed Interface**: Switch between "All Messages" and individual AI views
- **Toggle Controls**: Show/hide messages from each AI with checkboxes
- **Message Routing**: Send messages to all AIs or specific ones
- **Responsive Design**: Works on desktop and mobile devices

## File Structure

```
ai-chat-ui/
├── index.html          # Main HTML structure
├── css/
│   └── style.css      # Styling with AI color coding
├── js/
│   └── chat.js        # Chat functionality and filtering
└── README.md          # This file
```

## Color Scheme

- **AI1**: Blue (#3498db)
- **AI2**: Green (#2ecc71)
- **AI3**: Orange (#f39c12)
- **AI4**: Red (#e74c3c)
- **User**: Purple (#9b59b6)

## Usage

1. Open `index.html` in a web browser
2. Type messages in the input field at the bottom
3. Select target AI from the dropdown (or "All AIs")
4. Use tabs to filter view by AI
5. Use checkboxes to toggle visibility of each AI's messages

## Features in Detail

### Message Filtering
- **All Messages**: Shows complete conversation thread
- **AI-specific tabs**: Shows only selected AI's messages + user messages
- **Toggle controls**: Independent show/hide for each AI

### Simulated AI Responses
- Each AI has a distinct personality:
  - AI1: Analytical and data-focused
  - AI2: Helpful and supportive
  - AI3: Creative and innovative
  - AI4: Technical and implementation-focused

### Utility Functions
Available in browser console:
- `testUtils.addTestMessage(sender, content)` - Add test messages
- `testUtils.clearChat()` - Clear all messages
- `testUtils.exportChat('json'|'text')` - Export chat history

## Customization

- Modify CSS variables in `:root` to change AI colors
- Update `generateAIResponse()` in chat.js to change AI personalities
- Add more AIs by extending the HTML structure and JavaScript arrays