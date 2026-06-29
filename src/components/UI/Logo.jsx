import React from 'react';

const Logo = ({ className = "w-12 h-12", ...props }) => {
  return (
    <img 
      src="/icon-192.png" 
      alt="Gymix Logo" 
      className={className} 
      {...props} 
    />
  );
};

export default Logo;
