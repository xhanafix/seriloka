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
    const DEFAULT_MODEL = 'google/gemini-2.0-flash-exp:free';
    const MODEL_KEY = 'seriloka_model';
    const LOCAL_STORAGE_KEY = 'seriloka_api_key';
    const CHAT_HISTORY_KEY = 'seriloka_chat_history';
    
    // Application state
    let apiKey = localStorage.getItem(LOCAL_STORAGE_KEY) || '';
    let selectedModel = localStorage.getItem(MODEL_KEY) || DEFAULT_MODEL;
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

The user can switch between different AI models. When they do, you should adapt your approach:
- If the model is Google Gemini 2.0 Flash, focus on fast, concise business advice
- If the model is Google LearnLM 1.5 Pro, incorporate more educational elements in your responses

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
            content,
            model: selectedModel // Store the model used for this message
        };
    }
    
    // Display chat history in the UI
    function displayChatHistory() {
        messagesContainer.innerHTML = '';
        chatHistory.forEach(entry => {
            if (entry.role === 'user') {
                addUserMessage(entry.content, false);
            } else if (entry.role === 'assistant') {
                // Use the model that was used for this message if available
                const messageModel = entry.model || selectedModel;
                const modelIcon = getModelIcon(messageModel);
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'flex items-start';
                messageDiv.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                        <i class="fas fa-robot text-indigo-600"></i>
                    </div>
                    <div class="bg-gray-100 rounded-lg py-2 px-4 max-w-[80%]">
                        <div class="flex items-center text-xs text-gray-500 mb-1">
                            <i class="${modelIcon} mr-1"></i> ${getModelDisplayName(messageModel)}
                        </div>
                        <p>${formatMessage(entry.content)}</p>
                        <small class="block text-gray-500 text-right mt-1">${formatTime(new Date(entry.timestamp))}</small>
                        ${entry.potentiallyOutdated ? `<div class="outdated-warning text-amber-600 text-xs mt-1 italic">
                            <i class="fas fa-exclamation-triangle mr-1"></i> This response may be outdated due to an edited message
                        </div>` : ''}
                    </div>
                `;
                messagesContainer.appendChild(messageDiv);
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
            
            // Set the selected model in the dropdown
            const modelSelect = document.getElementById('model-select');
            if (modelSelect && selectedModel) {
                modelSelect.value = selectedModel;
            }
            
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
            <div class="bg-indigo-500 text-white rounded-lg py-2 px-4 max-w-[80%] relative group">
                <p>${formatMessage(text)}</p>
                ${saveToHistory ? `<small class="block text-indigo-200 text-right mt-1">${formatTime(new Date())}</small>` : ''}
                ${saveToHistory ? `<button class="edit-message-btn absolute top-2 right-2 text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-edit text-xs"></i>
                </button>` : ''}
            </div>
        `;
        messagesContainer.appendChild(messageDiv);
        
        if (saveToHistory) {
            const historyEntry = createHistoryEntry('user', text);
            chatHistory.push(historyEntry);
            
            // Add message ID attribute to the message div for editing
            messageDiv.setAttribute('data-message-id', historyEntry.timestamp);
            
            // Add click event for edit button
            const editBtn = messageDiv.querySelector('.edit-message-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    openEditModal(historyEntry.timestamp, text);
                });
            }
            
            saveChatHistory();
        }
        
        scrollToBottom();
    }
    
    // Add a bot message to the chat
    function addBotMessage(text, saveToHistory = true) {
        // Filter out any search-like text that the AI might generate
        const filteredText = text.replace(/\[(SEARCHING|SEARCHING THE WEB|RE-INITIATING WEB SEARCH|SEARCHING DATABASES).*?\]/gi, '');
        
        // Get model icon based on current model
        const modelIcon = getModelIcon(selectedModel);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start';
        messageDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center mr-3">
                <i class="fas fa-robot text-indigo-600"></i>
            </div>
            <div class="bg-gray-100 rounded-lg py-2 px-4 max-w-[80%]">
                <div class="flex items-center text-xs text-gray-500 mb-1">
                    <i class="${modelIcon} mr-1"></i> ${getModelDisplayName(selectedModel)}
                </div>
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
    
    // Get appropriate icon for model
    function getModelIcon(modelId) {
        const iconMap = {
            'google/gemini-2.0-flash-exp:free': 'fas fa-bolt',
            'google/learnlm-1.5-pro-experimental:free': 'fas fa-graduation-cap'
        };
        return iconMap[modelId] || 'fas fa-robot';
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
                    model: selectedModel,
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
        
        try {
            // Create messages array for API call
            // Always include the system message
            const messages = [systemMessage];
            
            // Check if any messages were edited
            let hasEditedMessages = false;
            for (const entry of chatHistory) {
                if (entry.role === 'assistant' && entry.potentiallyOutdated) {
                    hasEditedMessages = true;
                    break;
                }
            }
            
            // Add all messages from chat history
            chatHistory.forEach(entry => {
                if (entry.role === 'user' || entry.role === 'assistant') {
                    messages.push({
                        role: entry.role,
                        content: entry.content
                    });
                } else if (entry.role === 'search' && entry.searchResults) {
                    // Add search results as a system message
                    messages.push({
                        role: 'system',
                        content: `Web search results for "${entry.content}":\n${entry.searchResults}`
                    });
                }
            });
            
            // If there were edited messages, add a system message to inform the AI
            if (hasEditedMessages) {
                messages.push({
                    role: "system",
                    content: "Note: The user has edited one of their previous messages. Please consider the entire conversation context as it is presented now, not as it may have been previously."
                });
            }
            
            // Check for search queries
            if (isSearching) {
                const searchQueries = extractSearchQueries(userMessage);
                if (searchQueries.length > 0) {
                    try {
                        for (const query of searchQueries) {
                            const cleanQuery = cleanSearchQuery(query);
                            
                            // Show searching indicator
                            showSearchingIndicator();
                            
                            // Perform the search
                            const searchResults = await performWebSearch(cleanQuery);
                            
                            // Display search results in chat
                            displaySearchResults(searchResults, cleanQuery);
                            
                            // Add search results to messages for context
                            messages.push({
                                role: 'system',
                                content: `Web search results for "${cleanQuery}":\n${searchResults.join('\n')}`
                            });
                            
                            // Store search in chat history
                            const searchEntry = createHistoryEntry('search', cleanQuery);
                            searchEntry.searchResults = searchResults.join('\n');
                            chatHistory.push(searchEntry);
                            saveChatHistory();
                        }
                    } catch (error) {
                        console.error("Search error:", error);
                        addSystemMessage("Could not complete web search. Continuing without search results.");
                    }
                }
            }
            
            // Fetch and display response
            const botResponse = await fetchAssistantResponse(messages);
            addBotMessage(botResponse, true);
        } catch (error) {
            console.error("Error:", error);
            addBotMessage("Sorry, I encountered an error. Please try again later.", true);
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
    
    // Add event listener for model selection
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            selectedModel = modelSelect.value;
            localStorage.setItem(MODEL_KEY, selectedModel);
            
            // Update the footer to show the selected model
            updateModelDisplay();
            
            // Inform the user about the model change
            addSystemMessage(`Model changed to ${getModelDisplayName(selectedModel)}`);
        });
    }
    
    // Function to get user-friendly model name
    function getModelDisplayName(modelId) {
        const modelMap = {
            'google/gemini-2.0-flash-exp:free': 'Google Gemini 2.0 Flash',
            'google/learnlm-1.5-pro-experimental:free': 'Google LearnLM 1.5 Pro'
        };
        return modelMap[modelId] || modelId;
    }
    
    // Update the footer to display the current model
    function updateModelDisplay() {
        const modelDisplay = document.getElementById('model-display');
        if (modelDisplay) {
            modelDisplay.textContent = getModelDisplayName(selectedModel);
        }
    }
    
    // Initialize the chat
    initChat();
    
    // Set initial model display
    updateModelDisplay();
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

// Create and open edit modal
function openEditModal(messageId, text) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    // Create modal content
    modalOverlay.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Edit Message</h3>
            <textarea id="edit-text" class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4" rows="4">${text}</textarea>
            <div class="flex justify-end space-x-3">
                <button id="cancel-edit" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                <button id="save-edit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalOverlay);
    
    // Focus on textarea
    const textarea = document.getElementById('edit-text');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // Handle cancel button
    document.getElementById('cancel-edit').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Handle save button
    document.getElementById('save-edit').addEventListener('click', () => {
        const newText = textarea.value.trim();
        if (newText) {
            updateMessage(messageId, newText);
        }
        document.body.removeChild(modalOverlay);
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function escapeListener(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modalOverlay);
            document.removeEventListener('keydown', escapeListener);
        }
    });
}

