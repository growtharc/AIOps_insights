import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

const defaultWidth = `1.5rem`;
const defaultHeight = `1.5rem`;

export const SparkleIcon: React.FC<IconProps> = ({
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
      <path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm457-560 21-89-71-59 94-8 36-84 36 84 94 8-71 59 21 89-80-47-80 47ZM480-481Z" />
    </svg>
  );
};
