import React from "react";

interface IconProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
}

const defaultWidth = `1.5rem`;
const defaultHeight = `1.5rem`;

export const InsightsIcon: React.FC<IconProps> = ({
  className,
  width = defaultWidth,
  height = defaultHeight,
  color,
}) => {
  const fillColor = color ?? "currentColor";

  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
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
      <path d="M400-320q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70Zm-40-120v-280h80v280h-80Zm-140 0v-200h80v200h-80Zm280 0v-160h80v160h-80ZM824-80 597-307q-41 32-91 49.5T400-240q-134 0-227-93T80-560q0-134 93-227t227-93q134 0 227 93t93 227q0 56-17.5 106T653-363l227 227-56 56Z" />
    </svg>
  );
};
