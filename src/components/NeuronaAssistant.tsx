import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, X, MessageSquare, Loader2, ImagePlus } from 'lucide-react';
import { neuronaVoice, AVAILABLE_VOICES } from '../utils/speechSynthesis';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface NeuronaAssistantProps {
  onActionTriggered: (action: string) => void;
}

export const NeuronaAssistant: React.FC<NeuronaAssistantProps> = ({ onActionTriggered }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + ' ' + transcript);
        // Automatically send after voice input
        handleSendMessage(transcript);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    
    scrollToBottom();
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const triggerAutoGreeting = async () => {
    const greeting = "Assalamu Alaikum boss, ada yang bisa saya bantu hari ini?";
    setMessages([{ id: Date.now().toString(), role: 'model', text: greeting }]);
    const voiceId = localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
    const voiceOpt = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
    neuronaVoice.speak(greeting, voiceOpt.gender, voiceOpt.provider, voiceOpt.voiceKey);
  };


  const handleOpen = () => {
    setIsOpen(true);
    if (!hasGreeted.current && messages.length === 0) {
      hasGreeted.current = true;
      triggerAutoGreeting();
    }
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInputValue(''); // Clear before new voice input
      recognitionRef.current?.start();
    }
  };

  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || inputValue).trim();
    if (!textToSend) return;

    setInputValue('');
    setIsProcessing(true);

    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
    
    // Prepare history for API (excluding the greeting to save tokens if we want, but let's include it)
    const history = messages.map(m => ({ role: m.role, text: m.text }));
    
    setMessages(prev => [...prev, newUserMsg]);

    try {
      
      const customKey = localStorage.getItem('neurona_gemini_api_key');
      const headers: any = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-custom-api-key'] = customKey;
      }
      
      const response = await fetch('/api/neurona-chat', {
        method: 'POST',
        headers,

        body: JSON.stringify({
          userId: 'user-1',
          message: textToSend,
          history
        })
      });

      if (response.ok) {
        const data = await response.json();
        const modelMsg: ChatMessage = { id: Date.now().toString(), role: 'model', text: data.message };
        setMessages(prev => [...prev, modelMsg]);
        
        // Speak response
        const voiceId = localStorage.getItem('neurona_ui_voice') || 'id-ID-Journey-O';
        const voiceOpt = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
        neuronaVoice.speak(data.message, voiceOpt.gender, voiceOpt.provider, voiceOpt.voiceKey);

        // Handle Action
        if (data.action) {
          onActionTriggered(data.action);
        }
      } else {
        throw new Error("API Error");
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Maaf Bos, jaringan saraf saya sedang terganggu.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-[#111118] border border-gray-800 rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden flex flex-col mb-4 transform transition-all">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <h3 className="text-white font-bold text-sm tracking-wider">NEURONA AI</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4 bg-[#0a0a0f] custom-scrollbar">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 rounded-2xl rounded-bl-none px-4 py-2 text-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Menganalisa...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-[#111118] border-t border-gray-800 flex items-center gap-2">
            <button 
              onClick={toggleListen}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              {isListening ? <Mic size={18} /> : <MicOff size={18} />}
            </button>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Bicara atau ketik di sini..."
              className="flex-1 bg-gray-900 border border-gray-700 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isProcessing}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button 
          onClick={handleOpen}
          className="w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform shadow-blue-500/20"
        >
          <MessageSquare size={24} className="text-white" />
          {/* Notification dot */}
          {!hasGreeted.current && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-gray-900 rounded-full animate-pulse"></span>
          )}
        </button>
      )}
    </div>
  );
};
