import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getMe } from './lib/api';
import Dashboard from './pages/Dashboard';
import Builder from './pages/Builder';
import Export from './pages/Export';

interface User {
  sub: string;
  email: string;
  name: string;
}

interface AuthContext {
  user: User | null;
  loading: boolean;
}

const AuthCtx = createContext<AuthContext>({ user: null, loading: true });
export const useAuth = () => useContext(AuthCtx);

function Header({ user }: { user: User | null }) {
  return (
    <header className="app-header">
      <h1>
        PHUT Builder <span>v1.0</span>
      </h1>
      {user && (
        <div className="user-info">
          <span>{user.name}</span>
          <a href="/auth/logout" className="btn btn-sm btn-ghost">
            Sign out
          </a>
        </div>
      )}
    </header>
  );
}

function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-card card">
        <h1>PHUT Builder</h1>
        <p>
          Build Preferred Hotel Upload CSV files with pre-filled Sabre property data.
          Sign in with your Enperso account to get started.
        </p>
        <a href="/auth/login" className="btn btn-primary">
          Sign in with Microsoft
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => {
        if (res.authenticated && res.user) {
          setUser(res.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AuthCtx.Provider value={{ user, loading }}>
      <BrowserRouter>
        <Header user={user} />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id" element={<Builder />} />
          <Route path="/project/:id/export" element={<Export />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
