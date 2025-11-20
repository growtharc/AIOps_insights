import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

const defaultWidth = `1.5rem`;
const defaultHeight = `1.5rem`;

export const RightArrowIcon: React.FC<IconProps> = ({
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
      <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z" />
    </svg>
  );
};
