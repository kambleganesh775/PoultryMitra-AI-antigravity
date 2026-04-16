import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/db';
import { Home, Loader2 } from 'lucide-react';
import { AppLogo } from './AppLogo';

const FarmSetup: React.FC = () => {
  const [farmName, setFarmName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      await authService.updateFarmName(farmName);
      navigate('/');
    } catch (err: any) {
      console.error("Farm Setup Error:", err);
      setError('Failed to save farm name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-orange-100">
        <div className="text-center mb-8 flex flex-col items-center">
          <AppLogo size={64} className="mb-6" />
          <h1 className="text-2xl font-bold text-gray-800">Complete Your Profile</h1>
          <p className="text-gray-500">Please provide your farm name to continue</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Home className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Your Farm Name"
              required
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !farmName.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Start Managing Farm'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FarmSetup;
