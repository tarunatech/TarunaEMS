import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../../../utils/api';

const EmployeeHrBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const launcherRef = useRef(null);
  const botPanelRef = useRef(null);
  const timeoutRef = useRef(null);

  const userId =
    localStorage.getItem('userId') ||
    sessionStorage.getItem('userId') ||
    localStorage.getItem('employeeId') ||
    sessionStorage.getItem('employeeId');

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!isOpen) {
      setNewMessage('');
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      const target = event.target;
      const clickedPanel = botPanelRef.current?.contains(target);
      const clickedLauncher = launcherRef.current?.contains(target);

      if (!clickedPanel && !clickedLauncher) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const handlePdfDownload = async (url) => {
    try {
      const filename = url.split('/').pop();
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Document downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download document. Please try again.');
    }
  };

  const renderInlineMessagePart = (part, index) => {
    const urlRegex = /(\/api\/bot\/download\/[a-zA-Z0-9_-]+\.pdf)/g;
    if (urlRegex.test(part)) {
      return (
        <button
          key={index}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handlePdfDownload(part);
          }}
          className="rounded-md border border-blue-100 bg-white px-2 py-1 text-left text-xs font-semibold text-blue-700 transition-colors duration-200 hover:bg-blue-50"
        >
          Download Document
        </button>
      );
    }

    return part;
  };

  const renderMessageText = (text, isBot = false) => {
    const value = String(text || '');
    const urlRegex = /(\/api\/bot\/download\/[a-zA-Z0-9_-]+\.pdf)/g;

    if (!isBot) {
      return <span className="whitespace-pre-wrap break-words">{value}</span>;
    }

    const lines = value.split('\n');
    return (
      <div className="space-y-2">
        {lines.map((line, lineIndex) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={lineIndex} className="h-1" />;

          const parts = line.split(urlRegex);
          const isNumbered = /^\d+\.\s/.test(trimmed);
          const isSummary = /^summary:/i.test(trimmed);
          const isHeading = !isNumbered && !trimmed.includes(' - ') && trimmed.length <= 70 && /[:?]$/.test(trimmed);

          return (
            <div
              key={lineIndex}
              className={`break-words leading-relaxed ${
                isHeading
                  ? 'font-semibold text-slate-950'
                  : isSummary
                    ? 'rounded-lg border border-blue-100 bg-white px-2.5 py-2 font-medium text-slate-800'
                    : isNumbered
                      ? 'rounded-lg bg-white/70 px-2.5 py-2 text-slate-700'
                      : 'text-slate-700'
              }`}
            >
              {parts.map((part, index) => renderInlineMessagePart(part, `${lineIndex}-${index}`))}
            </div>
          );
        })}
      </div>
    );
  };

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || loading) return;

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      {
        _id: tempId,
        text,
        timestamp: new Date().toISOString(),
        self: true
      }
    ]);
    setNewMessage('');
    setLoading(true);

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      timeoutRef.current = null;
      toast.error('Bot is taking longer than expected. Please try again.');
    }, 10000);

    try {
      const response = await API.post('/bot/message', { text, userId });

      if (response.data.success) {
        setMessages(prev => [
          ...prev,
          {
            _id: `bot-${Date.now()}`,
            text: response.data.response,
            timestamp: new Date().toISOString(),
            self: false,
            fromBot: true
          }
        ]);
      } else {
        toast.error('Failed to get bot response');
      }
    } catch (error) {
      console.error('Bot message error:', error);
      toast.error('Failed to send message to bot');
    } finally {
      setLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9998] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white opacity-45 shadow-[0_10px_22px_rgba(37,99,235,0.18)] transition-all duration-300 hover:-translate-y-1 hover:opacity-100 hover:shadow-[0_20px_42px_rgba(37,99,235,0.42)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
        title="HR Assistant"
      >
        <Bot className="w-7 h-7" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[9999] w-[calc(100vw-3rem)] max-w-md">
          <div ref={botPanelRef} className="employee-hr-bot-modal bg-white border border-blue-100 rounded-2xl h-[70vh] max-h-[620px] flex flex-col shadow-[0_24px_60px_rgba(15,23,42,0.22)] overflow-hidden">
            <div className="employee-hr-bot-header flex items-center justify-between p-4 border-b border-blue-100/80 bg-gradient-to-r from-slate-50 to-blue-50">
              <h2 className="employee-hr-bot-title text-[17px] font-semibold tracking-tight text-slate-900 flex items-center">
                <Bot className="w-5 h-5 mr-2 text-indigo-600" />
                HR Assistant
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-all duration-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Bot className="w-16 h-16 mb-3 opacity-30" />
                  <p className="text-sm">Hi! I'm your HR Assistant</p>
                  <p className="text-xs mt-1 text-center px-4">Ask me about leave policies, attendance, salary slips, or any HR-related questions.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={message._id || index}
                    className={`p-3 rounded-lg shadow-sm ${message.self
                      ? 'ml-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'mr-auto max-w-[92%] bg-blue-50 border border-blue-200 text-slate-900 sm:max-w-[86%]'
                      }`}
                  >
                    <div className="text-sm">{renderMessageText(message.text, message.fromBot)}</div>
                    <div className={`text-xs mt-1 ${message.self ? 'text-blue-100' : 'text-blue-500'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex items-center text-slate-400 p-3">
                  <Loader2 className="w-4 h-4 mr-2 text-blue-600 animate-spin" />
                  Bot is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask HR Assistant..."
                  className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-l-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-r-lg disabled:opacity-50 transition-opacity duration-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeHrBot;
