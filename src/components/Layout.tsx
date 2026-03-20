import React from 'react';
import { Shield, LayoutDashboard, FileText, User, LogOut, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FileText, label: 'Claims', path: '/claims' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Shield, label: 'Insurance', path: '/insurance' },
    { icon: HelpCircle, label: 'Support', path: '/support' },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin Panel', path: '/admin' });
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
            <Shield size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">ErgoShield</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-neutral-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-neutral-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-neutral-800">
            {navItems.find(i => i.path === location.pathname)?.label || 'ErgoShield'}
          </h1>
          <div className="flex items-center gap-4">
            <button className="p-2 text-neutral-500 hover:bg-neutral-50 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-neutral-900">{profile?.fullName}</p>
                <p className="text-xs text-neutral-500 capitalize">{profile?.role}</p>
              </div>
              <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 font-bold">
                {profile?.fullName?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
