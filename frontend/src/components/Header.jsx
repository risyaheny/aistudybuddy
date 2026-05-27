import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, FileText, Brain, Calendar, LayoutDashboard, History } from 'lucide-react';

const pageMeta = {
  '/dashboard':  { title: 'Dashboard',        icon: LayoutDashboard },
  '/summarizer': { title: 'Smart Summarizer',  icon: FileText        },
  '/quiz':       { title: 'Quiz & Flashcard',  icon: Brain           },
  '/planner':    { title: 'Study Planner',     icon: Calendar        },
  '/history':    { title: 'Riwayat',           icon: History         },
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const meta = pageMeta[location.pathname] || pageMeta['/dashboard'];
  const Icon = meta.icon;

  return (
    <header className="bg-[#0d0710]/80 backdrop-blur-sm border-b border-pink-500/10 px-4 md:px-6 py-3.5 flex items-center gap-4 sticky top-0 z-10">
      <button onClick={onMenuClick} className="lg:hidden text-pink-300/40 hover:text-white p-1 transition-colors">
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2.5">
        <Icon size={17} className="text-pink-400" />
        <h2 className="font-semibold text-white text-base">{meta.title}</h2>
      </div>
    </header>
  );
}
