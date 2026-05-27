import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FileText, Brain, Calendar,
  History, LogOut, BookOpen, X, Sparkles
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/summarizer', icon: FileText,         label: 'Summarizer'       },
  { to: '/quiz',       icon: Brain,            label: 'Quiz & Flashcard' },
  { to: '/planner',    icon: Calendar,         label: 'Study Planner'    },
  { to: '/history',    icon: History,          label: 'Riwayat'          },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col
      bg-[#0d0710] border-r border-pink-500/10
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-pink-500/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-900/50">
            <BookOpen size={17} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Study Buddy</p>
            <p className="text-[10px] text-pink-300/40 mt-0.5 flex items-center gap-1">
              <Sparkles size={9} className="text-pink-400" /> AI Learning Assistant
            </p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-pink-300/40 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/10 text-pink-300 border border-pink-500/20'
                  : 'text-pink-200/40 hover:bg-pink-500/8 hover:text-pink-200/80 border border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-pink-400' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-pink-500/10">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-pink-900/40">
            <span className="text-white font-bold text-xs">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-xs text-pink-300/30 truncate">@{user?.username}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-pink-300/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150"
        >
          <LogOut size={15} /> Keluar
        </button>
      </div>
    </aside>
  );
}
