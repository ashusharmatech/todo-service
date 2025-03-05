import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user, signIn, signUp } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    
    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccessMessage('Please check your email for confirmation link. You can now sign in.');
        setIsSignUp(false); // Switch to sign in mode
        setEmail(''); // Clear email
        setPassword(''); // Clear password
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div 
        className="max-w-md w-full space-y-8 glass-effect p-8 rounded-2xl shadow-xl animate-fade-in"
        style={{
          transform: 'translateZ(0)',
          perspective: '1000px',
        }}
      >
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-12 w-12 text-indigo-600" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
            {isSignUp ? 'Join Us Today' : 'Welcome Back'}
          </h2>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Create an account to start organizing your tasks'
              : 'Sign in to access your todo list'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm animate-slide-in flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-xl text-sm animate-slide-in flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 hover-scale"
            >
              {isSignUp ? (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccessMessage('');
              setEmail('');
              setPassword('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors duration-200"
          >
            {isSignUp
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}