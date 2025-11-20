import React from "react";
import "./Badge.scss";

type BadgeType = "success" | "info" | "warning" | "neutral";

interface BadgeProps {
  type?: BadgeType;
  isVisible?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  type = "neutral",
  isVisible = true,
  className = "",
  children,
}) => {
  const classes = [
    "badge",
    `badge--${type}`,
    isVisible ? "badge--visible" : "badge--hidden",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
};

export default Badge;
