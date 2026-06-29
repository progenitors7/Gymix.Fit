import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({ className = "w-12 h-12", ...props }) => {
  return (
    <motion.img 
      src="/logo-transparent.png" 
      alt="Gymix Logo" 
      className={className}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        scale: 1.08,
        rotate: [0, -3, 3, 0],
        transition: { duration: 0.4, ease: "easeInOut" }
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.3 }}
      {...props} 
    />
  );
};

export default Logo;
