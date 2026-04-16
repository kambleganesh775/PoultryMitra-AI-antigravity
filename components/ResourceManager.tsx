import React, { useState, useEffect } from 'react';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { exportService } from '../services/exportUtils';
import { InventoryItem, Expense, Chick } from '../types';
import { Package, Syringe, Zap, Plus, Minus, History, IndianRupee, AlertCircle, AlertTriangle, ArrowRight, Calendar, FileSpreadsheet, FileText, Download, Pencil, Trash2, X, Loader2 } from 'lucide-react';

const ResourceManager: React.FC = () => {
  const { inventory, chicks, expenses, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<'feed' | 'health' | 'others'>('feed');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Purchase Form State
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'kg', cost: 0, type: 'Feed', threshold: 10 });
  
  // Consumption Form State
  const [consumeItem, setConsumeItem] = useState({ id: '', quantity: 0, unit: '', batchId: '', date: new Date().toISOString().split('T')[0] });

  // Edit State
  const [editingInventoryItem, setEditingInventoryItem] = useState<InventoryItem | null>(null);

  const activeBatches = chicks.filter(c => c.status === 'Active');

  // --- EXPORT HANDLERS ---
  const prepareExportData = () => {
      // Filter inventory based on active view (excluding 'others' as that is just a form)
      let dataToExport = filteredInventory;
      
      // Map to clean format
      return dataToExport.map(item => ({
          Name: item.name,
          Category: item.type,
          Quantity: item.quantity,
          Unit: item.unit,
          'Avg Cost (₹)': item.avgCost ? item.avgCost.toFixed(2) : '0.00',
          'Total Value (₹)': item.avgCost ? (item.quantity * item.avgCost).toFixed(2) : '0.00',
          'Low Stock Limit': item.lowStockThreshold,
          'Status': item.quantity <= (item.lowStockThreshold || 0) ? 'Low Stock' : 'Good'
      }));
  };

  const handleExportExcel = () => {
      const data = prepareExportData();
      exportService.exportToExcel(data, `Inventory_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPDF = () => {
      const data = prepareExportData();
      const columns = ['Name', 'Category', 'Qty', 'Unit', 'Avg Cost', 'Total Value', 'Status'];
      const rows = data.map(item => [
          item.Name, 
          item.Category, 
          item.Quantity, 
          item.Unit, 
          item['Avg Cost (₹)'], 
          item['Total Value (₹)'],
          item.Status
      ]);
      exportService.exportToPDF("Farm Inventory Report", columns, rows, `Inventory_Report_${new Date().toISOString().split('T')[0]}`);
  };

  const handlePurchase = () => {
    if (!newItem.name || newItem.quantity <= 0) return;

    // 1. Update Inventory (Add to existing or create new) with Weighted Average Cost
    const existingItemIndex = inventory.findIndex(
        i => i.name.toLowerCase() === newItem.name.toLowerCase() && i.type === newItem.type
    );

    let updatedInventory = [...inventory];
    
    if (existingItemIndex >= 0) {
        const item = inventory[existingItemIndex];
        
        // Calculate Weighted Average Cost
        // Formula: ((OldQty * OldAvg) + (NewTotalCost)) / (OldQty + NewQty)
        const oldValue = item.quantity * (item.avgCost || 0);
        const newValue = Number(newItem.cost); // Total cost of new batch
        const totalQty = item.quantity + Number(newItem.quantity);
        const newAvgCost = totalQty > 0 ? (oldValue + newValue) / totalQty : 0;

        const updatedItem = {
            ...item,
            quantity: totalQty,
            avgCost: newAvgCost,
            lastUpdated: new Date().toISOString().split('T')[0],
            lowStockThreshold: newItem.threshold > 0 ? Number(newItem.threshold) : item.lowStockThreshold
        };
        dataService.saveInventoryItem(updatedItem);

    } else {
        // New Item
        const avgCost = newItem.quantity > 0 ? newItem.cost / newItem.quantity : 0;
        
        const item: InventoryItem = {
            id: `INV-${Date.now()}`,
            type: newItem.type as any,
            name: newItem.name,
            quantity: Number(newItem.quantity),
            unit: newItem.unit,
            lastUpdated: new Date().toISOString().split('T')[0],
            lowStockThreshold: Number(newItem.threshold),
            avgCost: avgCost
        };
        dataService.saveInventoryItem(item);
    }
    
    // 2. Log Expense (General Inventory Purchase)
    if (newItem.cost > 0) {
        const expense: Expense = {
            id: `E-${Date.now()}`,
            category: newItem.type as any,
            amount: Number(newItem.cost),
            date: new Date().toISOString().split('T')[0],
            description: `Stock Purchase: ${newItem.quantity} ${newItem.unit} of ${newItem.name}`,
            type: 'Cash'
        };
        dataService.saveExpense(expense);
    }

    setShowAddModal(false);
    // Reset form but keep type consistent with tab unless manual override needed next time
    setNewItem({ name: '', quantity: 0, unit: 'kg', cost: 0, type: activeTab === 'feed' ? 'Feed' : 'Medicine', threshold: 10 });
  };

  const handleConsumption = () => {
    if (!consumeItem.id || consumeItem.quantity <= 0) return;

    const itemToConsume = inventory.find(i => i.id === consumeItem.id);
    if (!itemToConsume) return;

    let qtyToDeduct = Number(consumeItem.quantity);
    const stockUnit = itemToConsume.unit.toLowerCase();
    const useUnit = (consumeItem.unit || stockUnit).toLowerCase();

    // Unit Conversion Logic
    // If Stock is kg, but usage is in grams
    if (['kg', 'kilogram', 'kilograms'].includes(stockUnit) && ['g', 'gram', 'grams'].includes(useUnit)) {
        qtyToDeduct = qtyToDeduct / 1000;
    } 
    // If Stock is Liters, but usage is in ml
    else if (['l', 'liter', 'liters'].includes(stockUnit) && ['ml', 'milliliter', 'milliliters'].includes(useUnit)) {
        qtyToDeduct = qtyToDeduct / 1000;
    }

    // 1. Reduce Inventory
    const updatedItem = {
        ...itemToConsume,
        quantity: Math.max(0, itemToConsume.quantity - qtyToDeduct),
        lastUpdated: consumeItem.date // Update last interaction date
    };
    dataService.saveInventoryItem(updatedItem);

    // 2. Allocate Expense to Batch (If selected)
    if (consumeItem.batchId && itemToConsume.avgCost && itemToConsume.avgCost > 0) {
        // Calculate value based on NORMALIZED quantity (qtyToDeduct is in base stock units)
        const consumptionValue = qtyToDeduct * itemToConsume.avgCost;
        
        const expense: Expense = {
            id: `E-USE-${Date.now()}`,
            flockId: consumeItem.batchId,
            category: itemToConsume.type as any,
            amount: Math.max(1, Math.round(consumptionValue)), // Ensure at least 1 rupee if usage is small but non-zero
            date: consumeItem.date,
            description: `Used ${consumeItem.quantity} ${consumeItem.unit || itemToConsume.unit} ${itemToConsume.name} (Inventory)`,
            type: 'Usage'
        };

        dataService.saveExpense(expense);
    }

    setShowConsumeModal(false);
    setConsumeItem({ id: '', quantity: 0, unit: '', batchId: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleOtherExpense = () => {
      if(newItem.cost <= 0) return;

      const expense: Expense = {
        id: `E-${Date.now()}`,
        category: newItem.type as any, // Electricity, Labour, etc.
        amount: Number(newItem.cost),
        date: new Date().toISOString().split('T')[0],
        description: newItem.name || 'Miscellaneous Expense',
        type: 'Cash'
    };
    dataService.saveExpense(expense);
    setShowAddModal(false);
    setNewItem({ name: '', quantity: 0, unit: '', cost: 0, type: 'Other', threshold: 0 });
  };

  // --- EDIT & DELETE HANDLERS ---
  const handleEditClick = (item: InventoryItem) => {
      setEditingInventoryItem({...item});
      setShowEditModal(true);
  };

  const handleDeleteClick = (id: string) => {
      if(window.confirm("Move this inventory item to Trash?")) {
          const item = inventory.find(i => i.id === id);
          if(item) {
              dataService.moveToTrash(item, 'Inventory', `Inventory Item: ${item.name} (${item.quantity} ${item.unit})`);
              dataService.deleteInventoryItem(id);
          }
      }
  };

  const handleSaveEdit = () => {
      if(!editingInventoryItem) return;
      
      dataService.saveInventoryItem(editingInventoryItem);
      setShowEditModal(false);
      setEditingInventoryItem(null);
  };

  const filteredInventory = inventory.filter(i => {
      if (activeTab === 'feed') return i.type === 'Feed';
      if (activeTab === 'health') return ['Medicine', 'Vaccine', 'Deworming', 'Vitamin'].includes(i.type);
      return false;
  });

  // Helper to calculate estimated cost for the modal preview
  const getSelectedConsumeItem = () => inventory.find(i => i.id === consumeItem.id);
  
  // Helper to get compatible units based on stock unit
  const getAvailableUnits = (baseUnit: string) => {
      const u = baseUnit.toLowerCase();
      if (['kg', 'kilogram', 'kilograms'].includes(u)) return ['kg', 'g'];
      if (['l', 'liter', 'liters'].includes(u)) return ['liters', 'ml'];
      return [baseUnit];
  };

  // Cost estimation helper for UI
  const getEstimatedCost = () => {
      const item = getSelectedConsumeItem();
      if (!item || !item.avgCost) return 0;
      
      let qty = Number(consumeItem.quantity);
      const stockUnit = item.unit.toLowerCase();
      const useUnit = (consumeItem.unit || stockUnit).toLowerCase();
      
      if (['kg', 'kilogram', 'kilograms'].includes(stockUnit) && ['g', 'gram', 'grams'].includes(useUnit)) qty /= 1000;
      if (['l', 'liter', 'liters'].includes(stockUnit) && ['ml', 'milliliter', 'milliliters'].includes(useUnit)) qty /= 1000;
      
      return Math.round(qty * item.avgCost);
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
            <h1 className="text-2xl font-bold text-gray-800">Resources & Inventory</h1>
            <p className="text-gray-500 text-sm">Manage Feed, Meds, and Consumption</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Export Buttons */}
            {activeTab !== 'others' && (
                <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-0.5">
                    <button 
                        onClick={handleExportExcel}
                        className="p-2 text-green-700 hover:bg-green-50 rounded tooltip flex items-center gap-1 text-xs font-semibold"
                        title="Export to Excel"
                    >
                        <FileSpreadsheet size={16}/> Excel
                    </button>
                    <div className="w-px bg-gray-200 my-1"></div>
                    <button 
                        onClick={handleExportPDF}
                        className="p-2 text-red-700 hover:bg-red-50 rounded tooltip flex items-center gap-1 text-xs font-semibold"
                        title="Export to PDF"
                    >
                        <FileText size={16}/> PDF
                    </button>
                </div>
            )}

            <div className="flex bg-gray-200 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTab('feed')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'feed' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}
                >
                    <Package size={16}/> Feed
                </button>
                <button 
                    onClick={() => setActiveTab('health')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'health' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}
                >
                    <Syringe size={16}/> Health
                </button>
                <button 
                    onClick={() => setActiveTab('others')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'others' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600'}`}
                >
                    <Zap size={16}/> Others
                </button>
            </div>
        </div>
      </div>

      {activeTab !== 'others' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Inventory Cards */}
                {filteredInventory.map(item => {
                    const isLowStock = item.quantity <= (item.lowStockThreshold || 0);
                    return (
                    <div key={item.id} className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden transition-all group ${isLowStock ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200 hover:border-orange-200'}`}>
                        {/* Edit/Delete Actions */}
                        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg backdrop-blur-sm">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                                title="Edit Item"
                            >
                                <Pencil size={14}/>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id); }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                title="Delete Item"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>

                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg pr-8">{item.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{item.type}</p>
                            </div>
                            <div className={`p-2 rounded-full ${isLowStock ? 'bg-red-100 text-red-600 animate-pulse' : (item.quantity < 10 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600')}`}>
                                {isLowStock ? <AlertTriangle size={20}/> : <Package size={20}/>}
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="flex items-baseline gap-2">
                                <p className={`text-3xl font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity.toFixed(2)} <span className="text-sm font-normal text-gray-500">{item.unit}</span></p>
                            </div>
                            {item.avgCost && item.avgCost > 0 && (
                                <p className="text-xs text-gray-500 mt-1">Avg Cost: ₹{item.avgCost.toFixed(1)} / {item.unit}</p>
                            )}
                            {isLowStock && <p className="text-xs text-red-500 font-semibold mt-1">Low Stock! (Min: {item.lowStockThreshold})</p>}
                        </div>

                        {/* Record Usage Button on Card */}
                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConsumeItem({ ...consumeItem, id: item.id, unit: item.unit });
                                    setShowConsumeModal(true);
                                }}
                                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 transition-colors"
                            >
                                <Minus size={14} /> Use Stock / Record Usage
                            </button>
                        </div>
                        
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100">
                             <div className={`h-full ${isLowStock ? 'bg-red-500' : 'bg-green-500'}`} style={{width: '100%'}}></div>
                        </div>
                    </div>
                )})}
                
                {/* Empty State / Add New Prompt */}
                <div 
                    onClick={() => {
                        setNewItem({ ...newItem, type: activeTab === 'feed' ? 'Feed' : 'Medicine', unit: activeTab === 'feed' ? 'kg' : 'ml', threshold: 10 });
                        setShowAddModal(true);
                    }}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-orange-400 hover:text-orange-500 cursor-pointer transition-colors min-h-[160px]"
                >
                    <Plus size={32} />
                    <span className="font-medium mt-2">Add New Stock</span>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4">
                 <button 
                    onClick={() => {
                        setNewItem({ ...newItem, type: activeTab === 'feed' ? 'Feed' : 'Medicine', unit: activeTab === 'feed' ? 'kg' : 'ml', threshold: 10 });
                        setShowAddModal(true);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm font-medium"
                >
                    <Plus size={18} /> Purchase / Add Stock
                </button>
                <button 
                    onClick={() => setShowConsumeModal(true)}
                    className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg flex items-center gap-2 shadow-sm font-medium"
                >
                    <Minus size={18} /> Record Usage
                </button>
            </div>

            {/* CONSUMPTION HISTORY */}
            <div className="mt-12 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 text-sm uppercase flex items-center gap-2">
                        <History size={16} className="text-orange-600"/> Recent Consumption History
                    </h3>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Last 10 Records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50/50">
                            <tr>
                                <th className="p-3 font-medium">Date</th>
                                <th className="p-3 font-medium">Item</th>
                                <th className="p-3 font-medium">Quantity</th>
                                <th className="p-3 font-medium">Batch</th>
                                <th className="p-3 font-medium text-right">Cost Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses
                              .filter(e => e.type === 'Usage' && (activeTab === 'feed' ? e.category === 'Feed' : ['Medicine', 'Vaccine', 'Deworming', 'Vitamin'].includes(e.category)))
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 10)
                              .map(exp => (
                                <tr key={exp.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500 whitespace-nowrap">{exp.date}</td>
                                    <td className="p-3 font-medium text-gray-700">
                                        {exp.description.split('Used ')[1]?.split(' (Inventory)')[0] || exp.description}
                                    </td>
                                    <td className="p-3 text-gray-600">
                                        {exp.description.match(/\d+(\.\d+)?\s\w+/)?.[0] || '-'}
                                    </td>
                                    <td className="p-3">
                                        {exp.flockId ? (
                                            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                {(() => {
                                                    const batch = chicks.find(c => c.id === exp.flockId);
                                                    return batch?.batchName || batch?.breed || 'Unknown Batch';
                                                })()}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">General</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-900">₹ {exp.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                            {expenses.filter(e => e.type === 'Usage' && (activeTab === 'feed' ? e.category === 'Feed' : ['Medicine', 'Vaccine', 'Deworming', 'Vitamin'].includes(e.category))).length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No consumption history recorded yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      ) : (
          /* OTHERS TAB (EXPENSES ONLY) */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-6">
                      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <Zap className="text-yellow-500"/> Operational Expenses
                      </h2>
                      <p className="text-xs text-gray-500 mb-6">Log costs for electricity, labour, maintenance, or transport that don't involve inventory stock.</p>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Expense Type</label>
                              <select 
                                className="w-full p-2 border rounded text-sm"
                                value={newItem.type}
                                onChange={e => setNewItem({...newItem, type: e.target.value})}
                              >
                                  <option value="Electricity">Electricity Bill</option>
                                  <option value="Labour">Labour / Workers</option>
                                  <option value="Transport">Transport / Fuel</option>
                                  <option value="Other">Other Maintenance</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Description</label>
                              <input 
                                type="text" 
                                placeholder="e.g., Monthly Bill, Shed Repair"
                                className="w-full p-2 border rounded text-sm"
                                value={newItem.name}
                                onChange={e => setNewItem({...newItem, name: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">Amount (₹)</label>
                              <input 
                                type="number" 
                                className="w-full p-2 border rounded font-bold text-gray-800"
                                value={newItem.cost}
                                onChange={e => setNewItem({...newItem, cost: Number(e.target.value)})}
                              />
                          </div>
                          <button 
                            onClick={handleOtherExpense}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold mt-2 shadow-sm transition-all active:scale-95"
                          >
                              Log Expense
                          </button>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <h3 className="font-bold text-gray-700 text-sm uppercase">Recent Operational Expenses</h3>
                          <History size={16} className="text-gray-400"/>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-gray-500 bg-gray-50/50">
                                  <tr>
                                      <th className="p-3 font-medium">Date</th>
                                      <th className="p-3 font-medium">Type</th>
                                      <th className="p-3 font-medium">Description</th>
                                      <th className="p-3 font-medium text-right">Amount</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {expenses
                                    .filter(e => ['Electricity', 'Labour', 'Transport', 'Other'].includes(e.category))
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 10)
                                    .map(exp => (
                                      <tr key={exp.id} className="hover:bg-gray-50">
                                          <td className="p-3 text-gray-500">{exp.date}</td>
                                          <td className="p-3">
                                              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{exp.category}</span>
                                          </td>
                                          <td className="p-3 text-gray-700">{exp.description}</td>
                                          <td className="p-3 text-right font-bold text-gray-900">₹ {exp.amount.toLocaleString()}</td>
                                      </tr>
                                  ))}
                                  {expenses.filter(e => ['Electricity', 'Labour', 'Transport', 'Other'].includes(e.category)).length === 0 && (
                                      <tr><td colSpan={4} className="p-8 text-center text-gray-400">No operational expenses logged yet.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* PURCHASE MODAL */}
      {showAddModal && activeTab !== 'others' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus/> Purchase Stock</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Category</label>
                          <select 
                            className="w-full border p-2 rounded" 
                            value={newItem.type} 
                            onChange={e => setNewItem({...newItem, type: e.target.value})}
                          >
                              {activeTab === 'feed' ? (
                                  <option value="Feed">Feed & Supplements</option>
                              ) : (
                                  <>
                                    <option value="Medicine">Medicine</option>
                                    <option value="Vaccine">Vaccine</option>
                                    <option value="Deworming">Deworming</option>
                                    <option value="Vitamin">Vitamin/Tonic</option>
                                  </>
                              )}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Item Name</label>
                          <input 
                            type="text" 
                            list="item-suggestions"
                            className="w-full border p-2 rounded" 
                            placeholder={activeTab === 'feed' ? "e.g. Starter, Maize" : "e.g. Lasota, Amprolium"}
                            value={newItem.name} 
                            onChange={e => setNewItem({...newItem, name: e.target.value})} 
                          />
                          <datalist id="item-suggestions">
                              <option value="Pre-Starter Feed"/>
                              <option value="Starter Feed"/>
                              <option value="Grower Feed"/>
                              <option value="Finisher Feed"/>
                              <option value="Maize"/>
                              <option value="Lasota"/>
                              <option value="Gumboro"/>
                              <option value="Tetracycline"/>
                              <option value="Vimeral"/>
                          </datalist>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-600">Quantity</label>
                            <input type="number" className="w-full border p-2 rounded" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Unit</label>
                            <select className="w-full border p-2 rounded" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                                <option value="kg">kg</option>
                                <option value="bags">bags</option>
                                <option value="ml">ml</option>
                                <option value="liters">liters</option>
                                <option value="doses">doses</option>
                            </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-xs text-gray-600">Total Cost (₹)</label>
                            <input type="number" className="w-full border p-2 rounded font-bold" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: Number(e.target.value)})} />
                         </div>
                         <div>
                            <label className="text-xs text-gray-600 text-red-600 font-semibold">Low Stock Alert Limit</label>
                            <input type="number" className="w-full border border-red-200 bg-red-50 p-2 rounded" value={newItem.threshold} onChange={e => setNewItem({...newItem, threshold: Number(e.target.value)})} />
                         </div>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">* This logs an inventory purchase expense. Usage is recorded separately.</p>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handlePurchase} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium">Confirm Purchase</button>
                      <button onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editingInventoryItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2"><Pencil className="text-blue-600"/> Edit Item</h3>
                      <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Item Name</label>
                          <input 
                            type="text" 
                            className="w-full border p-2 rounded" 
                            value={editingInventoryItem.name} 
                            onChange={e => setEditingInventoryItem({...editingInventoryItem, name: e.target.value})} 
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600">Category</label>
                          <select 
                            className="w-full border p-2 rounded bg-gray-50"
                            value={editingInventoryItem.type}
                            onChange={e => setEditingInventoryItem({...editingInventoryItem, type: e.target.value as any})}
                          >
                             <option value="Feed">Feed</option>
                             <option value="Medicine">Medicine</option>
                             <option value="Vaccine">Vaccine</option>
                             <option value="Vitamin">Vitamin</option>
                             <option value="Deworming">Deworming</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-600">Current Quantity</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingInventoryItem.quantity} onChange={e => setEditingInventoryItem({...editingInventoryItem, quantity: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="text-xs text-gray-600">Unit</label>
                            <select className="w-full border p-2 rounded" value={editingInventoryItem.unit} onChange={e => setEditingInventoryItem({...editingInventoryItem, unit: e.target.value})}>
                                <option value="kg">kg</option>
                                <option value="bags">bags</option>
                                <option value="ml">ml</option>
                                <option value="liters">liters</option>
                                <option value="doses">doses</option>
                            </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-xs text-gray-600">Avg Cost / Unit (₹)</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingInventoryItem.avgCost} onChange={e => setEditingInventoryItem({...editingInventoryItem, avgCost: Number(e.target.value)})} />
                         </div>
                         <div>
                            <label className="text-xs text-gray-600">Alert Limit</label>
                            <input type="number" className="w-full border p-2 rounded" value={editingInventoryItem.lowStockThreshold} onChange={e => setEditingInventoryItem({...editingInventoryItem, lowStockThreshold: Number(e.target.value)})} />
                         </div>
                      </div>
                      <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded">
                          <p><strong>Note:</strong> Manually changing quantity/cost here is for correction. It does not log an expense or usage transaction.</p>
                      </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium">Save Changes</button>
                      <button onClick={() => setShowEditModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* CONSUME MODAL */}
      {showConsumeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Minus/> Record Usage</h3>
                  <div className="space-y-3">
                      <div>
                          <label className="text-xs text-gray-600">Select Item</label>
                          <select 
                            className="w-full border p-2 rounded"
                            value={consumeItem.id}
                            onChange={e => {
                                const item = inventory.find(i => i.id === e.target.value);
                                setConsumeItem({
                                    ...consumeItem, 
                                    id: e.target.value,
                                    unit: item ? item.unit : '' 
                                });
                            }}
                          >
                              <option value="">-- Select --</option>
                              {filteredInventory.map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.quantity.toFixed(1)} {i.unit} available)</option>
                              ))}
                          </select>
                      </div>
                      
                      <div>
                          <label className="text-xs text-gray-600">Used For (Batch/Flock)</label>
                          <select 
                             className="w-full border p-2 rounded bg-gray-50"
                             value={consumeItem.batchId}
                             onChange={e => setConsumeItem({...consumeItem, batchId: e.target.value})}
                          >
                              <option value="">General (No Specific Batch)</option>
                              {activeBatches.map(b => (
                                  <option key={b.id} value={b.id}>
                                      {b.breed} - {b.notes || b.id} (Age: {Math.floor((new Date().getTime() - new Date(b.hatchDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}w)
                                  </option>
                              ))}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div className="col-span-2 grid grid-cols-3 gap-2">
                             <div className="col-span-2">
                                <label className="text-xs text-gray-600">Quantity Used</label>
                                <input type="number" className="w-full border p-2 rounded" value={consumeItem.quantity} onChange={e => setConsumeItem({...consumeItem, quantity: Number(e.target.value)})} />
                             </div>
                             <div>
                                <label className="text-xs text-gray-600">Unit</label>
                                <select 
                                    className="w-full border p-2 rounded bg-gray-50" 
                                    value={consumeItem.unit} 
                                    onChange={e => setConsumeItem({...consumeItem, unit: e.target.value})}
                                >
                                    {getSelectedConsumeItem() ? 
                                        getAvailableUnits(getSelectedConsumeItem()!.unit).map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        )) 
                                        : <option value="">-</option>
                                    }
                                </select>
                             </div>
                         </div>
                         <div className="col-span-2">
                            <label className="text-xs text-gray-600">Date</label>
                            <input type="date" className="w-full border p-2 rounded" value={consumeItem.date} onChange={e => setConsumeItem({...consumeItem, date: e.target.value})} />
                         </div>
                      </div>

                      {/* Estimated Cost Preview */}
                      {consumeItem.batchId && getSelectedConsumeItem()?.avgCost && consumeItem.quantity > 0 && (
                          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2 animate-in fade-in">
                              <IndianRupee size={14} className="mt-0.5"/>
                              <div>
                                  <span className="font-bold">Expense Allocation: ₹{getEstimatedCost()}</span>
                                  <p className="opacity-80 mt-0.5">This amount will be added to the batch expenses.</p>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex gap-2 mt-6">
                      <button onClick={handleConsumption} className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-medium">Log Usage</button>
                      <button onClick={() => setShowConsumeModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg">Cancel</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ResourceManager;