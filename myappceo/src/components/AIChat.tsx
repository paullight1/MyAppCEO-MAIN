import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAIChat, ChatMessage } from '../hooks/useAIChat';
import { Button } from './ui';

interface AIChatProps {
  contextType: 'valuation' | 'listing' | 'pitch' | 'general';
  initialData?: Record<string, any>;
  onComplete?: (result: Record<string, any>) => void;
  onClose?: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({
  contextType,
  initialData,
  onComplete,
  onClose,
}) => {
  const {
    currentSession,
    messages,
    isLoading,
    startConversation,
    sendMessage,
    clearConversation,
  } = useAIChat();

  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStart = async () => {
    const prompt = getInitialPrompt(contextType, initialData);
    setStarted(true);
    const result = await startConversation(contextType, prompt, initialData);
    const completion = result && 'result' in result ? result.result : undefined;
    
    if (completion && onComplete) {
      onComplete(completion);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;
    
    const userInput = input.trim();
    setInput('');

    const result = await sendMessage(currentSession.id, userInput);
    
    if (result?.result && onComplete) {
      onComplete(result.result);
    }
  };

  const handleOptionSelect = async (option: string) => {
    if (!currentSession) return;
    
    setInput(option);
    const result = await sendMessage(currentSession.id, option);
    
    if (result?.result && onComplete) {
      onComplete(result.result);
    }
  };

  const handleNumberSubmit = async (num: number) => {
    if (!currentSession) return;
    
    setInput(String(num));
    const result = await sendMessage(currentSession.id, String(num));
    
    if (result?.result && onComplete) {
      onComplete(result.result);
    }
  };

  const lastMessage = messages[messages.length - 1];

  const getInitialPrompt = (type: string, data?: Record<string, any>) => {
    const prompts: Record<string, string> = {
      valuation: `I want to value my app "${data?.name || 'my app'}". Please help me determine its worth.`,
      listing: `I want to create a listing for my app "${data?.name || 'my app'}". Let's work on this together.`,
      pitch: `I want to create an investor pitch for my app "${data?.name || 'my app'}". Help me craft it.`,
      general: 'I need help with my MVPLAB account.',
    };
    return prompts[type] || prompts.general;
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-accent/10 to-primary/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground capitalize">{contextType} Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentSession?.status === 'completed' && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-full">
              <CheckCircle2 size={12} />
              Complete
            </span>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X size={18} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h4 className="font-bold text-lg text-foreground mb-2">Let's get started</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              I'll ask you some questions to better understand your {contextType} and provide the best result.
            </p>
            <Button onClick={handleStart} disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ChevronRight size={16} />
              )}
              Start Conversation
            </Button>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                onOptionSelect={handleOptionSelect}
                onNumberSubmit={handleNumberSubmit}
              />
            ))}
            <div aria-live="polite" role="status">
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground p-4">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {started && lastMessage?.role === 'ai' && !currentSession?.result && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer..."
              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-accent/20 outline-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              size="icon"
              aria-label="Send message"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface MessageBubbleProps {
  message: ChatMessage;
  onOptionSelect: (option: string) => void;
  onNumberSubmit: (num: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onOptionSelect, onNumberSubmit }) => {
  const isAI = message.role === 'ai';
  const [numberInput, setNumberInput] = useState('');

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex items-start gap-2 max-w-[85%] ${isAI ? '' : 'flex-row-reverse'}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isAI ? 'bg-gradient-to-br from-accent to-primary' : 'bg-muted'
        }`}>
          {isAI ? <Bot size={16} className="text-white" /> : <User size={16} className="text-muted-foreground" />}
        </div>
        
        <div className={`rounded-2xl p-4 ${
          isAI ? 'bg-muted rounded-tl-sm' : 'bg-accent text-white rounded-tr-sm'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          
          {/* Choice Options */}
          {message.question_type === 'choice' && message.question_options && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.question_options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onOptionSelect(opt)}
                  className="px-3 py-1.5 text-sm bg-background/50 hover:bg-background/80 rounded-lg transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Boolean Options */}
          {message.question_type === 'boolean' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onOptionSelect('Yes')}
                className="px-4 py-2 text-sm bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 rounded-lg transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => onOptionSelect('No')}
                className="px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-600 rounded-lg transition-colors"
              >
                No
              </button>
            </div>
          )}

          {/* Number Input */}
          {message.question_type === 'number' && (
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onNumberSubmit(Number(numberInput))}
                placeholder="Enter number..."
                className="flex-1 bg-background/50 border border-border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => onNumberSubmit(Number(numberInput))}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChat;