// Update message in UI and chat history
function updateMessage(messageId, newText) {
    // Update the message in chat history
    const messageIndex = chatHistory.findIndex(msg => msg.timestamp === messageId);
    
    if (messageIndex !== -1) {
        // Update in chat history
        chatHistory[messageIndex].content = newText;
        saveChatHistory();
        
        // Update in UI
        const messageDiv = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageDiv) {
            const messageParagraph = messageDiv.querySelector('p');
            messageParagraph.innerHTML = formatMessage(newText);
        }
        
        // Add system message about the edit
        addSystemMessage("Message edited. Type a new message to continue the conversation with the updated context.");
        
        // Mark messages after this one as potentially outdated
        markMessagesAsOutdated(messageIndex);
    }
}

// Mark assistant messages after an edited message as potentially outdated
function markMessagesAsOutdated(editedIndex) {
    // Find all assistant messages that come after the edited message
    for (let i = editedIndex + 1; i < chatHistory.length; i++) {
        if (chatHistory[i].role === 'assistant') {
            // Mark this message as potentially outdated
            chatHistory[i].potentiallyOutdated = true;
            
            // Update UI to show this message as outdated
            const messageElements = Array.from(messagesContainer.querySelectorAll('.flex.items-start'));
            // Find the right message element (we need to count only assistant messages)
            let assistantMessageCount = 0;
            let targetElement = null;
            
            for (const el of messageElements) {
                if (!el.classList.contains('search-result') && !el.querySelector('.bg-gray-100')) {
                    assistantMessageCount++;
                    if (assistantMessageCount > editedIndex) {
                        targetElement = el;
                        break;
                    }
                }
            }
            
            if (targetElement) {
                const messageDiv = targetElement.querySelector('div:nth-child(2)');
                if (messageDiv && !messageDiv.querySelector('.outdated-warning')) {
                    const warningDiv = document.createElement('div');
                    warningDiv.className = 'outdated-warning text-amber-600 text-xs mt-1 italic';
                    warningDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> This response may be outdated due to an edited message';
                    messageDiv.appendChild(warningDiv);
                }
            }
        }
    }
    
    saveChatHistory();
}

// Add system message to the chat
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex justify-center my-2';
    messageDiv.innerHTML = `
        <div class="bg-gray-100 text-gray-600 rounded-lg py-1 px-3 text-xs">
            <i class="fas fa-info-circle mr-1"></i> ${text}
        </div>
    `;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
} 