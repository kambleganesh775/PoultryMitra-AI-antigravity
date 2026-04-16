import React, { useState, useEffect } from 'react';
import { Chick, Breed, SalesRecord, Expense } from '../types';
import { BREEDS_LIST } from '../constants';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { exportService } from '../services/exportUtils';
import { Plus, Trash2, Search, Scale, AlertCircle, Calendar, Egg, Bird, IndianRupee, Skull, ArrowRightLeft, TrendingUp, Pencil, BarChart2, X, Package, Syringe, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

const ChicksManager: React.FC = () => {
  const { chicks, sales, expenses, isLoading } = useData();
  const [filter, setFilter] = useState<'all' | 'chick' | 'adult'>('all');
  const [isAdding, setIsAdding] = useState(false);
  
  // Modals
  const [activeModal, setActiveModal] = useState<'sell' | 'mortality' | 'edit' | 'reports' | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'inventory' | 'financial'>('inventory');
  
  // Add Batch Form State
  const [entryMode, setEntryMode] = useState<'date' | 'age'>('date'); 
  const [ageInput, setAgeInput] = useState<number>(0);
  // Purchase Mode State
  const [purchaseMode, setPurchaseMode] = useState<'count' | 'weight'>('count');
  const [purchaseRate, setPurchaseRate] = useState<number>(0); // Rate per Bird or Rate per Kg
  const [purchaseTotalWeight, setPurchaseTotalWeight] = useState<number>(0); // Only for weight mode

  const [newChick, setNewChick] = useState<Partial<Chick>>({ breed: Breed.GAVRAN, source: 'Natural', status: 'Active', initialWeight: 0, initialCount: 1, purchaseCost: 0 });
  
  // Edit State
  const [editingBatch, setEditingBatch] = useState<Chick | null>(null);

  // Sales Modal State
  const [saleMode, setSaleMode] = useState<'kg' | 'count'>('kg');
  const [saleInput, setSaleInput] = useState({ quantity: 0, weight: 0, rate: 0, buyer: '' });
  
  // Mortality State
  const [mortalityInput, setMortalityInput] = useState({ count: 0, reason: '' });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Tags State
  const [tagsInput, setTagsInput] = useState<string>('');
  const [editTagsInput, setEditTagsInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auto-calculate Purchase Cost when inputs change
  useEffect(() => {
    if (!isAdding) return;
    let cost = 0;
    const qty = Number(newChick.initialCount) || 0;
    
    if (purchaseMode === 'count') {
        cost = qty * purchaseRate;
    } else {
        cost = purchaseTotalWeight * purchaseRate;
    }
    setNewChick(prev => ({ ...prev, purchaseCost: cost }));
    
    // Also estimate avg weight if buying by weight
    if (purchaseMode === 'weight' && qty > 0 && purchaseTotalWeight > 0) {
         // Convert kg to grams for initialWeight
         const avgGrams = (purchaseTotalWeight / qty) * 1000;
         setNewChick(prev => ({ ...prev, initialWeight: Number(avgGrams.toFixed(0)) }));
    }
  }, [purchaseMode, purchaseRate, purchaseTotalWeight, newChick.initialCount, isAdding]);

  const calculateAge = (hatchDate: string) => {
    const start = new Date(hatchDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    const weeks = Math.floor(diffDays / 7);
    return { days: diffDays, weeks, label: weeks > 0 ? `${weeks} Weeks` : `${diffDays} Days` };
  };

  const getBatchCostBreakdown = (batchId: string) => {
      const batchExpenses = expenses.filter(e => e.flockId === batchId);
      
      const feed = batchExpenses.filter(e => e.category === 'Feed').reduce((sum, e) => sum + e.amount, 0);
      const health = batchExpenses.filter(e => ['Medicine', 'Vaccine'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
      const purchase = batchExpenses.filter(e => e.category === 'Bird Purchase').reduce((sum, e) => sum + e.amount, 0);
      const other = batchExpenses.filter(e => !['Feed', 'Medicine', 'Vaccine', 'Bird Purchase'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);
      
      return { feed, health, purchase, other, total: feed + health + purchase + other };
  };

  const filteredChicks = chicks.filter(c => {
    if (c.status === 'Completed') return false;
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTag = c.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesNotes = c.notes?.toLowerCase().includes(query);
        const matchesBreed = c.breed.toLowerCase().includes(query);
        if (!matchesTag && !matchesNotes && !matchesBreed) return false;
    }
    
    const { weeks } = calculateAge(c.hatchDate);
    if (filter === 'chick') return weeks < 8;
    if (filter === 'adult') return weeks >= 8;
    return true;
  });

  // --- Summary Calculations ---
  const getInventorySummary = () => {
    const active = chicks.filter(c => c.status === 'Active');
    // Key is week number
    const weeklyChicks: Record<number, { count: number, batches: number, breeds: Set<string> }> = {};
    // Key is month number
    const monthlyAdults: Record<number, { count: number, batches: number, breeds: Set<string> }> = {};

    active.forEach(c => {
        const { weeks } = calculateAge(c.hatchDate);
        if (weeks < 8) {
             if (!weeklyChicks[weeks]) weeklyChicks[weeks] = { count: 0, batches: 0, breeds: new Set() };
             weeklyChicks[weeks].count += c.currentCount;
             weeklyChicks[weeks].batches += 1;
             weeklyChicks[weeks].breeds.add(c.breed);
        } else {
             const months = Math.floor(weeks / 4);
             if (!monthlyAdults[months]) monthlyAdults[months] = { count: 0, batches: 0, breeds: new Set() };
             monthlyAdults[months].count += c.currentCount;
             monthlyAdults[months].batches += 1;
             monthlyAdults[months].breeds.add(c.breed);
        }
    });
    return { weeklyChicks, monthlyAdults };
  };

  const getFinancialSummary = () => {
    const monthlyStats: Record<string, { income: number, expense: number }> = {};
    
    // Process Sales
    sales.forEach(s => {
        const m = s.date.substring(0, 7); // YYYY-MM
        if (!monthlyStats[m]) monthlyStats[m] = { income: 0, expense: 0 };
        monthlyStats[m].income += s.totalAmount;
    });

    // Process Expenses
    expenses.filter(e => e.type !== 'Usage').forEach(e => {
        const m = e.date.substring(0, 7);
        if (!monthlyStats[m]) monthlyStats[m] = { income: 0, expense: 0 };
        monthlyStats[m].expense += e.amount;
    });

    // Convert to Array and Sort Descending
    return Object.entries(monthlyStats)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([month, data]) => ({ month, ...data }));
  };

  // --- EXPORT HANDLERS ---
  const handleExportReport = (type: 'excel' | 'pdf') => {
      const fileName = `Flock_Report_${reportTab}_${new Date().toISOString().split('T')[0]}`;
      
      if (reportTab === 'inventory') {
          const { weeklyChicks, monthlyAdults } = getInventorySummary();
          const data = [];
          
          // Flatten Inventory Data
          Object.entries(weeklyChicks).forEach(([week, d]) => {
              data.push({ Stage: 'Chick', Age: `Week ${week}`, Count: d.count, Batches: d.batches, Breeds: Array.from(d.breeds).join(', ') });
          });
          Object.entries(monthlyAdults).forEach(([month, d]) => {
              data.push({ Stage: 'Adult', Age: `${month} Months+`, Count: d.count, Batches: d.batches, Breeds: Array.from(d.breeds).join(', ') });
          });

          if (type === 'excel') {
              exportService.exportToExcel(data, fileName);
          } else {
              const cols = ['Stage', 'Age', 'Count', 'Batches', 'Breeds'];
              const rows = data.map(d => [d.Stage, d.Age, d.Count, d.Batches, d.Breeds]);
              exportService.exportToPDF("Live Flock Inventory", cols, rows, fileName);
          }
      } else {
          // Financial
          const summary = getFinancialSummary();
          const data = summary.map(row => ({
              Month: row.month,
              Income: row.income,
              Expenses: row.expense,
              Profit: row.income - row.expense
          }));

          if (type === 'excel') {
              exportService.exportToExcel(data, fileName);
          } else {
              const cols = ['Month', 'Income', 'Expenses', 'Profit'];
              const rows = data.map(d => [d.Month, d.Income, d.Expenses, d.Profit]);
              exportService.exportToPDF("Monthly Financial Summary", cols, rows, fileName);
          }
      }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const today = new Date().toISOString().split('T')[0];

    let finalHatchDate = newChick.hatchDate;

    if (entryMode === 'age') {
       if (ageInput < 0) newErrors.age = "Age cannot be negative";
       const d = new Date();
       d.setDate(d.getDate() - (ageInput * 7));
       finalHatchDate = d.toISOString().split('T')[0];
    } else {
        if (!newChick.hatchDate) {
            newErrors.hatchDate = "Hatch date is required";
        } else if (newChick.hatchDate > today) {
            newErrors.hatchDate = "Date cannot be in the future";
        }
    }

    if ((newChick.initialCount || 0) <= 0) newErrors.initialCount = "Count must be at least 1";
    
    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, finalHatchDate };
  };

  const handleAddBatch = () => {
    const { isValid, finalHatchDate } = validateForm();
    if (!isValid) return;

    const count = Number(newChick.initialCount) || 1;
    const batchId = `B-${Math.floor(Math.random() * 10000)}`;
    const cost = Number(newChick.purchaseCost) || 0;

    const chick: Chick = {
      id: batchId,
      breed: newChick.breed as Breed,
      hatchDate: finalHatchDate || new Date().toISOString().split('T')[0],
      source: newChick.source as any,
      initialCount: count,
      currentCount: count,
      mortalityCount: 0,
      soldCount: 0,
      purchaseCost: cost,
      initialWeight: Number(newChick.initialWeight) || 0,
      currentWeight: Number(newChick.initialWeight) || 0,
      status: 'Active',
      notes: newChick.notes || '',
      tags: tagsInput.split(',').map(t => t.trim()).filter(t => t)
    };

    dataService.saveChick(chick);

    // If purchased with cost, log Expense
    if (cost > 0) {
        const expense: Expense = {
            id: `E-${Date.now()}`,
            flockId: batchId,
            category: 'Bird Purchase',
            amount: cost,
            date: new Date().toISOString().split('T')[0],
            description: `Purchase of ${count} ${chick.breed} birds (${purchaseMode === 'weight' ? purchaseTotalWeight + 'kg' : 'by count'})`,
            type: 'Cash'
        };
        dataService.saveExpense(expense);
    }

    setIsAdding(false);
    setNewChick({ breed: Breed.GAVRAN, source: 'Natural', status: 'Active', initialWeight: 0, initialCount: 1, purchaseCost: 0 });
    setAgeInput(0);
    setEntryMode('date');
    setPurchaseMode('count');
    setPurchaseRate(0);
    setPurchaseTotalWeight(0);
    setTagsInput('');
    setErrors({});
  };

  const handleUpdateBatch = () => {
      if (!editingBatch) return;

      const originalBatch = chicks.find(c => c.id === editingBatch.id);
      if (!originalBatch) return;

      // Smart Sync: Recalculate Current Count
      // Formula: New Current = New Initial - (Existing Mortality + Existing Sold)
      const newCurrentCount = editingBatch.initialCount - originalBatch.mortalityCount - originalBatch.soldCount;
      
      if (newCurrentCount < 0) {
          alert("Error: Initial count cannot be less than already Dead + Sold birds.");
          return;
      }

      const updatedChick: Chick = {
          ...editingBatch,
          currentCount: newCurrentCount,
          mortalityCount: originalBatch.mortalityCount,
          soldCount: originalBatch.soldCount,
          status: newCurrentCount > 0 ? 'Active' : 'Completed',
          tags: editTagsInput.split(',').map(t => t.trim()).filter(t => t)
      };

      dataService.saveChick(updatedChick);

      // Smart Sync: Update Purchase Expense
      if (updatedChick.purchaseCost !== originalBatch.purchaseCost) {
          const expenseIndex = expenses.findIndex(e => e.flockId === updatedChick.id && e.category === 'Bird Purchase');
          
          if (expenseIndex !== -1) {
              // Update existing expense
              const updatedExpense = {
                  ...expenses[expenseIndex],
                  amount: updatedChick.purchaseCost,
                  description: `Purchase of ${updatedChick.initialCount} ${updatedChick.breed} birds (Updated)`
              };
              dataService.saveExpense(updatedExpense);
          } else if (updatedChick.purchaseCost > 0) {
              // Create new expense if added later
              const newExpense: Expense = {
                  id: `E-${Date.now()}`,
                  flockId: updatedChick.id,
                  category: 'Bird Purchase',
                  amount: updatedChick.purchaseCost,
                  date: updatedChick.hatchDate,
                  description: `Purchase of ${updatedChick.initialCount} ${updatedChick.breed} birds`
              };
              dataService.saveExpense(newExpense);
          }
      }

      setActiveModal(null);
      setEditingBatch(null);
      setEditTagsInput('');
  };

  const handleSell = () => {
     if (!selectedBatchId) return;
     const batch = chicks.find(c => c.id === selectedBatchId);
     if (!batch) return;

     const qty = Number(saleInput.quantity);
     if (qty <= 0 || qty > batch.currentCount) {
         alert("Invalid Quantity");
         return;
     }

     // Calculate Amount
     let totalAmount = 0;
     if (saleMode === 'kg') {
         totalAmount = Number(saleInput.weight) * Number(saleInput.rate);
     } else {
         totalAmount = qty * Number(saleInput.rate);
     }

     // 1. Create Sales Record
     const sale: SalesRecord = {
         id: `S-${Date.now()}`,
         flockId: batch.id,
         breed: batch.breed,
         date: new Date().toISOString().split('T')[0],
         buyerName: saleInput.buyer || 'Local Customer',
         quantity: qty,
         weightKg: Number(saleInput.weight),
         saleType: saleMode,
         rate: Number(saleInput.rate),
         totalAmount: totalAmount,
         notes: `Sold by ${saleMode}`
     };
     dataService.saveSale(sale);

     // 2. Update Batch Inventory
     const newCount = batch.currentCount - qty;
     const updatedChick: Chick = {
         ...batch,
         currentCount: newCount,
         soldCount: batch.soldCount + qty,
         status: newCount === 0 ? 'Completed' : 'Active'
     };
     dataService.saveChick(updatedChick);

     setActiveModal(null);
     setSaleInput({ quantity: 0, weight: 0, rate: 0, buyer: '' });
  };

  const handleMortality = () => {
    if (!selectedBatchId) return;
    const batch = chicks.find(c => c.id === selectedBatchId);
    if (!batch) return;

    const qty = Number(mortalityInput.count);
    if (qty <= 0 || qty > batch.currentCount) {
        alert("Invalid Count");
        return;
    }

    const newCount = batch.currentCount - qty;
    const updatedChick: Chick = {
        ...batch,
        currentCount: newCount,
        mortalityCount: batch.mortalityCount + qty,
        status: newCount === 0 ? 'Completed' : 'Active'
    };
    dataService.saveChick(updatedChick);
    setActiveModal(null);
    setMortalityInput({ count: 0, reason: '' });
  };

  const updateWeight = (id: string, weight: string) => {
    const val = Number(weight);
    if (val < 0) return; 
    const batch = chicks.find(c => c.id === id);
    if (batch) {
        dataService.saveChick({ ...batch, currentWeight: val });
    }
  };

  const handleDelete = (id: string) => {
    if(window.confirm("Move this batch to Trash? Linked sales and expenses will also be moved to Trash.")) {
        const batch = chicks.find(c => c.id === id);
        
        // 1. Trash the Batch
        if (batch) {
             dataService.moveToTrash(batch, 'Batch', `Batch: ${batch.breed} (${batch.id})`);
             dataService.deleteChick(id);
        }

        // 2. Trash linked Sales
        const linkedSales = sales.filter(s => s.flockId === id);
        linkedSales.forEach(s => {
            dataService.moveToTrash(s, 'Sale', `Sale: ${s.quantity} birds from ${batch?.breed}`);
            dataService.deleteSale(s.id);
        });

        // 3. Trash linked Expenses
        const linkedExpenses = expenses.filter(e => e.flockId === id);
        linkedExpenses.forEach(e => {
            dataService.moveToTrash(e, 'Expense', `Expense: ${e.category} for ${batch?.breed}`);
            dataService.deleteExpense(e.id);
        });
    }
  };

  // Helper for sales modal to estimate weight
  const getSelectedBatch = () => chicks.find(c => c.id === selectedBatchId);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Flock Management</h1>
            <p className="text-gray-500 text-sm">Manage Batches, Sales, and Purchases</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
             onClick={() => setActiveModal('reports')}
             className="flex-1 md:flex-none bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex justify-center items-center gap-2 shadow-sm font-medium"
          >
            <BarChart2 size={18} /> Reports
          </button>
          <button 
            onClick={() => { setIsAdding(!isAdding); setErrors({}); }}
            className="flex-1 md:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 shadow-sm font-medium"
          >
            <Plus size={18} /> Add Batch
          </button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-200 pb-2">
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
          <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${filter === 'all' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
              All Active
          </button>
          <button 
              onClick={() => setFilter('chick')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${filter === 'chick' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
              <Egg size={16}/> Chicks (0-8 Wks)
          </button>
          <button 
              onClick={() => setFilter('adult')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${filter === 'adult' ? 'border-orange-500 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
              <Bird size={16}/> Adults (8+ Wks)
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search breed, tags, notes..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md border border-orange-200 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-orange-800">Add New Batch</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                {/* 1. Basic Info */}
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Breed *</label>
                    <select 
                        className={`w-full p-2 border rounded ${errors.breed ? 'border-red-500' : 'border-gray-300'}`}
                        value={newChick.breed}
                        onChange={e => setNewChick({...newChick, breed: e.target.value as Breed})}
                    >
                        {BREEDS_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                
                <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Entry Method</label>
                   <div className="flex bg-gray-100 rounded p-1">
                       <button onClick={() => setEntryMode('date')} className={`flex-1 text-xs py-1 rounded ${entryMode === 'date' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Hatch Date</button>
                       <button onClick={() => setEntryMode('age')} className={`flex-1 text-xs py-1 rounded ${entryMode === 'age' ? 'bg-white shadow text-black' : 'text-gray-500'}`}>Current Age</button>
                   </div>
                </div>

                {entryMode === 'date' ? (
                     <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">Hatch Date *</label>
                     <input 
                       type="date" 
                       max={new Date().toISOString().split('T')[0]}
                       className={`w-full p-2 border rounded ${errors.hatchDate ? 'border-red-500' : 'border-gray-300'}`}
                       onChange={e => setNewChick({...newChick, hatchDate: e.target.value})}
                     />
                     {errors.hatchDate && <p className="text-red-500 text-xs mt-1">{errors.hatchDate}</p>}
                   </div>
                ) : (
                    <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Current Age (Weeks) *</label>
                    <input 
                      type="number" 
                      min="0"
                      value={ageInput}
                      className={`w-full p-2 border rounded ${errors.age ? 'border-red-500' : 'border-gray-300'}`}
                      onChange={e => setAgeInput(Number(e.target.value))}
                    />
                  </div>
                )}
                
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
                    <select 
                        className="w-full p-2 border rounded border-gray-300"
                        value={newChick.source}
                        onChange={e => setNewChick({...newChick, source: e.target.value as any})}
                    >
                        <option value="Natural">Natural (Home Hatch)</option>
                        <option value="Incubator">Incubator</option>
                        <option value="Purchased">Purchased Market</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                 {/* 2. Purchase Details */}
                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                     <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
                         Purchase Details
                         <div className="flex bg-white rounded p-0.5 border">
                            <button onClick={() => setPurchaseMode('count')} className={`px-2 py-0.5 text-[10px] rounded ${purchaseMode === 'count' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}`}>Per Bird</button>
                            <button onClick={() => setPurchaseMode('weight')} className={`px-2 py-0.5 text-[10px] rounded ${purchaseMode === 'weight' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}`}>By Weight</button>
                         </div>
                     </label>
                     
                     <div className="space-y-3">
                         <div>
                            <label className="block text-[10px] uppercase text-gray-500 mb-1">Quantity (Nag) *</label>
                            <input 
                                type="number" 
                                min="1"
                                value={newChick.initialCount}
                                className={`w-full p-2 border rounded bg-white ${errors.initialCount ? 'border-red-500' : 'border-gray-300'}`}
                                onChange={e => setNewChick({...newChick, initialCount: Number(e.target.value)})}
                            />
                             {errors.initialCount && <p className="text-red-500 text-xs mt-1">{errors.initialCount}</p>}
                         </div>

                         {purchaseMode === 'weight' && (
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Total Weight (Kg)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={purchaseTotalWeight}
                                    className="w-full p-2 border rounded bg-white border-gray-300"
                                    onChange={e => setPurchaseTotalWeight(Number(e.target.value))}
                                />
                             </div>
                         )}

                         <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">
                                    {purchaseMode === 'count' ? 'Price / Bird (₹)' : 'Price / Kg (₹)'}
                                </label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={purchaseRate}
                                    className="w-full p-2 border rounded bg-white border-gray-300"
                                    onChange={e => setPurchaseRate(Number(e.target.value))}
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] uppercase text-gray-500 mb-1">Total Cost (₹)</label>
                                <input 
                                    type="number" 
                                    readOnly
                                    value={newChick.purchaseCost}
                                    className="w-full p-2 border rounded bg-gray-100 font-bold text-gray-700"
                                />
                             </div>
                         </div>
                     </div>
                 </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Batch A"
                            className="w-full p-2 border rounded border-gray-300"
                            onChange={e => setNewChick({...newChick, notes: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Organic, Trial Batch"
                            className="w-full p-2 border rounded border-gray-300"
                            value={tagsInput}
                            onChange={e => setTagsInput(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Avg Chick Weight (g)</label>
                        <input 
                            type="number" 
                            className="w-full p-2 border rounded border-gray-300"
                            value={newChick.initialWeight}
                            onChange={e => setNewChick({...newChick, initialWeight: Number(e.target.value)})}
                        />
                    </div>
                </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-100">
            <button onClick={handleAddBatch} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg shadow font-medium">Save Batch</button>
            <button onClick={() => setIsAdding(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-medium">Cancel</button>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-sm uppercase text-gray-500">
            <tr>
              <th className="p-4 font-semibold">Batch Info</th>
              <th className="p-4 font-semibold">Age & Phase</th>
              <th className="p-4 font-semibold text-center">Inventory</th>
              <th className="p-4 font-semibold">Resource Usage & Costs</th>
              <th className="p-4 font-semibold">Avg Weight (g)</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredChicks.map(batch => {
                const { weeks, label } = calculateAge(batch.hatchDate);
                const isAdult = weeks >= 8;
                const costs = getBatchCostBreakdown(batch.id);
                
                return (
              <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                    <p className="font-bold text-gray-800">{batch.notes || batch.id}</p>
                    <p className="text-xs text-gray-500">{batch.breed}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{batch.source}</span>
                        {batch.tags && batch.tags.map(tag => (
                            <span key={tag} className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                    </div>
                </td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${isAdult ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                            {isAdult ? 'Adult' : 'Chick'}
                        </span>
                        <span className="text-sm text-gray-800 font-semibold">{label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Hatch: {batch.hatchDate}</p>
                </td>
                <td className="p-4 text-center">
                   <div className="inline-flex flex-col items-center">
                       <span className="text-xl font-bold text-gray-800">{batch.currentCount}</span>
                       <div className="flex gap-2 text-[10px] text-gray-500">
                           <span className="text-red-500 flex items-center gap-0.5"><Skull size={10}/> {batch.mortalityCount}</span>
                           <span className="text-green-600 flex items-center gap-0.5"><IndianRupee size={10}/> {batch.soldCount}</span>
                       </div>
                   </div>
                </td>
                <td className="p-4">
                    <div className="flex flex-col text-xs gap-1">
                         <div className="flex items-center gap-1 text-gray-600">
                            <Package size={12}/> Feed: <span className="font-medium">₹{costs.feed.toLocaleString()}</span>
                         </div>
                         <div className="flex items-center gap-1 text-gray-600">
                            <Syringe size={12}/> Health: <span className="font-medium">₹{costs.health.toLocaleString()}</span>
                         </div>
                         <div className="flex items-center gap-1 text-gray-600">
                            <IndianRupee size={12}/> Purchase: <span className="font-medium">₹{costs.purchase.toLocaleString()}</span>
                         </div>
                         <div className="border-t pt-1 mt-1 font-bold text-red-700">
                            Total: ₹{costs.total.toLocaleString()}
                         </div>
                    </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded border border-gray-200 w-24">
                        <input 
                            type="number" 
                            min="0"
                            className="w-full bg-transparent text-sm focus:outline-none text-right font-medium"
                            value={batch.currentWeight}
                            onChange={(e) => updateWeight(batch.id, e.target.value)}
                        />
                        <span className="text-xs text-gray-400 pr-1">g</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">
                        Total: {((batch.currentCount * batch.currentWeight) / 1000).toFixed(1)} kg
                      </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { 
                            setEditingBatch({...batch}); 
                            setEditTagsInput(batch.tags ? batch.tags.join(', ') : '');
                            setActiveModal('edit'); 
                        }}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg tooltip"
                        title="Edit Batch"
                      >
                          <Pencil size={18}/>
                      </button>
                      <button 
                        onClick={() => { setSelectedBatchId(batch.id); setActiveModal('sell'); }}
                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg tooltip"
                        title="Record Sale"
                      >
                          <IndianRupee size={18}/>
                      </button>
                      <button 
                        onClick={() => { setSelectedBatchId(batch.id); setActiveModal('mortality'); }}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                        title="Record Mortality"
                      >
                          <Skull size={18}/>
                      </button>
                      <button onClick={() => handleDelete(batch.id)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
        {filteredChicks.length === 0 && (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
            <Bird className="text-gray-300" size={32} />
            <p>No active flocks found.</p>
          </div>
        )}
      </div>

      {/* Sale Modal */}
      {activeModal === 'sell' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm m-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><IndianRupee className="text-green-600"/> Record Sale</h3>
                    <div className="flex bg-gray-100 rounded p-0.5 border">
                         <button onClick={() => setSaleMode('kg')} className={`px-3 py-1 text-xs rounded transition-colors ${saleMode === 'kg' ? 'bg-white shadow text-green-700 font-bold' : 'text-gray-500'}`}>By Kg</button>
                         <button onClick={() => setSaleMode('count')} className={`px-3 py-1 text-xs rounded transition-colors ${saleMode === 'count' ? 'bg-white shadow text-green-700 font-bold' : 'text-gray-500'}`}>By Nag (Count)</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Quantity Sold (Birds)</label>
                          <input type="number" className="w-full border p-2 rounded" value={saleInput.quantity} onChange={e => setSaleInput({...saleInput, quantity: Number(e.target.value)})} />
                      </div>
                      
                      <div>
                          <label className="text-xs text-gray-600 flex justify-between">
                             <span>Total Weight (Kg) {saleMode === 'count' && '(Optional)'}</span>
                             {getSelectedBatch() && saleInput.quantity > 0 && (
                                 <span className="text-green-600">
                                     Est: {((getSelectedBatch()!.currentWeight * saleInput.quantity) / 1000).toFixed(2)} kg
                                 </span>
                             )}
                          </label>
                          <input type="number" className="w-full border p-2 rounded" value={saleInput.weight} onChange={e => setSaleInput({...saleInput, weight: Number(e.target.value)})} />
                      </div>

                      <div>
                          <label className="text-xs text-gray-600">
                              {saleMode === 'kg' ? 'Rate per Kg (₹)' : 'Rate per Bird (₹)'}
                          </label>
                          <input type="number" className="w-full border p-2 rounded" value={saleInput.rate} onChange={e => setSaleInput({...saleInput, rate: Number(e.target.value)})} />
                      </div>
                      
                      <div>
                          <label className="text-xs text-gray-600">Buyer Name (Optional)</label>
                          <input type="text" className="w-full border p-2 rounded" value={saleInput.buyer} onChange={e => setSaleInput({...saleInput, buyer: e.target.value})} />
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded text-center">
                          <p className="text-xs text-gray-500">Total Amount</p>
                          <p className="text-xl font-bold text-green-700">
                              ₹ {(saleMode === 'kg' 
                                  ? Number(saleInput.weight) * Number(saleInput.rate)
                                  : Number(saleInput.quantity) * Number(saleInput.rate)
                                ).toLocaleString()}
                          </p>
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleSell} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium">Save Sale</button>
                      <button onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* Mortality Modal */}
      {activeModal === 'mortality' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm m-4">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600"><Skull/> Record Mortality</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Number of Birds Dead</label>
                          <input type="number" className="w-full border p-2 rounded" value={mortalityInput.count} onChange={e => setMortalityInput({...mortalityInput, count: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Reason (Optional)</label>
                          <input type="text" className="w-full border p-2 rounded" placeholder="e.g. Cold, Disease" value={mortalityInput.reason} onChange={e => setMortalityInput({...mortalityInput, reason: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleMortality} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium">Confirm</button>
                      <button onClick={() => setActiveModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Batch Modal */}
      {activeModal === 'edit' && editingBatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm m-4">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil size={20} className="text-blue-600"/> Edit Batch Details</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Breed</label>
                          <select 
                            className="w-full border p-2 rounded"
                            value={editingBatch.breed}
                            onChange={e => setEditingBatch({...editingBatch, breed: e.target.value as Breed})}
                          >
                             {BREEDS_LIST.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Hatch Date</label>
                          <input 
                            type="date" 
                            className="w-full border p-2 rounded" 
                            value={editingBatch.hatchDate} 
                            onChange={e => setEditingBatch({...editingBatch, hatchDate: e.target.value})} 
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-600 font-bold">Initial Count</label>
                            <input 
                                type="number" 
                                className="w-full border p-2 rounded font-bold" 
                                value={editingBatch.initialCount} 
                                onChange={e => setEditingBatch({...editingBatch, initialCount: Number(e.target.value)})} 
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Purchase Cost (₹)</label>
                            <input 
                                type="number" 
                                className="w-full border p-2 rounded" 
                                value={editingBatch.purchaseCost} 
                                onChange={e => setEditingBatch({...editingBatch, purchaseCost: Number(e.target.value)})} 
                            />
                        </div>
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Notes</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded" 
                            value={editingBatch.notes || ''} 
                            onChange={e => setEditingBatch({...editingBatch, notes: e.target.value})} 
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Tags (comma separated)</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded" 
                            placeholder="e.g. Organic, Trial Batch"
                            value={editTagsInput} 
                            onChange={e => setEditTagsInput(e.target.value)} 
                          />
                      </div>
                      <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded">
                         <p><strong>Note:</strong> Modifying 'Initial Count' will auto-recalculate current flock size. Modifying 'Purchase Cost' will auto-update expenses.</p>
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleUpdateBatch} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Update Batch</button>
                      <button onClick={() => { setActiveModal(null); setEditingBatch(null); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* REPORTS MODAL */}
      {activeModal === 'reports' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col m-4">
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <BarChart2 className="text-orange-600"/> Flock Reports & Summary
                    </h3>
                    <div className="flex items-center gap-3">
                         {/* Export Buttons */}
                        <button 
                            onClick={() => handleExportReport('excel')}
                            className="p-1.5 text-green-700 hover:bg-green-100 rounded flex items-center gap-1 text-xs font-semibold"
                            title="Export to Excel"
                        >
                            <FileSpreadsheet size={16}/> Excel
                        </button>
                        <button 
                            onClick={() => handleExportReport('pdf')}
                            className="p-1.5 text-red-700 hover:bg-red-100 rounded flex items-center gap-1 text-xs font-semibold"
                            title="Export to PDF"
                        >
                            <FileText size={16}/> PDF
                        </button>
                        <div className="h-6 w-px bg-gray-300 mx-2"></div>
                        <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex p-4 gap-4 border-b border-gray-100 overflow-x-auto">
                     <button 
                        onClick={() => setReportTab('inventory')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${reportTab === 'inventory' ? 'bg-orange-100 text-orange-800' : 'text-gray-600 hover:bg-gray-50'}`}
                     >
                         Current Inventory (By Age)
                     </button>
                     <button 
                        onClick={() => setReportTab('financial')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${reportTab === 'financial' ? 'bg-green-100 text-green-800' : 'text-gray-600 hover:bg-gray-50'}`}
                     >
                         Financial Summary (Monthly)
                     </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {reportTab === 'inventory' && (
                        <div className="space-y-8">
                            {/* Chicks Section */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Egg size={20} className="text-yellow-500"/> Chick Stage (0-8 Weeks)</h4>
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-yellow-50 text-yellow-900 border-b border-yellow-100">
                                            <tr>
                                                <th className="p-3">Age (Week)</th>
                                                <th className="p-3">Total Birds</th>
                                                <th className="p-3">Active Batches</th>
                                                <th className="p-3">Breeds</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {Object.entries(getInventorySummary().weeklyChicks).sort((a,b) => Number(a[0]) - Number(b[0])).map(([week, data]) => (
                                                <tr key={week} className="hover:bg-gray-50">
                                                    <td className="p-3 font-semibold text-gray-700">Week {week}</td>
                                                    <td className="p-3 font-bold text-gray-900">{data.count}</td>
                                                    <td className="p-3 text-gray-600">{data.batches}</td>
                                                    <td className="p-3 text-xs text-gray-500">{Array.from(data.breeds).join(', ')}</td>
                                                </tr>
                                            ))}
                                            {Object.keys(getInventorySummary().weeklyChicks).length === 0 && (
                                                <tr><td colSpan={4} className="p-4 text-center text-gray-400">No chicks currently in brooding phase.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Adults Section */}
                            <div>
                                <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><Bird size={20} className="text-blue-500"/> Adult Stage (2+ Months)</h4>
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-blue-50 text-blue-900 border-b border-blue-100">
                                            <tr>
                                                <th className="p-3">Age (Month)</th>
                                                <th className="p-3">Total Birds</th>
                                                <th className="p-3">Active Batches</th>
                                                <th className="p-3">Breeds</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {Object.entries(getInventorySummary().monthlyAdults).sort((a,b) => Number(a[0]) - Number(b[0])).map(([month, data]) => (
                                                <tr key={month} className="hover:bg-gray-50">
                                                    <td className="p-3 font-semibold text-gray-700">{month} Months +</td>
                                                    <td className="p-3 font-bold text-gray-900">{data.count}</td>
                                                    <td className="p-3 text-gray-600">{data.batches}</td>
                                                    <td className="p-3 text-xs text-gray-500">{Array.from(data.breeds).join(', ')}</td>
                                                </tr>
                                            ))}
                                            {Object.keys(getInventorySummary().monthlyAdults).length === 0 && (
                                                <tr><td colSpan={4} className="p-4 text-center text-gray-400">No adult flocks active.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {reportTab === 'financial' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                             <table className="w-full text-sm text-left">
                                <thead className="bg-green-50 text-green-900 border-b border-green-100">
                                    <tr>
                                        <th className="p-4">Month</th>
                                        <th className="p-4 text-right">Total Income (Sales)</th>
                                        <th className="p-4 text-right">Total Expenses</th>
                                        <th className="p-4 text-right">Net Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {getFinancialSummary().map((row) => (
                                        <tr key={row.month} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-gray-700">{new Date(row.month + "-01").toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                                            <td className="p-4 text-right text-green-600 font-medium">+ ₹{row.income.toLocaleString()}</td>
                                            <td className="p-4 text-right text-red-500 font-medium">- ₹{row.expense.toLocaleString()}</td>
                                            <td className={`p-4 text-right font-bold text-lg ${row.income - row.expense >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                {row.income - row.expense >= 0 ? '+' : ''} ₹{(row.income - row.expense).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {getFinancialSummary().length === 0 && (
                                         <tr><td colSpan={4} className="p-8 text-center text-gray-400">No transaction data available yet.</td></tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default ChicksManager;