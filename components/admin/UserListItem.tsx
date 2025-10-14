"use client";

import { User } from "@/types/user";

interface UserListItemProps {
  user: User;
}

const UserListItem = ({ user }: UserListItemProps) => {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h2 className="card-title">{user.name}</h2>
        <p>ID: {user.id}</p>
      </div>
    </div>
  );
};

export default UserListItem;