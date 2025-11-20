import { useState } from 'react';
import './DropdownNavLink.scss';
import { NavLink } from 'react-router';

interface DropdownItem {
  title: string;
  subTitle?: string;
  path: string;
}

interface DropdownNavLinkProps {
  label: string;
  basePath: string;
  items?: DropdownItem[];
}

const DropdownNavLink: React.FC<DropdownNavLinkProps> = ({
  label,
  basePath,
  items = [],
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div
      className="dropdown-nav"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <NavLink to={basePath} className="dropdown-nav-link">
        {label}
      </NavLink>

      {isOpen && items.length > 0 && (
        <div className="dropdown-nav-menu">
          {items.map(({ title, path, subTitle }, index) => (
            <NavLink key={index} to={path} className="dropdown-nav-item">
              <div className="dropdown-nav-item-content">
                <span className="dropdown-nav-title">{title}</span>
                {subTitle && (
                  <span className="dropdown-nav-subtitle">{subTitle}</span>
                )}
              </div>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownNavLink;
