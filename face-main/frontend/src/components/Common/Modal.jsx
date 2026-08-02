import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal Component with proper backdrop blur and accessibility
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {function} onClose - Callback when modal should close
 * @param {string} title - Modal title
 * @param {React.ReactNode} children - Modal content
 * @param {string} size - Modal size: 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', 'full'
 * @param {boolean} showCloseButton - Show/hide close button (default: true)
 * @param {boolean} closeOnBackdropClick - Close modal when clicking backdrop (default: true)
 * @param {boolean} closeOnEscape - Close modal when pressing Escape (default: true)
 * @param {string} className - Additional classes for modal content
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
  footer = null
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-full'
  };

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Enhanced Backdrop with blur */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />

      {/* Modal Content */}
      <div
        className={`
          relative w-full ${sizeClasses[size]} 
          glass-morphism neon-border rounded-2xl 
          shadow-2xl
          max-h-[95vh] overflow-y-auto
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="sticky top-0 z-10 bg-secondary-900/95 backdrop-blur-sm border-b border-secondary-700 px-4 sm:px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              {title && (
                <h2 id="modal-title" className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-auto p-2 text-secondary-400 hover:text-white hover:bg-secondary-700 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 z-10 bg-secondary-900/95 backdrop-blur-sm border-t border-secondary-700 px-4 sm:px-6 py-4 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;

