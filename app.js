document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const messagesContainer = document.getElementById('messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const apiKeyInput = document.getElementById('api-key');
    const saveKeyButton = document.getElementById('save-key');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Constants
    const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    const MODEL = 'google/gemini-2.0-flash-exp:free';
    const LOCAL_STORAGE_KEY = 'seriloka_api_key';
    const CHAT_HISTORY_KEY = 'seriloka_chat_history';
    
    // Application state
    let apiKey = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    let chatHistory = loadChatHistory();
    let isSearching = false;
    let searchingIndicator = null;
    
    // System message that defines the assistant's personality and capabilities
    const systemMessage = {
        role: "system",
        content: `You are Hanafi, a Virtual CEO Assistant for Seriloka, a Malaysian interior design startup.

Seriloka's products include:
- Room perfumes with local Malaysian scents
- Modular kitchen cabinets ("kabinet cantum sendiri")
- Wall upgrade trims and accessories

Your responsibilities are to provide:
- Strategic business advice
- Marketing ideas and campaigns
- Standard Operating Procedures (SOPs)
- Content planning and social media strategies
- General business guidance as a Chief of Staff would

You should be sharp, strategic, and business-oriented in your responses.
You should be able to communicate in both English and Bahasa Malaysia fluently.
You should always respond in the same language that the user uses to communicate with you.

IMPORTANT: Do not simulate or mention web searches in your responses. When you need real-time information, I will provide it to you through a system message. Never write phrases like "[SEARCHING THE WEB...]", "Let me search for that", or similar statements. Just give your answer based on the information provided to you.

For every first message in a session, you should ask: "Apa yang you nak saya bantu hari ini untuk majukan Seriloka?"`
    };
    
    // Load chat history from localStorage
    function loadChatHistory() {
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        return savedHistory ? JSON.parse(savedHistory) : [];
    }
    
    // Save chat history to localStorage
    function saveChatHistory() {
        // Only keep the most recent 50 messages to prevent localStorage from getting too full
        const trimmedHistory = chatHistory.slice(-50);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmedHistory));
    }
    
    // Create a history entry with timestamp
    function createHistoryEntry(role, content) {
        return {
            timestamp: new Date().toISOString(),
            role,
            content
        };
    }
    
    // Display chat history in the UI
    function displayChatHistory() {
        messagesContainer.innerHTML = '';
        chatHistory.forEach(entry => {
            if (entry.role === 'user') {
                addUserMessage(entry.content, false);
            } else if (entry.role === 'assistant') {
                addBotMessage(entry.content, false);
            } else if (entry.role === 'search') {
                // Reconstruct search result display if it exists in history
                // This is a simplified version - in production you would store more details
                const searchDiv = document.createElement('div');
                searchDiv.className = 'flex items-start search-result';
                searchDiv.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                        <i class="fas fa-search text-indigo-600"></i>
                    </div>
                    <div class="bg-white border border-gray-200 rounded-lg py-2 px-4 max-w-[90%] shadow-sm">
                        <p class="font-bold text-gray-700 border-b border-gray-200 pb-2">
                            <i class="fas fa-search-plus mr-2 text-blue-500"></i>${entry.content}
                        </p>
                        <p class="text-sm text-gray-600 mt-1">Search results displayed</p>
                        <small class="block text-gray-500 text-right mt-2">${formatTime(new Date(entry.timestamp))}</small>
                    </div>
                `;
                messagesContainer.appendChild(searchDiv);
            }
        });
    }
    
    // Initialize the chat with a welcome message
    function initChat() {
        if (apiKey) {
            apiKeyInput.value = '********';
            
            if (chatHistory.length > 0) {
                displayChatHistory();
                scrollToBottom();
            } else {
                sendFirstMessage();
            }
        } else {
            // Show API key instruction message if no key is saved
            addBotMessage("Please enter your OpenRouter API key to begin.", false);
        }
        
        // Add history toggle button to the interface
        addHistoryToggle();
        
        // Add web search toggle
        addWebSearchToggle();
    }
    
    // Add a history toggle button to the interface
    function addHistoryToggle() {
        const historyToggleDiv = document.createElement('div');
        historyToggleDiv.className = 'mt-4 flex justify-between items-center';
        historyToggleDiv.innerHTML = `
            <button id="clear-history" class="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-colors text-sm">
                <i class="fas fa-trash mr-1"></i> Clear History
            </button>
            <button id="export-history" class="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors text-sm">
                <i class="fas fa-download mr-1"></i> Export History
            </button>
        `;
        
        const apiKeyContainer = document.querySelector('.mt-4');
        apiKeyContainer.parentNode.insertBefore(historyToggleDiv, apiKeyContainer.nextSibling);
        
        // Event listeners for history buttons
        document.getElementById('clear-history').addEventListener('click', clearHistory);
        document.getElementById('export-history').addEventListener('click', exportHistory);
    }
    
    // Add web search toggle to the interface
    function addWebSearchToggle() {
        const searchToggleDiv = document.createElement('div');
        searchToggleDiv.className = 'mt-2 flex items-center';
        searchToggleDiv.innerHTML = `
            <label class="inline-flex items-center cursor-pointer mr-2">
                <input type="checkbox" id="search-toggle" class="sr-only peer">
                <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span class="ms-3 text-sm font-medium text-gray-900">Enable Web Search</span>
            </label>
            <div class="text-gray-600 text-xs flex-grow">
                <i class="fas fa-info-circle"></i> When enabled, Hanafi will search Wikipedia for real-time data
            </div>
        `;
        
        const historyToggleDiv = document.querySelector('.mt-4.flex.justify-between');
        historyToggleDiv.parentNode.insertBefore(searchToggleDiv, historyToggleDiv.nextSibling);
        
        // Add event listener for search toggle
        const searchToggle = document.getElementById('search-toggle');
        
        searchToggle.addEventListener('change', function() {
            isSearching = this.checked;
            
            if (isSearching) {
                addBotMessage("Web search is now enabled. I'll look up information from Wikipedia when needed.", true);
            } else {
                addBotMessage("Web search is now disabled. I'll rely on my existing knowledge.", true);
            }
        });
    }
    
    // Clear chat history
    function clearHistory() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            chatHistory = [];
            localStorage.removeItem(CHAT_HISTORY_KEY);
            messagesContainer.innerHTML = '';
            sendFirstMessage();
        }
    }
    
    // Export chat history as JSON file
    function exportHistory() {
        const historyData = JSON.stringify(chatHistory, null, 2);
        const blob = new Blob([historyData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `seriloka-chat-history-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Send the first message from the assistant
    function sendFirstMessage() {
        typingIndicator.classList.remove('hidden');
        scrollToBottom();
        
        const messages = [systemMessage];
        
        fetchAssistantResponse(messages)
            .then(response => {
                addBotMessage(response, true);
                typingIndicator.classList.add('hidden');
            })
            .catch(error => {
                console.error("Error:", error);
                addBotMessage("Sorry, I encountered an error. Please try again later.", true);
                typingIndicator.classList.add('hidden');
            });
    }
    
    // Add a user message to the chat
    function addUserMessage(text, saveToHistory = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex justify-end';
        messageDiv.innerHTML = `
            <div class="bg-indigo-500 text-white rounded-lg py-2 px-4 max-w-[80%]">
                <p>${formatMessage(text)}</p>
                ${saveToHistory ? `<small class="block text-indigo-200 text-right mt-1">${formatTime(new Date())}</small>` : ''}
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        
        if (saveToHistory) {
            chatHistory.push(createHistoryEntry('user', text));
            saveChatHistory();
        }
        
        scrollToBottom();
    }
    
    // Add a bot message to the chat
    function addBotMessage(text, saveToHistory = true) {
        // Filter out any search-like text that the AI might generate
        const filteredText = text.replace(/\[(SEARCHING|SEARCHING THE WEB|RE-INITIATING WEB SEARCH|SEARCHING DATABASES).*?\]/gi, '');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                <i class="fas fa-robot text-indigo-600"></i>
            </div>
            <div class="bg-gray-100 rounded-lg py-2 px-4 max-w-[80%]">
                <p>${formatMessage(filteredText)}</p>
                ${saveToHistory ? `<small class="block text-gray-500 text-right mt-1">${formatTime(new Date())}</small>` : ''}
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        
        if (saveToHistory) {
            chatHistory.push(createHistoryEntry('assistant', filteredText));
            saveChatHistory();
        }
        
        scrollToBottom();
    }
    
    // Show searching indicator
    function showSearchingIndicator() {
        // Create searching indicator message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start searching-indicator';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                <i class="fas fa-robot text-indigo-600"></i>
            </div>
            <div class="bg-blue-100 rounded-lg py-2 px-4 max-w-[80%] border-l-4 border-blue-500">
                <p class="flex items-center text-blue-800">
                    <i class="fas fa-search mr-2"></i>
                    <span class="font-bold">SEARCHING WIKIPEDIA</span>
                    <span class="typing-indicator ml-1"></span>
                </p>
                <div class="mt-2 text-sm text-blue-700">
                    <p>Looking for information about your query.</p>
                    <p class="mt-1">This may take a moment.</p>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        
        return messageDiv;
    }
    
    // Show search results to user
    function displaySearchResults(results, query) {
        if (!results || results.length === 0) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start search-result';
        
        let resultsHTML = '';
        results.forEach((result, index) => {
            resultsHTML += `
                <div class="mt-2 border-b border-gray-200 pb-2 ${index === 0 ? '' : 'pt-2'}">
                    <a href="${result.link}" target="_blank" class="font-medium text-blue-600 hover:underline">${result.title}</a>
                    <p class="text-sm text-gray-600 mt-1">${result.snippet}</p>
                </div>
            `;
        });
        
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                <i class="fas fa-search text-indigo-600"></i>
            </div>
            <div class="bg-white border border-gray-200 rounded-lg py-2 px-4 max-w-[90%] shadow-sm">
                <p class="font-bold text-gray-700 border-b border-gray-200 pb-2">
                    <i class="fas fa-search-plus mr-2 text-blue-500"></i>Search Results for: "${query}"
                </p>
                ${resultsHTML}
                <small class="block text-gray-500 text-right mt-2">${formatTime(new Date())}</small>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
        
        // Add to chat history (but marked as a special type)
        const historyEntry = {
            timestamp: new Date().toISOString(),
            role: 'search',
            content: `Search results for: "${query}"`
        };
        chatHistory.push(historyEntry);
        saveChatHistory();
        
        return messageDiv;
    }
    
    // Format time for display
    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Format message with line breaks
    function formatMessage(text) {
        return text.replace(/\n/g, '<br>');
    }
    
    // Scroll to the bottom of the chat container
    function scrollToBottom() {
        const chatBox = document.getElementById('chat-box');
        chatBox.scrollTop = chatBox.scrollHeight;
    }
    
    // Clean user query to make it more search-friendly
    function cleanSearchQuery(query) {
        // Remove common question intros
        let cleaned = query.replace(/^(what is|what are|who is|how to|can you tell me about|tell me about|search for|look up|find|what's)/i, '').trim();
        
        // Remove common question language
        cleaned = cleaned.replace(/\?(\.|\s)*$/g, '').trim();
        
        // Add context for Malaysian searches if not present
        if (!/malaysia|malaysian/i.test(cleaned) && 
            /trends|trending|current|latest|popular/i.test(cleaned)) {
            cleaned += ' in Malaysia';
        }
        
        return cleaned || query; // Return original if we've removed too much
    }
    
    // Extract search queries from user message and determine if this is a search-worthy query
    function extractSearchQueries(text) {
        // List of keywords that indicate need for up-to-date information
        const timeKeywords = [
            'current', 'latest', 'recent', 'new', 'update', 'trend', 'trending',
            'today', 'this week', 'this month', 'this year', 'now'
        ];
        
        // List of search topics that would benefit from real-time data
        const topicKeywords = [
            'market', 'price', 'statistic', 'news', 'event', 'development',
            'data', 'report', 'study', 'analysis', 'popular', 'insights'
        ];
        
        // Check if message contains time-sensitive keywords
        const hasTimeKeyword = timeKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Check if message contains topic keywords
        const hasTopicKeyword = topicKeywords.some(keyword => 
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Determine if this is a direct search request
        const isDirectSearchRequest = /find|search|look up|tell me about|what is|what are/.test(text.toLowerCase());
        
        // If the message has a time keyword AND (a topic keyword OR is a direct search request)
        if (hasTimeKeyword && (hasTopicKeyword || isDirectSearchRequest)) {
            return [text];
        }
        
        // If it's a very clear search request even without time keywords
        if (isDirectSearchRequest && text.length < 150) {
            return [text];
        }
        
        return [];
    }
    
    // Fetch response from the OpenRouter API
    async function fetchAssistantResponse(messages) {
        try {
            // Check if web search is enabled and the latest message is from user
            if (isSearching && messages.length > 1 && messages[messages.length - 1].role === 'user') {
                const userMessage = messages[messages.length - 1].content;
                const searchQueries = extractSearchQueries(userMessage);
                
                // If there are search queries, perform web search
                if (searchQueries.length > 0) {
                    // Show searching indicator
                    searchingIndicator = showSearchingIndicator();
                    
                    // Perform web search for each query
                    const searchResults = [];
                    let primaryQuery = cleanSearchQuery(searchQueries[0]);
                    
                    try {
                        const results = await performWebSearch(primaryQuery);
                        if (results && results.length > 0) {
                            searchResults.push(...results);
                        } else {
                            // Try a more general search if the first one failed
                            const generalResults = await performWebSearch(primaryQuery + " general information");
                            if (generalResults && generalResults.length > 0) {
                                searchResults.push(...generalResults);
                            }
                        }
                    } catch (error) {
                        console.error("Search error:", error);
                    }
                    
                    // Remove searching indicator
                    if (searchingIndicator) {
                        messagesContainer.removeChild(searchingIndicator);
                        searchingIndicator = null;
                    }
                    
                    // Display search results to the user and add to context
                    if (searchResults.length > 0) {
                        displaySearchResults(searchResults, primaryQuery);
                        
                        // Format the search results for the AI
                        const formattedResults = searchResults.map((result, index) => 
                            `Source ${index + 1}: ${result.title}\n${result.snippet}\nURL: ${result.link}`
                        ).join('\n\n');
                        
                        // Add search results to the context as a system message
                        messages.splice(messages.length - 1, 0, {
                            role: 'system',
                            content: `Here is information I found about "${primaryQuery}":\n\n${formattedResults}\n\nPlease use this information to provide a helpful response without mentioning that I performed this search for you. Do not refer to "search results" or "[SEARCHING]" in your response.`
                        });
                    } else {
                        // No results found - add a system message to inform the AI
                        messages.splice(messages.length - 1, 0, {
                            role: 'system',
                            content: `I attempted to search for information about "${primaryQuery}" but couldn't find relevant results. Please answer based on your existing knowledge, but do not mention that a search was attempted. Never include "[SEARCHING]" or similar phrases in your response.`
                        });
                        
                        // Add a message to the user
                        const noResultsDiv = document.createElement('div');
                        noResultsDiv.className = 'flex items-start search-result';
                        noResultsDiv.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                                <i class="fas fa-search text-indigo-600"></i>
                            </div>
                            <div class="bg-white border border-gray-200 rounded-lg py-2 px-4 max-w-[90%] shadow-sm">
                                <p class="font-bold text-gray-700 border-b border-gray-200 pb-2">
                                    <i class="fas fa-search-plus mr-2 text-blue-500"></i>Search Results
                                </p>
                                <p class="text-sm text-gray-600 mt-2">No relevant results found for: "${primaryQuery}"</p>
                                <small class="block text-gray-500 text-right mt-2">${formatTime(new Date())}</small>
                            </div>
                        `;
                        messagesContainer.appendChild(noResultsDiv);
                        scrollToBottom();
                        
                        // Add to chat history
                        chatHistory.push({
                            timestamp: new Date().toISOString(),
                            role: 'search',
                            content: `No results found for: "${primaryQuery}"`
                        });
                        saveChatHistory();
                    }
                }
            }
            
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Seriloka CEO Assistant - Hanafi'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: messages,
                    max_tokens: 1000
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }
            
            const data = await response.json();
            let content = data.choices[0].message.content;
            
            // Filter out any search simulation text that the model might generate
            content = content.replace(/\[(SEARCHING|SEARCHING THE WEB|RE-INITIATING WEB SEARCH|SEARCHING DATABASES).*?\]/gi, '');
            
            return content;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }
    
    // Handle sending a message
    async function sendMessage() {
        const userMessage = userInput.value.trim();
        
        if (!userMessage) return;
        if (!apiKey) {
            addBotMessage("Please enter your OpenRouter API key first.", true);
            return;
        }
        
        // Clear input
        userInput.value = '';
        
        // Add user message to chat
        addUserMessage(userMessage, true);
        
        // Show typing indicator
        typingIndicator.classList.remove('hidden');
        scrollToBottom();
        
        // Prepare messages array with system message and conversation history
        const messages = [systemMessage];
        
        // Add all visible messages from the chat (skip the first bot message if it's the API key instruction)
        const messageElements = messagesContainer.querySelectorAll('div.flex');
        let isFirstMessage = true;
        
        for (const element of messageElements) {
            if (isFirstMessage && element.classList.contains('items-start')) {
                const text = element.querySelector('p').textContent;
                if (text === "Please enter your OpenRouter API key to begin.") {
                    isFirstMessage = false;
                    continue;
                }
            }
            
            // Skip search indicators and results (they're already added as system messages)
            if (element.classList.contains('searching-indicator') || 
                element.classList.contains('search-result')) {
                continue;
            }
            
            const role = element.classList.contains('justify-end') ? 'user' : 'assistant';
            const textElement = element.querySelector('p');
            if (textElement) {
                const content = textElement.textContent;
                messages.push({ role, content });
            }
            isFirstMessage = false;
        }
        
        // Add the current user message
        messages.push({ role: 'user', content: userMessage });
        
        // Fetch and display response
        try {
            const botResponse = await fetchAssistantResponse(messages);
            addBotMessage(botResponse, true);
        } catch (error) {
            addBotMessage("Sorry, I encountered an error. Please check your API key or try again later.", true);
        } finally {
            typingIndicator.classList.add('hidden');
            scrollToBottom();
        }
    }
    
    // Event Listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    saveKeyButton.addEventListener('click', () => {
        const newApiKey = apiKeyInput.value.trim();
        if (newApiKey && newApiKey !== '********') {
            apiKey = newApiKey;
            localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
            apiKeyInput.value = '********';
            
            // Only clear messages if there's no history
            if (chatHistory.length === 0) {
                messagesContainer.innerHTML = '';
                sendFirstMessage();
            }
        }
    });
    
    // Initialize the chat
    initChat();
});

// Perform web search using Wikipedia API (free, no key required)
async function performWebSearch(query) {
    try {
        // Clean the query for better search results
        const cleanedQuery = cleanSearchQuery(query);
        
        // Use Wikipedia API as a free alternative
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=5&format=json&origin=*&srsearch=${encodeURIComponent(cleanedQuery)}`;
        
        const response = await fetch(wikiUrl);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }
        
        const data = await response.json();
        
        // Extract relevant information from wiki search results
        let searchResults = [];
        
        if (data.query && data.query.search && data.query.search.length > 0) {
            searchResults = data.query.search.map(result => {
                // Remove HTML tags from snippet
                const cleanSnippet = result.snippet.replace(/<\/?[^>]+(>|$)/g, "");
                
                return {
                    title: result.title,
                    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
                    snippet: cleanSnippet || 'No description available'
                };
            });
        }
        
        return searchResults;
    } catch (error) {
        console.error('Web search error:', error);
        return [];
    }
} 