import React, { useState, useEffect } from 'react';
import { DAILY_CHECKLIST_TEMPLATE } from '../constants';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { getWeatherAndBroodingAdvice, WeatherAdvice } from '../services/geminiService';
import { CheckCircle2, AlertTriangle, IndianRupee, Egg, Package, CloudSun, MapPin, RefreshCw, Loader2, Thermometer, Droplets, Bird } from 'lucide-react';
import { InventoryItem } from '../types';

const INDIAN_LOCATIONS = [
  "New Delhi", "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", "Kolhapur", 
  "Amravati", "Nanded", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", "Chandrapur", 
  "Parbhani", "Ichalkaranji", "Jalna", "Bhusawal", "Navi Mumbai", "Thane",
  "Hyderabad", "Bangalore", "Chennai", "Kolkata", "Lucknow", "Patna", "Bhopal", 
  "Jaipur", "Ranchi", "Raipur", "Bhubaneswar", "Guwahati", "Chandigarh", "Srinagar"
];

const Dashboard: React.FC = () => {
  const { chicks, sales, expenses, inventory, isLoading: dataLoading } = useData();
  const [checklist, setChecklist] = useState(DAILY_CHECKLIST_TEMPLATE);
  const [stats, setStats] = useState({ totalChicks: 0, mortality: 0, revenue: 0, expense: 0 });
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryItem[]>([]);
  
  // Weather State
  const [location, setLocation] = useState<string>(() => localStorage.getItem('user_location') || 'New Delhi');
  const [weatherData, setWeatherData] = useState<WeatherAdvice | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    // Sum active birds across all batches
    const totalBirds = chicks.reduce((acc, batch) => acc + (batch.currentCount || 0), 0);
    
    // Sum total mortality
    const totalMortality = chicks.reduce((acc, batch) => acc + (batch.mortalityCount || 0), 0);

    // Financials
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalExpense = expenses
      .filter(e => e.type !== 'Usage') // Only count cash outflows (purchases, etc.)
      .reduce((acc, e) => acc + e.amount, 0);

    // Inventory Alerts
    const lowStock = inventory.filter(item => item.quantity <= (item.lowStockThreshold || 0));

    setStats({ 
        totalChicks: totalBirds, 
        mortality: totalMortality,
        revenue: totalRevenue,
        expense: totalExpense
    });
    setInventoryAlerts(lowStock);
  }, [chicks, sales, expenses, inventory]);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async (loc: string = location) => {
      setWeatherLoading(true);
      const data = await getWeatherAndBroodingAdvice(loc);
      if (data) {
          setWeatherData(data);
      }
      setWeatherLoading(false);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLoc = e.target.value;
      setLocation(newLoc);
      localStorage.setItem('user_location', newLoc);
      fetchWeather(newLoc);
  };

  const toggleTask = (id: number) => {
    const updatedList = checklist.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setChecklist(updatedList);
    // Note: Checklist is still local for now as it's a template, 
    // but in a full cloud app we'd save this to Firestore too.
  };

  if (dataLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Namaste, Farmer! 🙏</h1>
            <p className="text-sm md:text-base text-gray-600">Here is your farm overview for today.</p>
        </div>
        
        {/* Location Selector */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <MapPin size={18} className="text-orange-600"/>
            <select 
                value={location}
                onChange={handleLocationChange}
                className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none cursor-pointer"
            >
                {INDIAN_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                ))}
            </select>
            <button onClick={() => fetchWeather()} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-orange-600" title="Refresh Weather">
                <RefreshCw size={14} className={weatherLoading ? 'animate-spin' : ''}/>
            </button>
        </div>
      </header>
      
      {/* Weather & Advice Widget */}
      {weatherData && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 md:p-5 text-white shadow-md flex flex-col md:flex-row gap-6 items-center animate-in fade-in">
              <div className="flex items-center gap-4 border-r border-blue-400/50 pr-6 shrink-0">
                  <CloudSun size={42} className="text-yellow-300"/>
                  <div>
                      <p className="text-3xl font-bold">{weatherData.temp}</p>
                      <p className="text-sm text-blue-100 flex items-center gap-2">
                        <Droplets size={12}/> {weatherData.humidity} Humidity
                      </p>
                      <p className="text-xs text-blue-200">{weatherData.condition}</p>
                  </div>
              </div>
              <div className="flex-1">
                  <h3 className="font-bold text-blue-100 text-sm uppercase mb-1 flex items-center gap-2">
                      <Thermometer size={14}/> Live Farm Advisory
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                           <p className="text-xs text-blue-200 font-bold mb-1">🐣 Brooding Tip</p>
                           <p className="text-sm">{weatherData.broodingTip}</p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                           <p className="text-xs text-blue-200 font-bold mb-1">🐓 Flock Manager</p>
                           <p className="text-sm">{weatherData.generalTip}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0"><Egg size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Live Birds</p>
            <p className="text-2xl font-bold">{stats.totalChicks}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total Mortality</p>
            <p className="text-2xl font-bold">{stats.mortality}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0"><IndianRupee size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="text-2xl font-bold">₹ {stats.revenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-full text-orange-600 shrink-0"><IndianRupee size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-bold">₹ {stats.expense.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Total Stock Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bird Stock */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Bird className="text-orange-600"/> Live Flock Overview
              </h3>
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-orange-50 text-orange-800 font-semibold">
                          <tr>
                              <th className="p-2 rounded-l-lg">Breed</th>
                              <th className="p-2 text-center">Chicks (0-8w)</th>
                              <th className="p-2 text-center">Adults (8w+)</th>
                              <th className="p-2 text-right rounded-r-lg">Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {(() => {
                              const activeChicks = chicks.filter(c => c.status === 'Active');
                              const breeds = Array.from(new Set(activeChicks.map(c => c.breed)));
                              
                              if (breeds.length === 0) {
                                  return <tr><td colSpan={4} className="p-4 text-center text-gray-500">No active flocks.</td></tr>;
                              }

                              return breeds.map(breed => {
                                  const breedBatches = activeChicks.filter(c => c.breed === breed);
                                  const chickCount = breedBatches.filter(c => {
                                      const diffTime = Math.abs(new Date().getTime() - new Date(c.hatchDate).getTime());
                                      const weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                                      return weeks < 8;
                                  }).reduce((sum, c) => sum + c.currentCount, 0);
                                  
                                  const adultCount = breedBatches.filter(c => {
                                      const diffTime = Math.abs(new Date().getTime() - new Date(c.hatchDate).getTime());
                                      const weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
                                      return weeks >= 8;
                                  }).reduce((sum, c) => sum + c.currentCount, 0);

                                  return (
                                      <tr key={breed}>
                                          <td className="p-2 font-medium text-gray-700">{breed}</td>
                                          <td className="p-2 text-center bg-yellow-50/50 text-yellow-700 font-medium">{chickCount > 0 ? chickCount : '-'}</td>
                                          <td className="p-2 text-center bg-blue-50/50 text-blue-700 font-medium">{adultCount > 0 ? adultCount : '-'}</td>
                                          <td className="p-2 text-right font-bold text-gray-900">{chickCount + adultCount}</td>
                                      </tr>
                                  );
                              });
                          })()}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Resource Stock */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="text-blue-600"/> Resource Inventory
              </h3>
              <div className="space-y-4">
                  {(() => {
                      const feed = inventory.filter(i => i.type === 'Feed');
                      const meds = inventory.filter(i => ['Medicine', 'Vaccine', 'Vitamin', 'Deworming'].includes(i.type));
                      
                      const totalFeed = feed.reduce((sum, i) => sum + i.quantity, 0);
                      const totalMeds = meds.length;
                      const lowStockCount = inventory.filter(i => i.quantity <= (i.lowStockThreshold || 0)).length;

                      return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                    <p className="text-xs text-orange-600 font-semibold uppercase">Total Feed Stock</p>
                                    <p className="text-2xl font-bold text-orange-900 mt-1">{totalFeed.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
                                    <p className="text-xs text-orange-500 mt-1">{feed.length} varieties available</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-xs text-blue-600 font-semibold uppercase">Health Supplies</p>
                                    <p className="text-2xl font-bold text-blue-900 mt-1">{totalMeds} <span className="text-sm font-normal">items</span></p>
                                    <p className="text-xs text-blue-500 mt-1">Vaccines & Medicines</p>
                                </div>
                            </div>
                            
                            {lowStockCount > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-full text-red-600">
                                        <AlertTriangle size={18}/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-red-800">{lowStockCount} Items Low on Stock</p>
                                        <p className="text-xs text-red-600">Check inventory manager to restock.</p>
                                    </div>
                                </div>
                            )}
                          </>
                      );
                  })()}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Checklist */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-orange-100 px-6 py-4 border-b border-orange-200 flex justify-between items-center">
            <h2 className="text-lg font-bold text-orange-900">Daily Farm Task Checklist</h2>
            {weatherData && (
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-orange-600 border border-orange-200 shadow-sm">
                    Weather Adjusted
                </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {checklist.map(task => (
              <div 
                key={task.id} 
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 ${
                  task.completed ? 'bg-green-500 border-green-500' : 'border-gray-400'
                }`}>
                  {task.completed && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <span className={`text-sm md:text-base ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {task.task}
                </span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
            Click tasks to mark as complete. Resets automatically tomorrow.
          </div>
        </div>

        {/* Alerts & Reminders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="bg-red-50 px-6 py-4 border-b border-red-100">
            <h2 className="text-lg font-bold text-red-900">Alerts & Reminders</h2>
          </div>
          <div className="p-4 space-y-4">
            
            {/* Inventory Alerts */}
            {inventoryAlerts.length > 0 ? (
                inventoryAlerts.map(item => (
                    <div key={item.id} className="flex gap-3 items-start p-3 bg-red-50 border border-red-200 rounded-lg animate-in slide-in-from-right-2">
                        <Package className="text-red-600 shrink-0 mt-1" size={18} />
                        <div>
                            <p className="font-semibold text-red-800 text-sm md:text-base">Low Stock: {item.name}</p>
                            <p className="text-xs md:text-sm text-red-700">Only {item.quantity} {item.unit} remaining (Limit: {item.lowStockThreshold}). Restock immediately.</p>
                        </div>
                    </div>
                ))
            ) : (
                 <div className="flex gap-3 items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="text-green-600 shrink-0" size={18} />
                    <p className="text-sm text-green-800">Inventory levels are healthy.</p>
                 </div>
            )}

            {/* Standard Alerts */}
            <div className="flex gap-3 items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="text-yellow-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="font-semibold text-yellow-800 text-sm md:text-base">Vaccine Due Tomorrow</p>
                <p className="text-xs md:text-sm text-yellow-700">Lasota Booster for Batch A (Aseel).</p>
              </div>
            </div>
            
            <div className="flex gap-3 items-start p-3 bg-green-50 border border-green-200 rounded-lg">
              <IndianRupee className="text-green-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="font-semibold text-green-800 text-sm md:text-base">Market Price Alert</p>
                <p className="text-xs md:text-sm text-green-700">Desi Gavran price up by ₹20/kg in local market.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
