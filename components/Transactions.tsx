import React, { useState, useEffect } from 'react';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { exportService } from '../services/exportUtils';
import { SalesRecord, Expense, Chick } from '../types';
import { IndianRupee, ArrowUpRight, ArrowDownLeft, FileText, Trash2, Pencil, Calendar, Filter, X, FileSpreadsheet, Loader2 } from 'lucide-react';

const Transactions: React.FC = () => {
  const { sales, expenses, chicks, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all');

  // Custom Range State
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Edit State
  const [editingSale, setEditingSale] = useState<SalesRecord | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // --- FILTER LOGIC ---
  const filterByTime = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    
    const recordDate = new Date(dateStr);
    // Normalize record date to midnight to ensure accurate day comparison
    recordDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timeFilter === 'today') {
        return recordDate.getTime() === today.getTime();
    }
    
    if (timeFilter === 'week') {
        // Last 7 days
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        return recordDate >= oneWeekAgo && recordDate <= today;
    }
    
    if (timeFilter === 'month') {
        // Current Month
        return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
    }

    if (timeFilter === 'year') {
        // Current Year
        return recordDate.getFullYear() === today.getFullYear();
    }

    if (timeFilter === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        
        return recordDate >= start && recordDate <= end;
    }

    return true;
  };

  const filteredSales = sales.filter(s => filterByTime(s.date));
  const filteredExpenses = expenses.filter(e => filterByTime(e.date));

  const totalSales = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = filteredExpenses
    .filter(e => e.type !== 'Usage')
    .reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // --- EXPORT LOGIC ---
  const handleExportExcel = () => {
      const fileName = `Farm_${activeTab === 'sales' ? 'Sales' : 'Expenses'}_${new Date().toISOString().split('T')[0]}`;
      
      if (activeTab === 'sales') {
          const data = filteredSales.map(s => ({
              Date: s.date,
              Breed: s.breed,
              Buyer: s.buyerName,
              Quantity: s.quantity,
              'Weight (Kg)': s.weightKg,
              'Rate (₹)': s.rate,
              'Total (₹)': s.totalAmount,
              Notes: s.notes
          }));
          exportService.exportToExcel(data, fileName);
      } else {
          const data = filteredExpenses.map(e => ({
             Date: e.date,
             Category: e.category,
             Description: e.description,
             'Amount (₹)': e.amount
          }));
          exportService.exportToExcel(data, fileName);
      }
  };

  const handleExportPDF = () => {
      const fileName = `Farm_${activeTab === 'sales' ? 'Sales' : 'Expenses'}_${new Date().toISOString().split('T')[0]}`;
      
      if (activeTab === 'sales') {
          const columns = ['Date', 'Breed', 'Buyer', 'Qty', 'Weight', 'Rate', 'Total'];
          const rows = filteredSales.map(s => [
              s.date, s.breed, s.buyerName, s.quantity, s.weightKg, s.rate, s.totalAmount
          ]);
          exportService.exportToPDF("Sales Report", columns, rows, fileName);
      } else {
          const columns = ['Date', 'Category', 'Description', 'Amount'];
          const rows = filteredExpenses.map(e => [
              e.date, e.category, e.description, e.amount
          ]);
          exportService.exportToPDF("Expense Report", columns, rows, fileName);
      }
  };

  // --- DELETE HANDLERS (TRASH) ---
  const handleDeleteSale = (id: string) => {
    if(window.confirm("Move this sale to Trash? It can be recovered later.")) {
        const saleToDelete = sales.find(s => s.id === id);
        
        if (saleToDelete) {
             // 1. Move to Trash
             dataService.moveToTrash(saleToDelete, 'Sale', `Sale: ${saleToDelete.quantity} birds (${saleToDelete.breed}) sold to ${saleToDelete.buyerName}`);
             dataService.deleteSale(id);

             // 2. Restore Inventory in Flock
             const batch = chicks.find(c => c.id === saleToDelete.flockId);
             if (batch) {
                  const newCurrent = batch.currentCount + saleToDelete.quantity;
                  const updatedChick: Chick = {
                      ...batch,
                      soldCount: Math.max(0, batch.soldCount - saleToDelete.quantity),
                      currentCount: newCurrent,
                      status: 'Active'
                  };
                  dataService.saveChick(updatedChick);
             }
        }
    }
  };

  const handleDeleteExpense = (id: string) => {
    const expenseToDelete = expenses.find(e => e.id === id);
    if (!expenseToDelete) return;

    if(window.confirm("Move this expense to Trash?")) {
        // 1. Move to Trash
        dataService.moveToTrash(expenseToDelete, 'Expense', `Expense: ₹${expenseToDelete.amount} for ${expenseToDelete.category}`);
        dataService.deleteExpense(id);

        // 2. Sync with Batch if it's a purchase cost (Reverse effect)
        if (expenseToDelete.category === 'Bird Purchase' && expenseToDelete.flockId) {
            const batch = chicks.find(c => c.id === expenseToDelete.flockId);
            if (batch) {
                // Reduce the purchase cost of the batch
                const updatedBatch = { ...batch, purchaseCost: Math.max(0, batch.purchaseCost - expenseToDelete.amount) };
                dataService.saveChick(updatedBatch);
            }
        }
    }
  };

  // --- SAVE HANDLERS (EDIT) ---
  const handleSaveSale = () => {
      if (!editingSale) return;
      
      const originalSale = sales.find(s => s.id === editingSale.id);

      // Inventory Sync Logic for Quantity Change
      if (originalSale && originalSale.quantity !== editingSale.quantity) {
          const qtyDiff = editingSale.quantity - originalSale.quantity;
          
          const batch = chicks.find(c => c.id === editingSale.flockId);
          if (batch) {
              const newCurrent = batch.currentCount - qtyDiff;
              
              if (newCurrent < 0) {
                  alert("Error: This edit results in a negative bird count for the flock. Update cancelled.");
                  return;
              }
              
              const updatedChick: Chick = {
                  ...batch,
                  soldCount: batch.soldCount + qtyDiff,
                  currentCount: newCurrent,
                  status: newCurrent > 0 ? 'Active' : 'Completed'
              };
              dataService.saveChick(updatedChick);
          }
      }
      
      dataService.saveSale(editingSale);
      setEditingSale(null);
  };

  const handleSaveExpense = () => {
      if(!editingExpense) return;

      const originalExpense = expenses.find(e => e.id === editingExpense.id);

      // Sync with Batch if Purchase Cost changed
      if (originalExpense && editingExpense.category === 'Bird Purchase' && editingExpense.flockId) {
          const diff = editingExpense.amount - originalExpense.amount;
          if (diff !== 0) {
              const batch = chicks.find(c => c.id === editingExpense.flockId);
              if (batch) {
                  // Adjust purchase cost based on the difference
                  const updatedBatch = { ...batch, purchaseCost: Math.max(0, batch.purchaseCost + diff) };
                  dataService.saveChick(updatedBatch);
              }
          }
      }

      dataService.saveExpense(editingExpense);
      setEditingExpense(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  return (
    <div className="p-6">
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
         <div>
             <h1 className="text-2xl font-bold text-gray-800">Transactions & Accounts</h1>
             <p className="text-gray-500 text-sm">Financial logs and reports</p>
         </div>
         
         {/* Filter Controls */}
         <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            <Filter size={16} className="ml-2 text-gray-400"/>
            <button 
                onClick={() => setTimeFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'all' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                All Time
            </button>
            <button 
                onClick={() => setTimeFilter('today')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'today' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Today
            </button>
            <button 
                onClick={() => setTimeFilter('week')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'week' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Last 7 Days
            </button>
            <button 
                onClick={() => setTimeFilter('month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'month' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                This Month
            </button>
            <button 
                onClick={() => setTimeFilter('year')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'year' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                This Year
            </button>
             <button 
                onClick={() => setTimeFilter('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeFilter === 'custom' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                Custom Range
            </button>
            
            {/* Custom Range Inputs */}
            {timeFilter === 'custom' && (
                <div className="flex items-center gap-2 ml-2 animate-in slide-in-from-left-2 border-l pl-2 border-gray-200">
                    <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="text-xs border rounded p-1"
                    />
                    <span className="text-gray-400 text-xs">-</span>
                    <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="text-xs border rounded p-1"
                    />
                </div>
            )}
         </div>
       </div>

       {/* Summary Cards (Dynamic based on filter) */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <p className="text-gray-500 text-sm flex items-center gap-1"><ArrowDownLeft size={16} className="text-green-500"/> Total Income ({timeFilter === 'all' ? 'All' : timeFilter})</p>
               <p className="text-2xl font-bold text-gray-800 mt-2">₹ {totalSales.toLocaleString()}</p>
           </div>
           <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
               <p className="text-gray-500 text-sm flex items-center gap-1"><ArrowUpRight size={16} className="text-red-500"/> Total Expense ({timeFilter === 'all' ? 'All' : timeFilter})</p>
               <p className="text-2xl font-bold text-gray-800 mt-2">₹ {totalExpenses.toLocaleString()}</p>
           </div>
           <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
               <p className={`${netProfit >= 0 ? 'text-green-800' : 'text-red-800'} text-sm font-medium`}>Net Profit / Loss ({timeFilter === 'all' ? 'All' : timeFilter})</p>
               <p className={`text-2xl font-bold mt-2 ${netProfit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                   {netProfit >= 0 ? '+' : ''} ₹ {netProfit.toLocaleString()}
               </p>
           </div>
       </div>

       {/* Tabs & Exports */}
       <div className="flex flex-col md:flex-row justify-between items-end md:items-center border-b border-gray-200 mb-4 gap-4">
           <div className="flex gap-4">
                <button 
                    onClick={() => setActiveTab('sales')}
                    className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'sales' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
                >
                    Sales History
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'expenses' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500'}`}
                >
                    Expense Log
                </button>
           </div>
           
           <div className="flex gap-2 mb-2">
                <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-semibold border border-green-200 transition-colors"
                >
                    <FileSpreadsheet size={14}/> Export Excel
                </button>
                 <button 
                    onClick={handleExportPDF}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-semibold border border-red-200 transition-colors"
                >
                    <FileText size={14}/> Export PDF
                </button>
           </div>
       </div>

       {/* Table Area */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
           {activeTab === 'sales' ? (
               <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500 border-b">
                       <tr>
                           <th className="p-4 font-medium">Date</th>
                           <th className="p-4 font-medium">Description</th>
                           <th className="p-4 font-medium">Qty</th>
                           <th className="p-4 font-medium">Weight</th>
                           <th className="p-4 font-medium">Rate</th>
                           <th className="p-4 font-medium text-right">Amount</th>
                           <th className="p-4 font-medium text-right">Actions</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {filteredSales.map(sale => (
                           <tr key={sale.id} className="hover:bg-gray-50">
                               <td className="p-4 text-gray-600">{sale.date}</td>
                               <td className="p-4 font-medium text-gray-800">
                                   {sale.breed} <span className="text-gray-400 font-normal">({sale.buyerName})</span>
                                   <div className="text-[10px] text-gray-400">{sale.notes}</div>
                               </td>
                               <td className="p-4">{sale.quantity} birds</td>
                               <td className="p-4">{sale.weightKg} kg</td>
                               <td className="p-4">
                                   ₹ {sale.rate} <span className="text-gray-400 text-xs">/{sale.saleType === 'count' ? 'bird' : 'kg'}</span>
                               </td>
                               <td className="p-4 text-right font-bold text-green-600">₹ {sale.totalAmount.toLocaleString()}</td>
                               <td className="p-4 text-right">
                                   <div className="flex justify-end gap-2">
                                       <button 
                                            onClick={() => exportService.generateInvoicePDF(sale, 'PoultryMitra Farm')}
                                            className="text-green-600 hover:bg-green-50 p-1 rounded tooltip"
                                            title="Download Invoice"
                                       >
                                           <FileText size={16}/>
                                       </button>
                                       <button onClick={() => setEditingSale(sale)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Pencil size={16}/></button>
                                       <button onClick={() => handleDeleteSale(sale.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))}
                       {filteredSales.length === 0 && (
                           <tr><td colSpan={7} className="p-8 text-center text-gray-400">No sales recorded for this period.</td></tr>
                       )}
                   </tbody>
               </table>
           ) : (
                <table className="w-full text-left text-sm">
                   <thead className="bg-gray-50 text-gray-500 border-b">
                       <tr>
                           <th className="p-4 font-medium">Date</th>
                           <th className="p-4 font-medium">Category</th>
                           <th className="p-4 font-medium">Description</th>
                           <th className="p-4 font-medium text-right">Amount</th>
                           <th className="p-4 font-medium text-right">Actions</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                       {filteredExpenses.map(exp => (
                           <tr key={exp.id} className="hover:bg-gray-50">
                               <td className="p-4 text-gray-600">{exp.date}</td>
                               <td className="p-4">
                                   <div className="flex flex-col gap-1">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs w-fit">{exp.category}</span>
                                        {exp.type === 'Usage' && (
                                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-tighter">Inventory Usage</span>
                                        )}
                                    </div>
                               </td>
                               <td className="p-4 text-gray-800">{exp.description}</td>
                               <td className="p-4 text-right font-bold text-red-600">₹ {exp.amount.toLocaleString()}</td>
                               <td className="p-4 text-right">
                                   <div className="flex justify-end gap-2">
                                       <button onClick={() => setEditingExpense(exp)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Pencil size={16}/></button>
                                       <button onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                   </div>
                               </td>
                           </tr>
                       ))}
                       {filteredExpenses.length === 0 && (
                           <tr><td colSpan={5} className="p-8 text-center text-gray-400">No expenses recorded for this period.</td></tr>
                       )}
                   </tbody>
               </table>
           )}
       </div>

       {/* EDIT SALE MODAL */}
       {editingSale && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil size={18} /> Edit Sale Record</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Buyer Name</label>
                          <input type="text" className="w-full border p-2 rounded" value={editingSale.buyerName} onChange={e => setEditingSale({...editingSale, buyerName: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Quantity (Nag)</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingSale.quantity} 
                                onChange={e => {
                                    const q = Number(e.target.value);
                                    const amt = editingSale.saleType === 'count' ? q * editingSale.rate : editingSale.weightKg * editingSale.rate;
                                    setEditingSale({...editingSale, quantity: q, totalAmount: amt});
                                }} 
                            />
                          </div>
                           <div>
                            <label className="text-xs text-gray-600">Weight (Kg)</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingSale.weightKg} 
                                onChange={e => {
                                    const w = Number(e.target.value);
                                    const amt = editingSale.saleType === 'kg' ? w * editingSale.rate : editingSale.quantity * editingSale.rate;
                                    setEditingSale({...editingSale, weightKg: w, totalAmount: amt});
                                }} 
                            />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                           <div>
                            <label className="text-xs text-gray-600">Rate</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingSale.rate} 
                                onChange={e => {
                                    const r = Number(e.target.value);
                                    const amt = editingSale.saleType === 'kg' ? editingSale.weightKg * r : editingSale.quantity * r;
                                    setEditingSale({...editingSale, rate: r, totalAmount: amt});
                                }} 
                            />
                          </div>
                           <div>
                            <label className="text-xs text-gray-600">Total (₹)</label>
                            <input type="number" className="w-full border p-2 rounded bg-gray-100 font-bold" readOnly value={editingSale.totalAmount} />
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleSaveSale} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Update</button>
                      <button onClick={() => setEditingSale(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
           </div>
       )}

       {/* EDIT EXPENSE MODAL */}
       {editingExpense && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pencil size={18} /> Edit Expense Record</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Description</label>
                          <input type="text" className="w-full border p-2 rounded" value={editingExpense.description} onChange={e => setEditingExpense({...editingExpense, description: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Amount (₹)</label>
                          <input type="number" className="w-full border p-2 rounded font-bold" value={editingExpense.amount} onChange={e => setEditingExpense({...editingExpense, amount: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Date</label>
                          <input type="date" className="w-full border p-2 rounded" value={editingExpense.date} onChange={e => setEditingExpense({...editingExpense, date: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleSaveExpense} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Update</button>
                      <button onClick={() => setEditingExpense(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
           </div>
       )}
    </div>
  );
};

export default Transactions;