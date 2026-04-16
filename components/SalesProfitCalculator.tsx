import React, { useState, useEffect } from 'react';
import { IndianRupee, Calculator, Sparkles, Loader2, AlertCircle, Globe, ExternalLink, RefreshCw, TrendingUp, MapPin, Calendar, Clock, BarChart3 } from 'lucide-react';
import { BREEDS_LIST } from '../constants';
import { fetchRealTimePrices, generateSalesStrategy, MarketPriceResult } from '../services/geminiService';
// @ts-ignore
import ReactMarkdown from 'react-markdown';
// @ts-ignore
import remarkGfm from 'remark-gfm';

const INDIAN_STATES = [
  "All India", "Maharashtra", "Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Solapur", 
  "Kolhapur", "Amravati", "Nanded", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar", 
  "Chandrapur", "Parbhani", "Ichalkaranji", "Jalna", "Bhusawal", "Navi Mumbai", "Thane",
  "Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Punjab", "Haryana", 
  "West Bengal", "Odisha", "Madhya Pradesh", "Uttar Pradesh", "Bihar", "Kerala", 
  "Gujarat", "Rajasthan"
];

const SalesProfitCalculator: React.FC = () => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'instant' | 'projection'>('instant');
  const [projectionView, setProjectionView] = useState<'weekly' | 'monthly'>('weekly');

  // Inputs
  const [selectedBreed, setSelectedBreed] = useState<string>(BREEDS_LIST[0]);
  const [selectedLocation, setSelectedLocation] = useState<string>(INDIAN_STATES[0]);
  const [numBirds, setNumBirds] = useState(100);
  const [avgWeight, setAvgWeight] = useState(1.5); // kg (Target for Instant)
  
  // Cost Inputs
  const [feedCostTotal, setFeedCostTotal] = useState(15000); // For Instant
  const [feedPricePerKg, setFeedPricePerKg] = useState(35); // For Projection
  const [chickPrice, setChickPrice] = useState(40); // Per chick cost
  
  const [medCost, setMedCost] = useState(500);
  const [otherCost, setOtherCost] = useState(1000); // Electricity, Labour
  const [transportCost, setTransportCost] = useState(1200);
  const [mortalityCount, setMortalityCount] = useState(5);
  
  // Sales Strategy
  const [sellingPrice, setSellingPrice] = useState(250); // per kg

  // Outputs (Instant)
  const [totalCost, setTotalCost] = useState(0);
  const [costPerBird, setCostPerBird] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [profit, setProfit] = useState(0);
  const [breakeven, setBreakeven] = useState(0);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Market Data & AI Strategy State
  const [marketData, setMarketData] = useState<MarketPriceResult | null>(null);
  const [aiStrategy, setAiStrategy] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Basic validation logic for calculation
    const liveBirds = Math.max(0, numBirds - mortalityCount);
    
    // Check if any critical inputs are invalid
    if (numBirds < 0 || avgWeight < 0 || feedCostTotal < 0 || medCost < 0 || otherCost < 0 || transportCost < 0 || sellingPrice < 0) {
      return; 
    }

    const totalProductionCost = feedCostTotal + medCost + otherCost + transportCost + (numBirds * chickPrice); // Added chick cost to logic
    const totalWeight = liveBirds * avgWeight;
    
    // Calculations
    setTotalCost(totalProductionCost);
    setCostPerBird(liveBirds > 0 ? totalProductionCost / liveBirds : 0);
    setBreakeven(totalWeight > 0 ? totalProductionCost / totalWeight : 0);
    
    const revenue = totalWeight * sellingPrice;
    setTotalRevenue(revenue);
    setProfit(revenue - totalProductionCost);

  }, [numBirds, avgWeight, feedCostTotal, medCost, otherCost, transportCost, mortalityCount, sellingPrice, chickPrice]);

  const validateInput = (field: string, value: number) => {
    let error = '';
    if (value < 0) {
      error = 'Cannot be negative';
    } else if (field === 'numBirds' && !Number.isInteger(value)) {
      error = 'Must be whole number';
    } else if (field === 'mortalityCount' && value > numBirds) {
      error = 'Cannot exceed total birds';
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error === '';
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>, field: string, value: string) => {
    const numVal = Number(value);
    validateInput(field, numVal);
    setter(numVal);
  };

  const handleAnalysis = async () => {
    if (breakeven === 0) {
      alert("Please enter valid cost details first.");
      return;
    }
    
    setIsAnalyzing(true);
    setMarketData(null);
    setAiStrategy('');

    // Step 1: Fetch Live Market Prices with Location
    const marketResult = await fetchRealTimePrices(selectedBreed, selectedLocation);
    setMarketData(marketResult);

    // Step 2: Generate Strategy based on Market Data + User Cost + Location
    const strategy = await generateSalesStrategy({
      breed: selectedBreed,
      location: selectedLocation,
      costPerKg: breakeven,
      totalBirds: numBirds - mortalityCount,
      marketInfo: marketResult.text
    });
    setAiStrategy(strategy);

    setIsAnalyzing(false);
  };

  // --- PROJECTION LOGIC ---
  const generateProjectionData = () => {
    // Determine growth curve category
    const isDesi = selectedBreed.includes('Gavran') || 
                   selectedBreed.includes('Aseel') || 
                   selectedBreed.includes('Kadaknath') || 
                   selectedBreed.includes('Sonali') ||
                   selectedBreed.includes('RIR') ||
                   selectedBreed.includes('Australorp');
    
    const weeks = 20;
    let currentWeight = 0.04; // Start at 40g
    let cumulativeFeed = 0;
    const data = [];

    const fixedCostPerBird = (medCost + otherCost + transportCost) / numBirds;

    for (let w = 1; w <= weeks; w++) {
        // Growth Logic (Approximation)
        let weeklyGain = 0;
        let weeklyFeed = 0;

        if (isDesi) {
            // Desi/Pure/Slower breeds (Gavran, Kadaknath, RIR, Sonali, Australorp)
            if(w <= 4) { weeklyGain = 0.05; weeklyFeed = 0.10; } // Chicks
            else if (w <= 8) { weeklyGain = 0.10; weeklyFeed = 0.25; } // Growers
            else { weeklyGain = 0.08; weeklyFeed = 0.40; } // Adults
        } else {
            // Commercial/Improved breeds (Vanaraja, Kaveri, Giriraja)
            if(w <= 4) { weeklyGain = 0.15; weeklyFeed = 0.25; } 
            else if (w <= 8) { weeklyGain = 0.30; weeklyFeed = 0.60; }
            else { weeklyGain = 0.15; weeklyFeed = 0.80; }
        }

        currentWeight += weeklyGain;
        cumulativeFeed += weeklyFeed;

        const feedCost = cumulativeFeed * feedPricePerKg;
        const totalCostPerBird = chickPrice + feedCost + fixedCostPerBird;
        const estValue = currentWeight * sellingPrice;

        data.push({
            week: w,
            month: Math.ceil(w/4),
            phase: w <= 4 ? 'Chick' : w <= 8 ? 'Grower' : 'Adult',
            weight: currentWeight,
            feedKg: cumulativeFeed,
            cost: totalCostPerBird,
            revenue: estValue,
            profit: estValue - totalCostPerBird
        });
    }
    return data;
  };

  const projectionData = generateProjectionData();

  const getMonthlyData = () => {
      const monthly = [];
      for(let m=1; m<=5; m++) {
          const weekData = projectionData.find(d => d.month === m && d.week % 4 === 0);
          if (weekData) monthly.push(weekData);
      }
      return monthly;
  };

  const displayData = projectionView === 'weekly' ? projectionData : getMonthlyData();

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Sales & Profit Calculator</h1>
        
        {/* Top Tabs */}
        <div className="bg-gray-200 p-1 rounded-lg flex items-center">
            <button 
                onClick={() => setActiveTab('instant')}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'instant' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
                <Calculator size={16} /> Instant Analysis
            </button>
            <button 
                onClick={() => setActiveTab('projection')}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${activeTab === 'projection' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
            >
                <TrendingUp size={16} /> Growth Projection
            </button>
        </div>
      </div>

      {activeTab === 'instant' ? (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
        {/* Input Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Calculator size={20}/> Cost Inputs</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                 {/* Breed Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Breed</label>
                    <select 
                        className="w-full p-2 border rounded bg-gray-50 border-gray-300"
                        value={selectedBreed}
                        onChange={(e) => {
                            setSelectedBreed(e.target.value);
                            setMarketData(null);
                            setAiStrategy('');
                        }}
                    >
                        {BREEDS_LIST.map(breed => (
                            <option key={breed} value={breed}>{breed}</option>
                        ))}
                    </select>
                </div>
                
                {/* Location Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <MapPin size={14} className="text-orange-600"/> Location
                    </label>
                    <select 
                        className="w-full p-2 border rounded bg-gray-50 border-gray-300"
                        value={selectedLocation}
                        onChange={(e) => {
                            setSelectedLocation(e.target.value);
                            setMarketData(null);
                            setAiStrategy('');
                        }}
                    >
                        {INDIAN_STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Total Birds Started</label>
                <input 
                  type="number" 
                  min="0"
                  className={`w-full p-2 border rounded ${errors.numBirds ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={numBirds} 
                  onChange={e => handleInputChange(setNumBirds, 'numBirds', e.target.value)} 
                />
                {errors.numBirds && <p className="text-red-500 text-xs mt-1">{errors.numBirds}</p>}
              </div>
               <div>
                <label className="block text-sm text-gray-600 mb-1">Buying Price/Chick (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-2 border rounded border-gray-300"
                  value={chickPrice} 
                  onChange={e => handleInputChange(setChickPrice, 'chickPrice', e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-sm text-gray-600 mb-1">Total Feed Cost (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  className={`w-full p-2 border rounded ${errors.feedCostTotal ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={feedCostTotal} 
                  onChange={e => handleInputChange(setFeedCostTotal, 'feedCostTotal', e.target.value)} 
                />
                {errors.feedCostTotal && <p className="text-red-500 text-xs mt-1">{errors.feedCostTotal}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Target Avg Weight (kg)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1" 
                  className={`w-full p-2 border rounded ${errors.avgWeight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={avgWeight} 
                  onChange={e => handleInputChange(setAvgWeight, 'avgWeight', e.target.value)} 
                />
                {errors.avgWeight && <p className="text-red-500 text-xs mt-1">{errors.avgWeight}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
               <div>
                 <label className="block text-xs text-gray-600 mb-1">Mortality (Count)</label>
                 <input 
                  type="number" 
                  min="0"
                  className={`w-full p-2 border rounded text-red-600 ${errors.mortalityCount ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={mortalityCount} 
                  onChange={e => handleInputChange(setMortalityCount, 'mortalityCount', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Medicine (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  className={`w-full p-2 border rounded ${errors.medCost ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={medCost} 
                  onChange={e => handleInputChange(setMedCost, 'medCost', e.target.value)} 
                />
              </div>
               <div>
                <label className="block text-xs text-gray-600 mb-1">Other/Transp. (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full p-2 border rounded border-gray-300"
                  value={transportCost + otherCost} 
                  onChange={e => {
                      const val = Number(e.target.value);
                      setTransportCost(val * 0.5);
                      setOtherCost(val * 0.5);
                  }} 
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-bold text-green-700 mb-1">Your Selling Price per Kg (₹)</label>
              <input 
                type="number" 
                min="0"
                className={`w-full p-2 border-2 rounded font-bold text-lg ${errors.sellingPrice ? 'border-red-500 bg-red-50' : 'border-green-200'}`}
                value={sellingPrice} 
                onChange={e => handleInputChange(setSellingPrice, 'sellingPrice', e.target.value)} 
              />
              {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          
          <div className="bg-gray-800 text-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-gray-300 mb-4">Financial Overview</h3>
            
            {Object.keys(errors).length > 0 && Object.values(errors).some(e => e !== '') ? (
               <div className="flex flex-col items-center justify-center py-8 text-yellow-400 gap-2">
                 <AlertCircle size={32} />
                 <p className="text-sm">Please correct errors to see results</p>
               </div>
            ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-400">₹ {totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Net Profit</p>
                  <p className={`text-3xl font-bold ${profit >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                    ₹ {profit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-2 gap-4">
                  <div>
                      <p className="text-gray-400 text-xs">Total Expense</p>
                      <p className="font-semibold">₹ {totalCost.toLocaleString()}</p>
                  </div>
                  <div>
                      <p className="text-gray-400 text-xs">Cost Per Bird (Alive)</p>
                      <p className="font-semibold">₹ {costPerBird.toFixed(2)}</p>
                  </div>
              </div>
            </>
            )}
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
             <div className="flex justify-between items-center mb-4 border-b border-blue-200 pb-2">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" /> AI Market Intelligence
                </h3>
                <button 
                    onClick={handleAnalysis}
                    disabled={isAnalyzing}
                    className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
                >
                    {isAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                    {isAnalyzing ? 'Analyzing...' : 'Analyze & Optimize'}
                </button>
             </div>

             {!marketData && !aiStrategy && (
               <div className="text-center py-6 text-blue-800 opacity-60">
                 <Globe size={32} className="mx-auto mb-2" />
                 <p className="text-sm">Select State & Click "Analyze" for personalized pricing.</p>
               </div>
             )}
             
             {/* Market Data Section */}
             {marketData && (
                <div className="animate-in fade-in mb-4">
                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">
                      Live Market Trends ({selectedLocation})
                    </h4>
                    <div className="bg-white p-4 rounded-lg border border-blue-100 text-sm text-gray-800 max-h-48 overflow-y-auto mb-2 shadow-sm">
                        <div className="prose prose-sm prose-blue max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {marketData.text}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
             )}

             {/* AI Strategy Section */}
             {aiStrategy && (
                <div className="animate-in slide-in-from-bottom-2 mt-4 border-t border-blue-200 pt-4">
                   <h4 className="text-xs font-bold text-purple-700 uppercase mb-2 flex items-center gap-1">
                     <Sparkles size={12}/> AI Strategy & Recommendation
                   </h4>
                   <div className="bg-white p-5 rounded-lg border border-purple-200 text-gray-800 text-sm leading-relaxed shadow-sm">
                      <div className="prose prose-sm prose-purple max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {aiStrategy}
                        </ReactMarkdown>
                      </div>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
      ) : (
        // --- PROJECTION TAB ---
        <div className="animate-in fade-in space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-200">
                <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2"><BarChart3 size={20}/> Growth & Cost Projection ({selectedBreed})</h3>
                
                {/* Projection Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Buying Price/Chick (₹)</label>
                        <input type="number" value={chickPrice} onChange={e => setChickPrice(Number(e.target.value))} className="w-full p-2 border rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Feed Price (₹/kg)</label>
                        <input type="number" value={feedPricePerKg} onChange={e => setFeedPricePerKg(Number(e.target.value))} className="w-full p-2 border rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Selling Price (₹/kg)</label>
                        <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full p-2 border rounded"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">View Mode</label>
                        <div className="flex bg-gray-100 rounded p-1">
                            <button 
                                onClick={() => setProjectionView('weekly')}
                                className={`flex-1 text-xs py-1.5 rounded ${projectionView === 'weekly' ? 'bg-white shadow text-orange-700 font-bold' : 'text-gray-500'}`}
                            >
                                Weekly (Chicks)
                            </button>
                            <button 
                                onClick={() => setProjectionView('monthly')}
                                className={`flex-1 text-xs py-1.5 rounded ${projectionView === 'monthly' ? 'bg-white shadow text-orange-700 font-bold' : 'text-gray-500'}`}
                            >
                                Monthly (Adults)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-orange-50 text-orange-900 font-semibold">
                            <tr>
                                <th className="p-3">{projectionView === 'weekly' ? 'Week' : 'Month'}</th>
                                <th className="p-3">Phase</th>
                                <th className="p-3">Avg Weight (Kg)</th>
                                <th className="p-3">Feed Consumed (Kg)</th>
                                <th className="p-3">Total Cost (₹/Bird)</th>
                                <th className="p-3">Est. Value (₹)</th>
                                <th className="p-3">Profit/Loss (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayData.map((row, idx) => (
                                <tr key={idx} className={`hover:bg-gray-50 ${row.profit > 0 ? 'bg-green-50/30' : ''}`}>
                                    <td className="p-3 font-medium text-gray-700">
                                        {projectionView === 'weekly' ? `Week ${row.week}` : `Month ${row.month}`}
                                    </td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs border ${
                                            row.phase === 'Chick' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
                                            row.phase === 'Grower' ? 'bg-blue-100 border-blue-200 text-blue-800' :
                                            'bg-green-100 border-green-200 text-green-800'
                                        }`}>
                                            {row.phase}
                                        </span>
                                    </td>
                                    <td className="p-3">{row.weight.toFixed(2)}</td>
                                    <td className="p-3">{row.feedKg.toFixed(2)}</td>
                                    <td className="p-3 text-red-600 font-medium">₹ {Math.ceil(row.cost)}</td>
                                    <td className="p-3 text-gray-800 font-medium">₹ {Math.ceil(row.revenue)}</td>
                                    <td className={`p-3 font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {row.profit >= 0 ? '+' : ''}₹ {Math.ceil(row.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-xs text-gray-500 italic">
                    * Projections are estimates based on standard growth curves for {selectedBreed}. Actual results may vary based on feed quality and management.
                </p>
             </div>
        </div>
      )}

    </div>
  );
};

export default SalesProfitCalculator;