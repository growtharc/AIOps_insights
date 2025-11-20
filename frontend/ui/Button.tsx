import React from 'react';
import './Button.scss';

interface ButtonProps {
  text: string;
  onClick?: () => void;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  gradientStart?: string;
  gradientEnd?: string;
  textColor?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  text,
  onClick,
  startIcon,
  endIcon,
  size = 'medium',
  disabled = false,
  variant = 'primary',
  className = '',
}) => {
  return (
    <button
      className={`gradient-button ${variant} ${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon && <span className="icon start-icon">{startIcon}</span>}
      <span className="text">{text}</span>
      {endIcon && <span className="icon end-icon">{endIcon}</span>}
    </button>
  );
};

export default Button;
