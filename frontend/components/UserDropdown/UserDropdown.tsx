import React, { useState } from 'react';
import './UserDropdown.scss';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface UserDropdownProps {
  user: User;
  onSettingsClick: () => void;
  onLogout: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  user,
  onSettingsClick,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="user-dropdown"
      // onClick={() => setIsOpen(!isOpen)}
      onClick={() => setIsOpen(false)}
      onBlur={() => setIsOpen(false)}
      tabIndex={0}
    >
      <div className="user-dropdown-trigger">
        <div className="user-info">
          <div className="user-name">
            {user.firstName} {user.lastName}
          </div>
          <div className="user-email">{user.email}</div>
        </div>
      </div>

      {isOpen && (
        <div className="user-dropdown-menu">
          <button className="dropdown-item" onClick={onSettingsClick}>
            Admin
          </button>
          <button className="dropdown-item" onClick={onSettingsClick}>
            Agent Metrics
          </button>
          <button className="dropdown-item" onClick={onSettingsClick}>
            Settings
          </button>
          <button className="dropdown-item" onClick={onLogout}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
