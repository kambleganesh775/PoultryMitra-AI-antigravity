import React, { useState, useRef, useEffect } from 'react';
import { askPoultryExpert, Attachment } from '../services/geminiService';
import { Send, Bot, User, Loader2, Paperclip, X, Image as ImageIcon, FileText, ExternalLink, Link as LinkIcon, Languages, Trash2, ArrowLeft, Check } from 'lucide-react';
import { AppLogo } from './AppLogo';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

interface LocalAttachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'file';
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  attachments?: LocalAttachment[];
  sources?: { uri: string; title: string }[];
}

const AIChat: React.FC = () => {
  // State for Language Gating
  const [isChatActive, setIsChatActive] = useState(false);
  const [language, setLanguage] = useState<'English' | 'Hindi' | 'Marathi'>('English');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<LocalAttachment[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, selectedFiles]);

  const getWelcomeMessage = (lang: string) => {
      if (lang === 'Hindi') return "नमस्ते! मैं पोल्ट्री मित्र एआई हूँ। बीमार पक्षी की फोटो अपलोड करें या दाना/प्रबंधन के बारे में पूछें।";
      if (lang === 'Marathi') return "नमस्कार! मी पोल्ट्री मित्र एआय आहे. आजारी पक्ष्याचा फोटो अपलोड करा किंवा खाद्य/व्यवस्थापनाबद्दल विचारा.";
      return "Namaste! I am PoultryMitra AI. Upload a photo of a sick bird or ask about feed/management.";
  };

  const handleLanguageSelect = (lang: 'English' | 'Hindi' | 'Marathi') => {
      setLanguage(lang);
      setIsChatActive(true);
      setMessages([{
          id: Date.now(),
          text: getWelcomeMessage(lang),
          sender: 'ai'
      }]);
  };

  const handleResetLanguage = () => {
      setIsChatActive(false);
      setMessages([]);
      setInput('');
      setSelectedFiles([]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
              const base64Data = dataUrl.split(',')[1];
              resolve(base64Data);
            } else {
              reject(new Error('Failed to get canvas context'));
            }
          };
          img.onerror = error => reject(error);
          img.src = event.target?.result as string;
        } else {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newAttachments: LocalAttachment[] = filesArray.map((file: File) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'file'
      }));
      setSelectedFiles(prev => [...prev, ...newAttachments]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearChat = () => {
    if(window.confirm("Clear all chat history?")) {
        setMessages([{ id: Date.now(), text: getWelcomeMessage(language), sender: 'ai' }]);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;

    const currentFiles = [...selectedFiles];
    const currentInput = input;

    // 1. Add User Message to UI immediately
    const userMsg: Message = { 
        id: Date.now(), 
        text: currentInput, 
        sender: 'user',
        attachments: currentFiles
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedFiles([]); // Clear preview
    setIsLoading(true);

    // 2. Process Files for API (Base64)
    const apiAttachments: Attachment[] = [];
    try {
        for (const attachment of currentFiles) {
            const base64 = await fileToBase64(attachment.file);
            apiAttachments.push({
                inlineData: {
                    mimeType: attachment.file.type.startsWith('image/') ? 'image/jpeg' : attachment.file.type,
                    data: base64
                }
            });
        }

        // 3. Call API with selected Language
        const response = await askPoultryExpert(currentInput, apiAttachments, language);
        
        // 4. Add AI Response with Sources
        const aiMsg: Message = { 
            id: Date.now() + 1, 
            text: response.text, 
            sender: 'ai',
            sources: response.sources
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        const errorMsg: Message = { id: Date.now() + 1, text: "Sorry, I had trouble processing your image or request.", sender: 'ai' };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- RENDER: LANGUAGE SELECTION SCREEN ---
  if (!isChatActive) {
      return (
          <div className="p-6 h-full flex flex-col items-center justify-center bg-gray-50 overflow-y-auto">
              <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-orange-100 my-auto">
                  <div className="mx-auto mb-6 flex justify-center">
                      <AppLogo size={80} />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">Select Language</h1>
                  <p className="text-gray-500 mb-8">Choose your preferred language to start chatting with Poultry Expert AI.</p>

                  <div className="space-y-4">
                      <button 
                          onClick={() => handleLanguageSelect('English')}
                          className="w-full bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-500 text-gray-800 font-semibold py-4 px-6 rounded-xl flex items-center justify-between transition-all group shadow-sm hover:shadow-md"
                      >
                          <span className="flex items-center gap-3">
                              <span className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">EN</span>
                              English
                          </span>
                          <Check className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20}/>
                      </button>

                      <button 
                          onClick={() => handleLanguageSelect('Hindi')}
                          className="w-full bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-500 text-gray-800 font-semibold py-4 px-6 rounded-xl flex items-center justify-between transition-all group shadow-sm hover:shadow-md"
                      >
                           <span className="flex items-center gap-3">
                              <span className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">HI</span>
                              Hindi (हिंदी)
                          </span>
                          <Check className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20}/>
                      </button>

                      <button 
                          onClick={() => handleLanguageSelect('Marathi')}
                          className="w-full bg-white hover:bg-orange-50 border border-gray-200 hover:border-orange-500 text-gray-800 font-semibold py-4 px-6 rounded-xl flex items-center justify-between transition-all group shadow-sm hover:shadow-md"
                      >
                           <span className="flex items-center gap-3">
                              <span className="bg-orange-100 text-orange-700 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">MR</span>
                              Marathi (मराठी)
                          </span>
                          <Check className="text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity" size={20}/>
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: CHAT SCREEN ---
  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 shrink-0">
        <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bot className="text-orange-600"/> Ask Poultry Expert AI
        </h1>
        
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-orange-100 text-orange-800 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
                 <Languages size={14}/> {language}
            </div>
            
            <div className="flex gap-2">
              <button 
                  onClick={handleResetLanguage}
                  className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-gray-500 hover:text-orange-600 transition-colors tooltip"
                  title="Change Language"
              >
                  <ArrowLeft size={16} />
              </button>
              
              <button 
                  onClick={handleClearChat}
                  className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Clear Chat"
              >
                  <Trash2 size={16} />
              </button>
            </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Attachments (Images) if any */}
              {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`mb-1 flex flex-wrap gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.attachments.map((att, idx) => (
                          att.type === 'image' ? (
                            <img 
                                key={idx} 
                                src={att.previewUrl} 
                                alt="attachment" 
                                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border border-gray-300 shadow-sm"
                            />
                          ) : (
                              <div key={idx} className="bg-gray-100 p-2 rounded flex items-center gap-2 text-xs">
                                  <FileText size={16}/> {att.file.name}
                              </div>
                          )
                      ))}
                  </div>
              )}

              {/* Text Bubble */}
              {msg.text && (
                <div 
                    className={`max-w-[90%] md:max-w-[80%] rounded-xl p-3 shadow-sm ${
                    msg.sender === 'user' 
                        ? 'bg-orange-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2 opacity-70 text-xs border-b border-black/10 pb-1">
                        {msg.sender === 'user' ? <User size={12}/> : <Bot size={12}/>}
                        <span>{msg.sender === 'user' ? 'You' : 'PoultryMitra'}</span>
                    </div>
                    
                    {/* Content */}
                    <div className={`prose prose-sm max-w-none ${msg.sender === 'user' ? 'text-white prose-invert' : 'text-gray-800'}`}>
                         <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text}
                         </ReactMarkdown>
                    </div>

                    {/* Reference Links */}
                    {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200/50">
                            <p className="text-xs font-bold mb-1 flex items-center gap-1 opacity-80"><LinkIcon size={12}/> Sources:</p>
                            <div className="flex flex-wrap gap-2">
                                {msg.sources.map((src, idx) => (
                                    <a 
                                        key={idx} 
                                        href={src.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[10px] flex items-center gap-1 bg-black/5 hover:bg-black/10 px-2 py-1 rounded-full transition-colors truncate max-w-[200px]"
                                        title={src.title}
                                    >
                                        <ExternalLink size={10} /> {src.title || new URL(src.uri).hostname}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-3 rounded-xl rounded-bl-none flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="animate-spin" size={16} /> Analyzing ({language})...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File Preview Area (Above Input) */}
        {selectedFiles.length > 0 && (
            <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex gap-3 overflow-x-auto shrink-0">
                {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative group shrink-0">
                        {file.type === 'image' ? (
                            <img src={file.previewUrl} className="w-16 h-16 object-cover rounded-md border border-gray-300" alt="preview" />
                        ) : (
                             <div className="w-16 h-16 bg-white flex flex-col items-center justify-center rounded-md border border-gray-300">
                                 <FileText size={20} className="text-gray-500"/>
                                 <span className="text-[8px] text-gray-500 w-full text-center truncate px-1">{file.file.name}</span>
                             </div>
                        )}
                        <button 
                            onClick={() => removeFile(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2 items-center">
            {/* File Input */}
            <input 
                type="file" 
                multiple 
                accept="image/*,application/pdf"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-400 hover:text-orange-600 p-2 hover:bg-orange-50 rounded-full transition-colors"
                title="Attach Image or Doc"
            >
                <Paperclip size={20} />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type your question...`}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && selectedFiles.length === 0)}
              className="bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-xs text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
            <ImageIcon size={10}/> Supports Images (JPG, PNG) & PDFs for medical/feed analysis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;