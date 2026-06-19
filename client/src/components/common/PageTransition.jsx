import React from 'react';

const PageTransition = ({ children }) => (
  <div className="animate-fade-in">
    {children}
    <style>{`
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in { animation: fade-in 0.5s ease-out; }
    `}</style>
  </div>
);

export default PageTransition;