import React from 'react';
import { MessageCircle } from 'lucide-react';

const FloatingChatButton = ({ isAdmin, onClick }) => {
  if (!isAdmin) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-600 p-4 text-white opacity-45 shadow-lg shadow-blue-600/10 transition-all duration-300 hover:scale-110 hover:bg-blue-700 hover:opacity-100 hover:shadow-blue-600/25 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
      aria-label="Open Admin AI Chatbot"
    >
      <MessageCircle size={24} />
    </button>
  );
};

export default FloatingChatButton;
