'use client';

import React, { useEffect, useState } from 'react';
import { GlowingButton, GlowingCard } from './ui/GlowingComponents';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (notificationId: string) => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-md bg-white dark:bg-dark-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700/30 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700/30 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <GlowingButton
                onClick={() => {
                  onMarkAllAsRead?.();
                }}
                className="text-xs py-1 px-2"
              >
                Mark all as read
              </GlowingButton>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 dark:border-gray-700/20 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition cursor-pointer ${
                      !notif.is_read ? 'bg-gray-50 dark:bg-dark-700/30' : ''
                    }`}
                    onClick={() => {
                      if (!notif.is_read) {
                        onMarkAsRead?.(notif.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{notif.title}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{notif.message}</p>
                        <p className="text-gray-500 text-xs mt-2">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(notif.id);
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-600 rounded-full">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default NotificationDropdown;
