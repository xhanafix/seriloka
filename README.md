# Seriloka CEO Virtual Assistant - Hanafi

A virtual CEO assistant chatbot (named Hanafi) for Seriloka, a Malaysian interior design startup. This assistant provides strategic business advice, marketing ideas, SOP suggestions, and content plans in both English and Bahasa Malaysia.

## Features

- Responsive chat interface built with HTML, JavaScript, and TailwindCSS
- Integration with OpenRouter API to access Google's Gemini 2.0 Flash model
- Bilingual support (English and Bahasa Malaysia)
- Message persistence within browser session
- API key storage in browser's local storage for convenience
- Mobile-friendly design
- Chat history tracking with timestamps
- Export chat history as JSON
- Clear history functionality
- **Wikipedia search capability** to provide up-to-date information (no API key required!)

## Demo

![Seriloka Hanafi Screenshot](https://i.imgur.com/example.png)
*Replace with your own screenshot*

## Setup Instructions

### 1. Get an OpenRouter API Key

1. Sign up for an account at [OpenRouter](https://openrouter.ai)
2. Generate an API key from your dashboard
3. Make sure you have credits or a subscription that allows access to the `google/gemini-2.0-flash-exp:free` model

### 2. Local Testing

To run the application locally:

1. Clone or download this repository to your computer
2. Open `index.html` in your web browser
3. Enter your OpenRouter API key when prompted
4. Turn on web search if desired (using the toggle switch)
5. Start chatting with Hanafi, your virtual CEO assistant

### 3. GitHub Pages Deployment

To deploy the website to GitHub Pages:

1. Fork this repository to your GitHub account
2. Go to the repository settings
3. Navigate to the "Pages" section
4. Select the main branch as the source
5. Click "Save"
6. GitHub will provide you with the deployment URL (typically `https://yourusername.github.io/repository-name`)

## Usage

1. Enter your OpenRouter API key when you first open the application
2. Toggle web search on/off using the switch (enabled by default)
3. Hanafi will greet you with "Apa yang you nak saya bantu hari ini untuk majukan Seriloka?"
4. Type your questions or requests in English or Bahasa Malaysia
5. Hanafi will respond in the same language you used

### Web Search Functionality

- When web search is enabled, Hanafi will automatically search Wikipedia for information on queries that contain keywords like "latest", "current", "trend", etc.
- This allows Hanafi to provide up-to-date information beyond its training data
- The search uses Wikipedia's API to fetch information (no API key required)
- You can disable web search at any time using the toggle switch
- Search results are displayed in the chat interface with clickable links

### Chat History Management

- Your chat history is automatically saved to your browser's local storage
- You can clear your chat history by clicking the "Clear History" button
- You can export your chat history as a JSON file by clicking the "Export History" button
- The chat history includes timestamps for each message

## Security Note

This application stores your OpenRouter API key in your browser's local storage. While convenient, be aware that:

- The key is only stored on your device
- It's recommended to clear your browser data if using a shared computer
- For increased security in a production environment, consider implementing a backend proxy

## Customization

You can customize the assistant's behavior by modifying the system message in `app.js`:

```javascript
const systemMessage = {
    role: "system",
    content: `Your system message here...`
};
```

You can also modify the search query detection in the `extractSearchQueries` function to customize when web searches are triggered.

## Technical Details

- **Frontend**: Pure HTML, CSS (TailwindCSS), and JavaScript
- **AI**: OpenRouter API with Google's Gemini 2.0 Flash model
- **Web Search**: Wikipedia API (free, no key required)
- **Storage**: Browser's localStorage for chat history and API key

## Troubleshooting

- If web search isn't working, make sure your browser allows cross-origin requests to Wikipedia
- If the assistant isn't responding, check that your OpenRouter API key is valid and has sufficient credits
- For issues with chat history not saving, ensure your browser has localStorage enabled

## License

This project is open-source and available for use under the MIT License.

## Credits

- Built with [TailwindCSS](https://tailwindcss.com/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Powered by [OpenRouter](https://openrouter.ai) and Google Gemini 2.0 Flash
- Web search powered by [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) 