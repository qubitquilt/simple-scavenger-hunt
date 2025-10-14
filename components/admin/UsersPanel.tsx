import React from 'react';
import { User } from '@/types/user';

interface UsersPanelProps {
  users: User[];
}

const UsersPanel: React.FC<UsersPanelProps> = ({ users }) => {
  return (
    <div className="p-4 border rounded-lg mt-4">
      <h2 className="text-2xl font-bold">Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default UsersPanel;