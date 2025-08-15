class DockerAIChatInterface {
    constructor() {
        this.conversations = this.loadConversations();
        this.currentConversationId = null;
        this.apiEndpoint = 'https://82hvb369-12434.usw3.devtunnels.ms';
        this.selectedModel = 'ai/gemma3';
        this.isGenerating = false;
        this.currentStreamController = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.renderConversationHistory();
        this.initializeMarked();
    }

    initializeMarked() {
        // Configurar marked con un renderer personalizado que post-procesa el HTML
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof code !== 'string') {
                    code = String(code || '');
                }
                
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        console.warn('Error highlighting code:', e);
                        return hljs.highlightAuto(code).value;
                    }
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
    }

    // Post-procesar HTML para convertir bloques de código en componentes interactivos
    postProcessCodeBlocks(html) {
        // Crear un contenedor temporal para manipular el DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Encontrar todos los bloques de código
        const codeBlocks = tempDiv.querySelectorAll('pre code');
        
        codeBlocks.forEach((codeElement, index) => {
            const preElement = codeElement.parentElement;
            
            // Extraer el código y el lenguaje
            let codeContent = codeElement.textContent || codeElement.innerText || '';
            let language = 'text';
            
            // Intentar detectar el lenguaje desde la clase
            const classNames = codeElement.className || '';
            const langMatch = classNames.match(/language-(\w+)/);
            if (langMatch) {
                language = langMatch[1];
            }
            
            // Crear ID único para este bloque
            const codeId = 'code-' + Math.random().toString(36).substr(2, 9);
            
            // Determinar si es código largo
            const lines = codeContent.split('\n');
            const isLongCode = lines.length > 10;
            const collapsedClass = isLongCode ? 'collapsed' : 'expanded';
            
            // Escapar el código para diferentes contextos
            const escapedForAttribute = this.escapeForAttribute(codeContent);
            const escapedForDisplay = this.escapeHtml(codeContent);
            
            // Crear el HTML del bloque de código interactivo
            const interactiveCodeBlock = `
                <div class="code-block-container" data-language="${language}">
                    <div class="code-block-header">
                        <span class="code-language">${language}</span>
                        <div class="code-actions">
                            <button class="code-action-btn copy-btn" data-code-id="${codeId}" title="Copiar código">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                </svg>
                                Copiar
                            </button>
                            ${isLongCode ? `
                                <button class="code-action-btn expand-btn" data-target="${codeId}" title="Expandir código">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                                    </svg>
                                    Expandir
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="code-content ${collapsedClass}" id="${codeId}">
                        <pre><code class="language-${language}" data-raw-code="${escapedForAttribute}">${codeElement.innerHTML}</code></pre>
                        ${isLongCode ? '<div class="code-gradient"></div>' : ''}
                        ${isLongCode ? `
                            <button class="expand-button" onclick="expandCode('${codeId}')">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                                Ver código completo
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Reemplazar el bloque original con el interactivo
            const newElement = document.createElement('div');
            newElement.innerHTML = interactiveCodeBlock;
            preElement.parentNode.replaceChild(newElement.firstElementChild, preElement);
        });
        
        return tempDiv.innerHTML;
    }

    escapeHtml(text) {
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeForAttribute(text) {
        if (typeof text !== 'string') {
            text = String(text || '');
        }
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    initializeElements() {
        // Elementos principales
        this.sidebarElement = document.getElementById('sidebar');
        this.menuToggle = document.getElementById('menu-toggle');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.newChatButton = document.getElementById('new-chat');
        this.clearHistoryButton = document.getElementById('clear-history');
        this.chatHistoryElement = document.getElementById('chat-history');
        this.themeToggle = document.getElementById('theme-toggle');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.chatContainer = document.getElementById('chat-container');
        this.copyNotification = document.getElementById('copy-notification');
    }

    bindEvents() {
        // Eventos del sidebar móvil
        this.menuToggle?.addEventListener('click', () => this.toggleSidebar());
        this.sidebarOverlay?.addEventListener('click', () => this.closeSidebar());

        // Eventos del chat
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.messageInput.addEventListener('input', () => this.handleInputChange());

        // Eventos de navegación
        this.newChatButton.addEventListener('click', () => this.startNewChat());
        this.clearHistoryButton.addEventListener('click', () => this.clearAllHistory());

        // Eventos de configuración
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Auto-resize del textarea
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());

        // Event delegation para botones de código
        this.chatMessages.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                this.copyCode(e.target.closest('.copy-btn'));
            } else if (e.target.closest('.expand-btn')) {
                this.toggleCodeExpansion(e.target.closest('.expand-btn'));
            }
        });
    }

    copyCode(button) {
        try {
            const codeId = button.getAttribute('data-code-id');
            const codeElement = document.querySelector(`#${codeId} code`);
            
            if (!codeElement) {
                console.error('Code element not found');
                return;
            }
            
            // Intentar obtener el código de diferentes fuentes
            let rawCode = codeElement.getAttribute('data-raw-code');
            
            if (!rawCode) {
                // Fallback: obtener el texto del elemento
                rawCode = codeElement.textContent || codeElement.innerText || '';
            }
            
            // Decodificar entidades HTML
            const decodedCode = this.decodeHtmlEntities(rawCode);
            
            navigator.clipboard.writeText(decodedCode).then(() => {
                // Cambiar el botón temporalmente
                const originalHTML = button.innerHTML;
                button.innerHTML = `
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Copiado
                `;
                button.classList.add('copied');
                
                // Mostrar notificación
                this.showCopyNotification();
                
                // Restaurar el botón después de 2 segundos
                setTimeout(() => {
                    button.innerHTML = originalHTML;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Error al copiar:', err);
                // Fallback para navegadores que no soportan clipboard API
                this.fallbackCopyText(decodedCode);
            });
        } catch (error) {
            console.error('Error in copyCode:', error);
        }
    }

    decodeHtmlEntities(text) {
        if (typeof text !== 'string') {
            return '';
        }
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }

    fallbackCopyText(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyNotification();
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
        
        document.body.removeChild(textArea);
    }

    toggleCodeExpansion(button) {
        const targetId = button.getAttribute('data-target');
        const codeContent = document.getElementById(targetId);
        
        if (!codeContent) return;
        
        const isExpanded = codeContent.classList.contains('expanded');
        
        if (isExpanded) {
            codeContent.classList.remove('expanded');
            codeContent.classList.add('collapsed');
            button.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
                </svg>
                Expandir
            `;
        } else {
            codeContent.classList.remove('collapsed');
            codeContent.classList.add('expanded');
            button.innerHTML = `
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
                Colapsar
            `;
        }
    }

    showCopyNotification() {
        this.copyNotification.classList.add('show');
        setTimeout(() => {
            this.copyNotification.classList.remove('show');
        }, 3000);
    }

    toggleSidebar() {
        this.sidebarElement.classList.toggle('-translate-x-full');
        this.sidebarOverlay.classList.toggle('hidden');
    }

    closeSidebar() {
        this.sidebarElement.classList.add('-translate-x-full');
        this.sidebarOverlay.classList.add('hidden');
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    handleInputChange() {
        const hasContent = this.messageInput.value.trim().length > 0;
        this.sendButton.disabled = !hasContent || this.isGenerating;
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isGenerating) return;

        // Si no hay conversación activa, crear una nueva
        if (!this.currentConversationId) {
            this.startNewChat();
        }

        // Agregar mensaje del usuario
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.handleInputChange();
        this.autoResizeTextarea();

        // Crear mensaje placeholder para la respuesta de la IA
        const assistantMessageId = this.createAssistantMessagePlaceholder();

        // Mostrar indicador de carga
        this.showLoading();
        this.isGenerating = true;

        try {
            // Llamar a la API con streaming
            await this.callDockerAIAPIStream(message, assistantMessageId);
        } catch (error) {
            console.error('Error calling API:', error);
            this.updateAssistantMessage(assistantMessageId, `❌ **Error**: ${error.message}\n\nPor favor, verifica que el endpoint de la API esté correcto y que el servicio esté ejecutándose.`);
        } finally {
            this.hideLoading();
            this.isGenerating = false;
            this.handleInputChange();
            this.currentStreamController = null;
        }

        // Guardar conversación
        this.saveCurrentConversation();
        this.renderConversationHistory();
    }

    createAssistantMessagePlaceholder() {
        const conversation = this.conversations[this.currentConversationId];
        const messageId = this.generateId();
        const message = {
            id: messageId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true
        };

        conversation.messages.push(message);
        this.renderStreamingMessage(message);
        return messageId;
    }

    updateAssistantMessage(messageId, content, isComplete = true) {
        const conversation = this.conversations[this.currentConversationId];
        const message = conversation.messages.find(m => m.id === messageId);
        
        if (message) {
            // Asegurar que content sea string
            let contentString = '';
            if (typeof content === 'string') {
                contentString = content;
            } else if (content !== null && content !== undefined) {
                contentString = String(content);
            }
            
            message.content = contentString;
            message.isStreaming = !isComplete;
            
            // Actualizar el contenido en el DOM
            const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageElement) {
                const contentElement = messageElement.querySelector('.message-content');
                if (contentElement) {
                    try {
                        // Renderizar markdown de forma segura
                        let renderedContent = marked.parse(contentString);
                        
                        // Post-procesar bloques de código
                        renderedContent = this.postProcessCodeBlocks(renderedContent);
                        
                        contentElement.innerHTML = renderedContent;
                        
                        // Aplicar syntax highlighting a todos los bloques de código
                        contentElement.querySelectorAll('pre code').forEach((block) => {
                            try {
                                hljs.highlightElement(block);
                            } catch (e) {
                                console.warn('Error highlighting element:', e);
                            }
                        });
                        
                        // Scroll automático solo si estamos cerca del final
                        const container = this.chatContainer;
                        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
                        if (isAtBottom) {
                            setTimeout(() => this.scrollToBottom(), 50);
                        }
                    } catch (error) {
                        console.error('Error rendering markdown:', error);
                        // Fallback: mostrar texto plano escapado
                        contentElement.textContent = contentString;
                    }
                }
                
                // Remover indicador de streaming si está completo
                if (isComplete) {
                    const streamingIndicator = messageElement.querySelector('.streaming-indicator');
                    if (streamingIndicator) {
                        streamingIndicator.remove();
                    }
                }
            }
        }
    }

    async callDockerAIAPIStream(message, assistantMessageId) {
        const conversation = this.conversations[this.currentConversationId];
        const messages = conversation.messages
            .filter(msg => msg.role !== 'assistant' || (msg.id !== assistantMessageId && msg.content.trim() !== ''))
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));

        // Crear AbortController para poder cancelar la request
        this.currentStreamController = new AbortController();

        const response = await fetch(`https://82hvb369-12434.usw3.devtunnels.ms/engines/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'ai/gemma3',
                messages: messages,
                stream: true,
                temperature: 0.7,
                max_tokens: 2048
            }),
            signal: this.currentStreamController.signal
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error('No response body available for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                // Decodificar el chunk
                buffer += decoder.decode(value, { stream: true });
                
                // Procesar líneas completas
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Guardar línea incompleta para el siguiente chunk

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    
                    if (trimmedLine === '') continue;
                    if (trimmedLine === 'data: [DONE]') {
                        // Stream terminado
                        this.updateAssistantMessage(assistantMessageId, fullContent, true);
                        return;
                    }
                    
                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.slice(6); // Remover 'data: '
                            const data = JSON.parse(jsonStr);
                            
                            if (data.choices && data.choices[0] && data.choices[0].delta) {
                                const delta = data.choices[0].delta;
                                if (delta.content) {
                                    fullContent += delta.content;
                                    this.updateAssistantMessage(assistantMessageId, fullContent, false);
                                }
                            }
                        } catch (parseError) {
                            console.warn('Error parsing JSON chunk:', parseError, 'Line:', trimmedLine);
                            // Continuar con el siguiente chunk en lugar de fallar
                        }
                    }
                }
            }
            
            // Si llegamos aquí sin [DONE], marcar como completo
            this.updateAssistantMessage(assistantMessageId, fullContent, true);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream was aborted');
                return;
            }
            throw error;
        } finally {
            reader.releaseLock();
        }
    }

    addMessage(role, content) {
        const conversation = this.conversations[this.currentConversationId];
        
        // Asegurar que content sea string
        let contentString = '';
        if (typeof content === 'string') {
            contentString = content;
        } else if (content !== null && content !== undefined) {
            contentString = String(content);
        }
        
        const message = {
            id: this.generateId(),
            role: role,
            content: contentString,
            timestamp: new Date().toISOString()
        };

        conversation.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();

        // Actualizar título de la conversación si es el primer mensaje del usuario
        if (role === 'user' && conversation.messages.filter(m => m.role === 'user').length === 1) {
            conversation.title = contentString.length > 50 ? contentString.substring(0, 50) + '...' : contentString;
        }
    }

    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-wrapper animate-fade-in mb-6';
        messageElement.setAttribute('data-message-id', message.id);
        
        const isUser = message.role === 'user';
        const avatarBg = isUser ? 'bg-blue-600' : 'bg-green-600';
        const avatarIcon = isUser ? this.getUserIcon() : this.getAIIcon();
        const senderName = isUser ? 'Tú' : 'Gemma 3';

        // Asegurar que content sea string y renderizar apropiadamente
        let contentString = '';
        if (typeof message.content === 'string') {
            contentString = message.content;
        } else if (message.content !== null && message.content !== undefined) {
            contentString = String(message.content);
        }

        // Renderizar markdown para mensajes de la IA de forma segura
        let content;
        try {
            if (isUser) {
                content = this.escapeHtml(contentString);
            } else {
                // Renderizar markdown y post-procesar bloques de código
                let renderedContent = marked.parse(contentString);
                content = this.postProcessCodeBlocks(renderedContent);
            }
        } catch (error) {
            console.error('Error rendering message markdown:', error);
            content = this.escapeHtml(contentString);
        }

        messageElement.innerHTML = `
            <div class="flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}">
                ${!isUser ? `<div class="flex-shrink-0 w-8 h-8 ${avatarBg} rounded-full flex items-center justify-center">${avatarIcon}</div>` : ''}
                <div class="flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}">
                    <div class="${isUser ? 'max-w-2xl' : 'w-full'}">
                        <div class="flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}">
                            <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${senderName}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatTime(message.timestamp)}</span>
                        </div>
                        <div class="message-content ${isUser 
                            ? 'bg-blue-600 text-white p-3 rounded-lg' 
                            : 'bg-gray-50 dark:bg-gray-800 p-3 rounded-lg prose prose-slate dark:prose-invert max-w-none'
                        }" style="${!isUser ? 'color: inherit;' : ''}">
                            ${content}
                        </div>
                    </div>
                </div>
                ${isUser ? `<div class="flex-shrink-0 w-8 h-8 ${avatarBg} rounded-full flex items-center justify-center">${avatarIcon}</div>` : ''}
            </div>
        `;

        this.chatMessages.appendChild(messageElement);

        // Aplicar syntax highlighting a todos los bloques de código de forma segura
        messageElement.querySelectorAll('pre code').forEach((block) => {
            try {
                hljs.highlightElement(block);
            } catch (e) {
                console.warn('Error highlighting element:', e);
            }
        });
    }

    renderStreamingMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-wrapper animate-fade-in mb-6';
        messageElement.setAttribute('data-message-id', message.id);
        
        const avatarBg = 'bg-green-600';
        const avatarIcon = this.getAIIcon();
        const senderName = 'Gemma 3';

        messageElement.innerHTML = `
            <div class="flex gap-4 justify-start">
                <div class="flex-shrink-0 w-8 h-8 ${avatarBg} rounded-full flex items-center justify-center">${avatarIcon}</div>
                <div class="flex-1 max-w-3xl">
                    <div class="w-full">
                        <div class="flex items-center gap-2 mb-1 justify-start">
                            <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${senderName}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${this.formatTime(message.timestamp)}</span>
                            <div class="streaming-indicator flex items-center gap-1">
                                <div class="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                <div class="w-1 h-1 bg-green-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
                                <div class="w-1 h-1 bg-green-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
                            </div>
                        </div>
                        <div class="message-content bg-gray-50 dark:bg-gray-800 p-3 rounded-lg prose prose-slate dark:prose-invert max-w-none min-h-[2.5rem]" style="color: inherit;">
                            <span class="text-gray-500 dark:text-gray-400 text-sm italic">Escribiendo...</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }

    getUserIcon() {
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
        </svg>`;
    }

    getAIIcon() {
        return `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`;
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    showLoading() {
        this.loadingIndicator.classList.remove('hidden');
        this.sendButton.disabled = true;
    }

    hideLoading() {
        this.loadingIndicator.classList.add('hidden');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        });
    }

    startNewChat() {
        // Cancelar stream actual si existe
        if (this.currentStreamController) {
            this.currentStreamController.abort();
            this.currentStreamController = null;
        }

        this.currentConversationId = this.generateId();
        this.conversations[this.currentConversationId] = {
            id: this.currentConversationId,
            title: 'Nueva conversación',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.clearChatMessages();
        this.renderConversationHistory();
        this.saveConversations();
        this.closeSidebar();
    }

    clearChatMessages() {
        this.chatMessages.innerHTML = `
            <div class="text-center py-12">
                <div class="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.435l-3.86 1.447c-.29.109-.599-.055-.708-.345a.757.757 0 01-.07-.378l.894-3.588C4.115 15.158 3 13.687 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">¡Nueva conversación!</h2>
                <p class="text-gray-600 dark:text-gray-400 max-w-md mx-auto">¿En qué puedo ayudarte hoy?</p>
            </div>
        `;
    }

    loadConversation(conversationId) {
        // Cancelar stream actual si existe
        if (this.currentStreamController) {
            this.currentStreamController.abort();
            this.currentStreamController = null;
        }

        this.currentConversationId = conversationId;
        this.clearChatMessages();

        const conversation = this.conversations[conversationId];
        conversation.messages.forEach(message => {
            if (message.role === 'assistant' && message.isStreaming) {
                // Limpiar estado de streaming de mensajes anteriores
                message.isStreaming = false;
            }
            this.renderMessage(message);
        });
        this.scrollToBottom();
        this.closeSidebar();
    }

    renderConversationHistory() {
        const sortedConversations = Object.values(this.conversations)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        this.chatHistoryElement.innerHTML = '';

        if (sortedConversations.length === 0) {
            this.chatHistoryElement.innerHTML = `
                <div class="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    No hay conversaciones aún
                </div>
            `;
            return;
        }

        sortedConversations.forEach(conversation => {
            const isActive = conversation.id === this.currentConversationId;
            const conversationElement = document.createElement('div');
            conversationElement.className = `p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${isActive ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`;
            
            conversationElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-800 dark:text-white truncate">
                            ${conversation.title}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${this.formatDate(conversation.updatedAt)}
                        </p>
                    </div>
                    <button class="delete-conversation ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors" data-id="${conversation.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;

            conversationElement.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-conversation')) {
                    this.loadConversation(conversation.id);
                }
            });

            const deleteButton = conversationElement.querySelector('.delete-conversation');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteConversation(conversation.id);
            });

            this.chatHistoryElement.appendChild(conversationElement);
        });
    }

    deleteConversation(conversationId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta conversación?')) {
            delete this.conversations[conversationId];
            
            if (this.currentConversationId === conversationId) {
                this.currentConversationId = null;
                this.clearChatMessages();
                
                // Cancelar stream si está activo
                if (this.currentStreamController) {
                    this.currentStreamController.abort();
                    this.currentStreamController = null;
                }
            }
            
            this.saveConversations();
            this.renderConversationHistory();
        }
    }

    clearAllHistory() {
        if (confirm('¿Estás seguro de que quieres eliminar todo el historial?')) {
            // Cancelar stream actual si existe
            if (this.currentStreamController) {
                this.currentStreamController.abort();
                this.currentStreamController = null;
            }

            this.conversations = {};
            this.currentConversationId = null;
            this.clearChatMessages();
            this.saveConversations();
            this.renderConversationHistory();
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Hoy';
        } else if (diffDays === 2) {
            return 'Ayer';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} días`;
        } else {
            return date.toLocaleDateString();
        }
    }

    toggleTheme() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    loadSettings() {
        // Cargar tema
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }

    saveCurrentConversation() {
        if (this.currentConversationId && this.conversations[this.currentConversationId]) {
            this.conversations[this.currentConversationId].updatedAt = new Date().toISOString();
            this.saveConversations();
        }
    }

    saveConversations() {
        localStorage.setItem('docker-ai-chat-conversations', JSON.stringify(this.conversations));
    }

    loadConversations() {
        const saved = localStorage.getItem('docker-ai-chat-conversations');
        return saved ? JSON.parse(saved) : {};
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Función global para expandir código (llamada desde el HTML)
window.expandCode = function(codeId) {
    const codeContent = document.getElementById(codeId);
    if (!codeContent) return;
    
    const expandButton = codeContent.querySelector('.expand-button');
    const gradient = codeContent.querySelector('.code-gradient');
    
    codeContent.classList.remove('collapsed');
    codeContent.classList.add('expanded');
    
    if (expandButton) expandButton.remove();
    if (gradient) gradient.remove();
    
    // Actualizar el botón de expandir en el header
    const container = codeContent.closest('.code-block-container');
    const expandBtn = container?.querySelector('.expand-btn');
    if (expandBtn) {
        expandBtn.innerHTML = `
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
            </svg>
            Colapsar
        `;
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new DockerAIChatInterface();
});
