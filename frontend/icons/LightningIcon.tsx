import React from 'react';

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

const defaultWidth = `1.5rem`;
const defaultHeight = `1.5rem`;

export const LightningIcon: React.FC<IconProps> = ({
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
      <path d="m280-80 160-300-320-40 480-460h80L520-580l320 40L360-80h-80Zm222-247 161-154-269-34 63-117-160 154 268 33-63 118Zm-22-153Z" />
    </svg>
  );
};
