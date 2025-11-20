import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

const defaultWidth = `1.5rem`;
const defaultHeight = `1.5rem`;

export const HomeIcon: React.FC<IconProps> = ({
  className,
  width = defaultWidth,
  height = defaultHeight,
  color,
}) => {
  const fillColor = color ?? 'currentColor';

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      viewBox="0 -960 960 960"
      fill={fillColor}
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z" />
    </svg>
  );
};
