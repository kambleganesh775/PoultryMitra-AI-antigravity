import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BREED_GROWTH_DATA } from '../constants';

const BreedAnalytics: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Breed Growth & Profit Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Weight Comparison Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-96">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Weight Gain Comparison (grams)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={BREED_GROWTH_DATA}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="day7" fill="#8884d8" name="7 Days" />
              <Bar dataKey="day15" fill="#82ca9d" name="15 Days" />
              <Bar dataKey="day30" fill="#ffc658" name="30 Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Market Price Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-96">
          <h3 className="text-lg font-bold text-gray-700 mb-4">Market Price vs Demand (Normalized)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={BREED_GROWTH_DATA}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#ff7300" name="Price (₹/kg)" strokeWidth={2} />
              <Line type="monotone" dataKey="demand" stroke="#387908" name="Demand Index (0-100)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="mt-8 bg-yellow-50 p-6 rounded-xl border border-yellow-200">
        <h3 className="font-bold text-yellow-900 text-lg mb-2">💡 Strategy Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <h4 className="font-semibold text-yellow-800">Highest Profit: Aseel</h4>
                <p className="text-sm text-yellow-700">Slow growth but sells at ₹600/kg. Best for long term free-range.</p>
            </div>
            <div>
                <h4 className="font-semibold text-yellow-800">Fast Cash: Vanaraja</h4>
                <p className="text-sm text-yellow-700">Ready in 2.5 months. Good balance of weight and price.</p>
            </div>
            <div>
                <h4 className="font-semibold text-yellow-800">High Demand: Gavran</h4>
                <p className="text-sm text-yellow-700">Constant market demand. Easier to sell locally anytime.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BreedAnalytics;
