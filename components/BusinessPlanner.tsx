import React, { useState } from 'react';
import { generateBusinessPlan, getMarketForecast } from '../services/geminiService';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';
import { IndianRupee, TrendingUp, Wallet, MapPin, Building2, Trees, Loader2, Target, Calendar, BarChart2, AlertCircle } from 'lucide-react';

const BusinessPlanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'budget' | 'market'>('budget');
  
  // Budget State
  const [budgetLocation, setBudgetLocation] = useState('');
  const [locationType, setLocationType] = useState<'Village' | 'City'>('Village');
  const [budgetAmount, setBudgetAmount] = useState<number>(50000);
  const [landType, setLandType] = useState('Backyard / Small Plot');
  const [planResult, setPlanResult] = useState('');
  const [isPlanLoading, setIsPlanLoading] = useState(false);

  // Market State
  const [marketLocation, setMarketLocation] = useState('');
  const [breed, setBreed] = useState('Gavran (Desi)');
  const [marketResult, setMarketResult] = useState('');
  const [isMarketLoading, setIsMarketLoading] = useState(false);

  const handleGeneratePlan = async () => {
      if(!budgetLocation || !budgetAmount) {
          alert("Please fill location and budget.");
          return;
      }
      setIsPlanLoading(true);
      const result = await generateBusinessPlan(budgetLocation, locationType, budgetAmount, landType);
      setPlanResult(result);
      setIsPlanLoading(false);
  };

  const handleMarketCheck = async () => {
      if(!marketLocation) {
          alert("Please enter a location.");
          return;
      }
      setIsMarketLoading(true);
      const result = await getMarketForecast(marketLocation, breed);
      setMarketResult(result);
      setIsMarketLoading(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Smart Business Planner</h1>
        <p className="text-gray-500 text-sm">Plan your capital and check market demand before starting.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-6 w-full md:w-fit">
        <button 
            onClick={() => setActiveTab('budget')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'budget' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
            <Wallet size={18}/> Capital & Budget
        </button>
        <button 
            onClick={() => setActiveTab('market')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'market' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
            <TrendingUp size={18}/> Market Radar
        </button>
      </div>

      {activeTab === 'budget' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            {/* Input Form */}
            <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-orange-200 shadow-sm">
                    <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><Target size={20}/> Setup Details</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Your Location</label>
                            <div className="flex items-center gap-2 border rounded-lg p-2 focus-within:ring-2 ring-orange-200">
                                <MapPin size={18} className="text-orange-500"/>
                                <input 
                                    type="text" 
                                    className="w-full outline-none text-sm" 
                                    placeholder="e.g. Pune, Bihar, Satara"
                                    value={budgetLocation}
                                    onChange={e => setBudgetLocation(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Area Type</label>
                             <div className="grid grid-cols-2 gap-2">
                                 <button 
                                    onClick={() => setLocationType('Village')}
                                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all ${locationType === 'Village' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-200'}`}
                                 >
                                     <Trees size={16}/> Village
                                 </button>
                                 <button 
                                    onClick={() => setLocationType('City')}
                                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-all ${locationType === 'City' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-gray-200'}`}
                                 >
                                     <Building2 size={16}/> City
                                 </button>
                             </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Total Budget (₹)</label>
                            <div className="flex items-center gap-2 border rounded-lg p-2 focus-within:ring-2 ring-orange-200 bg-orange-50/50">
                                <IndianRupee size={18} className="text-orange-600"/>
                                <input 
                                    type="number" 
                                    className="w-full outline-none text-sm bg-transparent font-bold text-gray-800" 
                                    value={budgetAmount}
                                    onChange={e => setBudgetAmount(Number(e.target.value))}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Include cost for shed, birds, and feed.</p>
                        </div>

                         <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Available Space</label>
                            <select 
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                value={landType}
                                onChange={e => setLandType(e.target.value)}
                            >
                                <option>Backyard / Small Plot</option>
                                <option>Farm Land (Open Range)</option>
                                <option>Rented Shed</option>
                                <option>Terrace / Rooftop</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleGeneratePlan}
                            disabled={isPlanLoading}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isPlanLoading ? <Loader2 className="animate-spin" size={20}/> : <Wallet size={20}/>}
                            Generate Low-Cost Plan
                        </button>
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                    <p className="font-bold flex items-center gap-2 mb-1"><AlertCircle size={16}/> Pro Tip:</p>
                    Starting small reduces risk. This tool focuses on "Jugaad" methods to save capital on infrastructure so you can invest more in bird quality.
                </div>
            </div>

            {/* Output Area */}
            <div className="lg:col-span-8">
                {planResult ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full">
                        <div className="bg-orange-50 border-b border-orange-100 p-4">
                            <h2 className="text-lg font-bold text-orange-900">🚀 Your Custom Business Blueprint</h2>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[600px] prose prose-orange max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{planResult}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <Wallet size={48} className="mb-4 opacity-20"/>
                        <h3 className="text-lg font-semibold text-gray-500">No Plan Generated Yet</h3>
                        <p className="max-w-xs mt-2">Enter your budget and location details to get a breakdown of costs and revenue streams.</p>
                    </div>
                )}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
             {/* Market Input */}
             <div className="lg:col-span-4 space-y-4">
                 <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><BarChart2 size={20}/> Demand Analysis</h3>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Market Location (Sales)</label>
                            <div className="flex items-center gap-2 border rounded-lg p-2 focus-within:ring-2 ring-blue-200">
                                <MapPin size={18} className="text-blue-500"/>
                                <input 
                                    type="text" 
                                    className="w-full outline-none text-sm" 
                                    placeholder="e.g. Hyderabad, Delhi Mandi"
                                    value={marketLocation}
                                    onChange={e => setMarketLocation(e.target.value)}
                                />
                            </div>
                        </div>

                         <div>
                            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Breed to Sell</label>
                            <select 
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                value={breed}
                                onChange={e => setBreed(e.target.value)}
                            >
                                <option>Gavran (Desi)</option>
                                <option>Kadaknath</option>
                                <option>Broiler (Commercial)</option>
                                <option>Sonali</option>
                                <option>Duck</option>
                            </select>
                        </div>
                        
                         <button 
                            onClick={handleMarketCheck}
                            disabled={isMarketLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isMarketLoading ? <Loader2 className="animate-spin" size={20}/> : <Target size={20}/>}
                            Scan Market Demand
                        </button>
                     </div>
                 </div>
                 
                 <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-sm text-yellow-800">
                    <p className="font-bold flex items-center gap-2 mb-1"><Calendar size={16}/> Timing is Everything</p>
                    This tool checks for upcoming festivals (Holi, Eid, etc.) in your area to help you sell when prices are highest.
                </div>
             </div>

             {/* Output Area */}
             <div className="lg:col-span-8">
                 {marketResult ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden h-full">
                        <div className="bg-blue-50 border-b border-blue-100 p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-blue-900">📡 Live Market Intelligence</h2>
                            <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-100 font-semibold">Updated Just Now</span>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[600px] prose prose-blue max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{marketResult}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                        <TrendingUp size={48} className="mb-4 opacity-20"/>
                        <h3 className="text-lg font-semibold text-gray-500">Market Data Waiting...</h3>
                        <p className="max-w-xs mt-2">Enter your location and breed to find Dealer Rates, Demand Spikes, and Buyer Contacts.</p>
                    </div>
                )}
             </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPlanner;