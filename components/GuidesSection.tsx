import React, { useState, useEffect } from 'react';
import { ThermometerSun, Egg, Truck, LayoutGrid, Image as ImageIcon, Loader2, RefreshCw, Thermometer, MapPin } from 'lucide-react';
import { generateFarmingImage, getWeatherAndBroodingAdvice, WeatherAdvice } from '../services/geminiService';

type Tab = 'brooding' | 'incubation' | 'housing' | 'transport';

const GuidesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('brooding');
  // Unified state for all guide images
  const [guideImages, setGuideImages] = useState<Record<string, string>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  
  // Brooding Weather Check State
  const [weatherAdvice, setWeatherAdvice] = useState<WeatherAdvice | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const userLocation = localStorage.getItem('user_location') || 'New Delhi';

  useEffect(() => {
      // Auto-load weather advice when Brooding tab is active
      if (activeTab === 'brooding' && !weatherAdvice) {
          handleCheckWeather();
      }
  }, [activeTab]);

  const handleCheckWeather = async () => {
      setWeatherLoading(true);
      const advice = await getWeatherAndBroodingAdvice(userLocation);
      setWeatherAdvice(advice);
      setWeatherLoading(false);
  };

  const handleGenerateImage = async (key: string) => {
    setLoadingKey(key);
    let prompt = "";
    
    if (key === 'brooding_setup') {
        prompt = "A clear technical illustration of a low-cost poultry brooding setup in India. Circular bamboo chick guard (dhaan ki bhusi on floor). A red hanging bulb in the center. Small water and feed pots arranged in a circle. Simple, educational sketch.";
    } else if (key === 'brooding_temp') {
        prompt = "An educational diagram showing 3 overhead views of Chick Temperature Behavior in a brooder. 1. Cold: Chicks huddled in center under bulb. 2. Hot: Chicks at edges away from bulb. 3. Correct: Chicks evenly spread. Simple vector style.";
    } else if (key === 'incubation_kuduk') {
        prompt = "A realistic pencil sketch of a rural Indian 'Kuduk' hen (Broody Hen) sitting on eggs in a traditional bamboo basket (Tokri) lined with dry straw. Placed in a quiet corner of a village house. Educational.";
    } else if (key === 'housing_cage') {
        prompt = "A technical blueprint diagram of a 3-layer poultry cage system for backyard farming. Showing welded wire mesh structure, feeding trough attached to front, water nipple pipe. Clear dimensions and structure. White background.";
    }

    const imgUrl = await generateFarmingImage(prompt);
    if (imgUrl) {
        setGuideImages(prev => ({ ...prev, [key]: imgUrl }));
    }
    setLoadingKey(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Farming Guides & SOPs</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveTab('brooding')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'brooding' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}>
            <ThermometerSun size={18}/> Brooding (Jugaad)
        </button>
        <button onClick={() => setActiveTab('incubation')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'incubation' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}>
            <Egg size={18}/> Incubation & Kuduk
        </button>
        <button onClick={() => setActiveTab('housing')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'housing' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}>
            <LayoutGrid size={18}/> Cage/Rack Setup
        </button>
        <button onClick={() => setActiveTab('transport')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'transport' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 border'}`}>
            <Truck size={18}/> All India Transport
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
        
        {/* BROODING */}
        {activeTab === 'brooding' && (
            <div className="space-y-6 animate-in fade-in">
                
                {/* AI Weather Advice Section */}
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                           <Thermometer size={20}/> Live Environment Check
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-orange-700 bg-white/50 px-2 py-1 rounded">
                            <MapPin size={12}/> {userLocation}
                            <button onClick={handleCheckWeather} className="hover:text-orange-900"><RefreshCw size={12} className={weatherLoading ? 'animate-spin' : ''}/></button>
                        </div>
                    </div>
                    
                    {weatherLoading ? (
                        <div className="flex items-center gap-2 py-4 text-orange-600 text-sm">
                            <Loader2 size={16} className="animate-spin"/> Analyzing local weather...
                        </div>
                    ) : weatherAdvice ? (
                        <div className="mt-3 grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <p className="text-xs text-gray-500 font-semibold uppercase">Current Condition</p>
                                <p className="text-xl font-bold text-gray-800">{weatherAdvice.temp} <span className="text-sm font-normal text-gray-500">| {weatherAdvice.humidity}</span></p>
                                <p className="text-xs text-gray-500">{weatherAdvice.condition}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-orange-400">
                                <p className="text-xs text-orange-600 font-bold uppercase mb-1">AI Recommendation</p>
                                <p className="text-sm text-gray-800 font-medium leading-relaxed">{weatherAdvice.broodingTip}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-3 text-sm text-orange-700 italic">
                            Click refresh to get live brooding advice based on your location.
                        </div>
                    )}
                </div>

                <h2 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                    Low Cost Brooding Guide
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-normal">0-4 Weeks</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Setup Section */}
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-gray-800">1. Step-by-Step Setup</h3>
                            <button 
                                onClick={() => handleGenerateImage('brooding_setup')}
                                disabled={loadingKey === 'brooding_setup'}
                                className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                            >
                                {loadingKey === 'brooding_setup' ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
                                {guideImages['brooding_setup'] ? 'Regenerate Diagram' : 'View Visual Diagram'}
                            </button>
                        </div>
                        
                        {/* Image Preview Area */}
                        {guideImages['brooding_setup'] && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                <img src={guideImages['brooding_setup']} alt="Brooding Setup" className="w-full h-48 object-cover object-center hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-medium">AI Generated Illustration of Indian Setup</span>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex-1">
                            <ul className="list-disc list-inside space-y-3 text-gray-700 text-sm">
                                <li><strong>Space:</strong> Start with small circular area (Chick Guard). Avoid corners to prevent piling up.</li>
                                <li><strong>Bedding (Litter):</strong> Use Rice Husk (Dhaan ki bhusi) or Wood Shavings (Buraada). Thickness: 2-3 inches.</li>
                                <li><strong>Heating (Jugaad):</strong> Use 100W/200W bulbs. 
                                    <br/><span className="text-xs bg-white border px-1 rounded ml-4 mt-1 inline-block text-orange-600">Rule: 2 Watt per chick in winter, 1 Watt in summer.</span>
                                </li>
                                <li><strong>Paper:</strong> Spread newspaper over bedding for first 3 days only. Sprinkle feed on paper.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Temperature Section */}
                    <div className="flex flex-col h-full">
                         <div className="flex justify-between items-center mb-3">
                             <h3 className="font-bold text-gray-800">2. Temperature & Comfort</h3>
                             <button 
                                onClick={() => handleGenerateImage('brooding_temp')}
                                disabled={loadingKey === 'brooding_temp'}
                                className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                            >
                                {loadingKey === 'brooding_temp' ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
                                {guideImages['brooding_temp'] ? 'Regenerate Guide' : 'View Visual Guide'}
                            </button>
                         </div>

                         {/* Image Preview Area */}
                         {guideImages['brooding_temp'] && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                                <img src={guideImages['brooding_temp']} alt="Chick Behavior" className="w-full h-48 object-cover object-top hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-medium">Visual Guide: Huddling vs Scattered</span>
                                </div>
                            </div>
                        )}

                         <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
                             <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr><th className="p-3 text-left">Week</th><th className="p-3 text-left">Temp (°F)</th><th className="p-3 text-left">Observation</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr><td className="p-3">Week 1</td><td className="p-3 font-bold">95°F</td><td className="p-3 text-green-700">Chicks evenly spread</td></tr>
                                    <tr><td className="p-3">Week 2</td><td className="p-3 font-bold">90°F</td><td className="p-3">Reduce 1 bulb</td></tr>
                                    <tr><td className="p-3">Week 3</td><td className="p-3 font-bold">85°F</td><td className="p-3">Active movement</td></tr>
                                    <tr><td className="p-3">Week 4</td><td className="p-3 font-bold">80°F</td><td className="p-3 text-gray-500">Remove heating</td></tr>
                                </tbody>
                             </table>
                             <div className="p-3 bg-yellow-50 text-xs text-yellow-800 border-t border-yellow-100">
                                 <strong>Pro Tip:</strong> Watch the chicks, not just the thermometer. If they are huddling, it's cold!
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* INCUBATION */}
        {activeTab === 'incubation' && (
            <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                    <h2 className="text-xl font-bold text-orange-800">Hatching & Broody Hen (Kuduk) Control</h2>
                    <button 
                        onClick={() => handleGenerateImage('incubation_kuduk')}
                        disabled={loadingKey === 'incubation_kuduk'}
                        className="text-xs flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 disabled:opacity-50 transition-colors w-fit"
                    >
                        {loadingKey === 'incubation_kuduk' ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
                        {guideImages['incubation_kuduk'] ? 'Regenerate Sketch' : 'View Kuduk Nest Setup'}
                    </button>
                </div>
                
                {/* Image Preview for Incubation */}
                {guideImages['incubation_kuduk'] && (
                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group max-w-lg mx-auto md:mx-0">
                        <img src={guideImages['incubation_kuduk']} alt="Kuduk Hen Setup" className="w-full h-56 object-cover object-center hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium">Illustration: Traditional Indian Nesting</span>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-green-700">Egg Selection Tips</h3>
                         <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
                            <li>Select clean, medium-sized oval eggs. Avoid round or pointed eggs.</li>
                            <li>Do not use eggs older than 7 days. Store pointed end down.</li>
                            <li><strong>Candling:</strong> Check on Day 7 and Day 18. Remove clear eggs (infertile).</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-red-700">Breaking Broodiness (Kuduk Pan)</h3>
                        <p className="text-sm text-gray-600 mb-2">If hen sits on eggs but you want eggs for eating:</p>
                        <ul className="list-decimal list-inside space-y-2 text-gray-700 text-sm">
                            <li>Isolate hen in a cage with wire mesh floor (air flow from bottom cools body temp).</li>
                            <li>Provide plenty of water and feed.</li>
                            <li>Dip the hen (body only, not head) in cold water for 2-3 seconds (Traditional method).</li>
                            <li>Release back to flock after 3 days.</li>
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {/* HOUSING */}
        {activeTab === 'housing' && (
             <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                    <h2 className="text-xl font-bold text-orange-800">5-Layer High Density Rack System</h2>
                    <button 
                        onClick={() => handleGenerateImage('housing_cage')}
                        disabled={loadingKey === 'housing_cage'}
                        className="text-xs flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors w-fit"
                    >
                        {loadingKey === 'housing_cage' ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14}/>}
                        {guideImages['housing_cage'] ? 'Regenerate Blueprint' : 'View Cage Design'}
                    </button>
                </div>
                <p className="text-gray-600 text-sm">Ideal for city farming or limited space.</p>
                
                 {/* Image Preview for Housing */}
                 {guideImages['housing_cage'] && (
                    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group max-w-lg">
                        <img src={guideImages['housing_cage']} alt="Cage Design" className="w-full h-64 object-cover object-center hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium">Blueprint: Vertical Cage System</span>
                        </div>
                    </div>
                )}

                <div className="border p-4 rounded bg-gray-50">
                    <h3 className="font-bold mb-2">Design Specs (Example)</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p><strong>Total Height:</strong> 6 to 7 feet.</p>
                            <p><strong>Layer Height:</strong> 1.5 feet per layer.</p>
                            <p><strong>Width:</strong> 3 feet | <strong>Length:</strong> 5-10 feet.</p>
                        </div>
                        <div>
                             <p><strong>Flooring:</strong> Welded wire mesh (1/2 x 1 inch).</p>
                             <p><strong>Waste Tray:</strong> Slide-out plastic/metal sheet below mesh.</p>
                             <p><strong>Capacity:</strong> 50 chicks or 15 adults per layer (for 5ft length).</p>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                    <strong>Tip:</strong> Ensure nipple drinkers are outside the cage to keep litter dry.
                </div>
            </div>
        )}

         {/* TRANSPORT */}
         {activeTab === 'transport' && (
            <div className="space-y-4 animate-in fade-in">
                <h2 className="text-xl font-bold text-orange-800">All India Transport SOP</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2">Packaging Chicks</h3>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 text-sm">
                            <li>Use standardized Corrugated Boxes with dividers (4 compartments).</li>
                            <li><strong>Ventilation:</strong> Punch holes on sides and top. Increase holes in summer.</li>
                            <li><strong>Feed Gel:</strong> Use hydrated gel or cucumber slices for moisture (No water bowls).</li>
                            <li><strong>Winter:</strong> Pack tight to retain heat. <strong>Summer:</strong> Reduce count by 20%.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Logistics Checklist</h3>
                        <div className="bg-gray-100 p-3 rounded text-sm space-y-2">
                             <div className="flex justify-between">
                                <span>1. Health Certificate from Vet</span>
                                <span className="text-green-600">✔ Required</span>
                             </div>
                             <div className="flex justify-between">
                                <span>2. Train Booking (Parcel Office)</span>
                                <span className="text-green-600">✔ 4 hours before</span>
                             </div>
                             <div className="flex justify-between">
                                <span>3. Receiver ID Proof</span>
                                <span className="text-green-600">✔ Mandatory</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default GuidesSection;