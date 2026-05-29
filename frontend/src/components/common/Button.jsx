import React from 'react';

const Button = ({ children, variant = 'default', size = 'md', className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md font-medium';
  const variants = {
    default: 'bg-primary text-white',
    outline: 'border border-gray-200 bg-transparent',
    ghost: 'bg-transparent'
  };
  const sizes = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  const cls = `${base} ${variants[variant] || ''} ${sizes[size] || ''} ${className}`;
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
};

export default Button;
