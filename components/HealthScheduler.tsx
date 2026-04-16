import React, { useState } from 'react';
import { VACCINE_SCHEDULE } from '../constants';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { HealthRecord, Expense } from '../types';
import { Syringe, Pill, Calendar, CheckCircle, AlertCircle, Clock, Plus, History, ChevronDown, X, Thermometer, Trash2, IndianRupee, Activity, Loader2 } from 'lucide-react';

const HealthScheduler: React.FC = () => {
  const { chicks: allBatches, healthRecords, expenses, isLoading } = useData();
  const [viewCompleted, setViewCompleted] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  
  // Modal State
  const [activeModal, setActiveModal] = useState<'vaccine' | 'treatment' | null>(null);
  const [selectedVaccineItem, setSelectedVaccineItem] = useState<{name: string, ageDays: number} | null>(null);
  
  // Form State
  const [recordForm, setRecordForm] = useState({
      date: new Date().toISOString().split('T')[0],
      cost: 0,
      notes: '',
      // For treatments
      type: 'Medicine',
      name: ''
  });

  const visibleBatches = allBatches.filter(b => viewCompleted ? b.status === 'Completed' : b.status === 'Active');
  
  // Auto-select first active batch if none selected and data is ready
  React.useEffect(() => {
    if (!isLoading && visibleBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(visibleBatches[0].id);
    }
  }, [isLoading, visibleBatches.length, selectedBatchId]);

  const getSelectedBatch = () => allBatches.find(b => b.id === selectedBatchId);
  
  const getBatchRecords = () => healthRecords
    .filter(r => r.flockId === selectedBatchId)
    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Stats Calculation for Selected Batch
  const getBatchStats = () => {
      const records = getBatchRecords();
      const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      const vaccines = records.filter(r => r.type === 'Vaccine').length;
      const treatments = records.filter(r => r.type !== 'Vaccine').length;
      return { totalCost, vaccines, treatments };
  };

  // Calculate Schedule Logic
  const getScheduleStatus = (vaccineName: string, ageDays: number) => {
      const batch = getSelectedBatch();
      if (!batch) return { status: 'unknown', date: '' };

      const hatchDate = new Date(batch.hatchDate);
      const dueDate = new Date(hatchDate);
      dueDate.setDate(hatchDate.getDate() + ageDays);
      
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Check if done
      const record = healthRecords.find(r => r.flockId === selectedBatchId && r.type === 'Vaccine' && r.name === vaccineName);

      if (record) {
          return { status: 'done', date: record.date, recordId: record.id };
      }

      if (dueDateStr < todayStr) return { status: 'overdue', date: dueDateStr };
      if (dueDateStr === todayStr) return { status: 'due', date: dueDateStr };
      return { status: 'upcoming', date: dueDateStr };
  };

  const handleSaveRecord = () => {
      if (!selectedBatchId) return;

      let type = recordForm.type;
      let name = recordForm.name;
      let isScheduled = false;

      // Logic for Vaccine Modal
      if (activeModal === 'vaccine' && selectedVaccineItem) {
          type = 'Vaccine';
          name = selectedVaccineItem.name;
          isScheduled = true;
      }

      if (!name) {
          alert("Please enter a name for the treatment/medicine.");
          return;
      }

      const newRecord: HealthRecord = {
          id: `H-${Date.now()}`,
          flockId: selectedBatchId,
          type: type as any,
          name: name,
          date: recordForm.date,
          cost: Number(recordForm.cost),
          notes: recordForm.notes,
          isScheduled
      };

      // 1. Save Health Record
      dataService.saveHealthRecord(newRecord);

      // 2. Save Expense if Cost > 0
      if (newRecord.cost > 0) {
          const expense: Expense = {
              id: `E-H-${Date.now()}`,
              flockId: selectedBatchId,
              category: (['Vaccine', 'Medicine', 'Deworming', 'Vitamin'].includes(type) ? type : 'Other') as any,
              amount: newRecord.cost,
              date: newRecord.date,
              description: `${type}: ${name}`,
              type: 'Cash'
          };
          dataService.saveExpense(expense);
      }

      setActiveModal(null);
      setRecordForm({ date: new Date().toISOString().split('T')[0], cost: 0, notes: '', type: 'Medicine', name: '' });
      setSelectedVaccineItem(null);
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm("Move this health record to trash?")) {
        const recordToDelete = healthRecords.find(r => r.id === id);
        if (!recordToDelete) return;

        // Move to Trash
        dataService.moveToTrash(recordToDelete, 'Health', `Health Record: ${recordToDelete.type} - ${recordToDelete.name}`);
        
        // Delete from main collection
        dataService.deleteHealthRecord(id);

        // Remove linked expense if exists (heuristic)
        if (recordToDelete.cost > 0) {
             const linkedExpense = expenses.find(e => 
                 e.flockId === recordToDelete.flockId &&
                 e.date === recordToDelete.date &&
                 e.amount === recordToDelete.cost &&
                 e.description.includes(recordToDelete.name)
             );
             
             if (linkedExpense) {
                 dataService.moveToTrash(linkedExpense, 'Expense', `Linked Expense: ${linkedExpense.description}`);
                 dataService.deleteExpense(linkedExpense.id);
             }
        }
    }
  };

  const getAgeDisplay = (hatchDate: string) => {
      if (!hatchDate) return 'N/A';
      const diff = Math.floor((new Date().getTime() - new Date(hatchDate).getTime()) / (1000 * 60 * 60 * 24));
      const weeks = Math.floor(diff / 7);
      const days = diff % 7;
      return `${weeks}w ${days}d (${diff} days)`;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  const stats = getBatchStats();

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Vaccine & Health Scheduler</h1>
            <p className="text-gray-500 text-sm">Track vaccinations and treatments per flock</p>
          </div>
          
          {/* Batch Selector & Toggle */}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
             <div className="flex bg-gray-100 p-1 rounded-lg">
                 <button 
                    onClick={() => { setViewCompleted(false); setSelectedBatchId(''); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!viewCompleted ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
                 >
                     Active Flocks
                 </button>
                 <button 
                    onClick={() => { setViewCompleted(true); setSelectedBatchId(''); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewCompleted ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
                 >
                     Completed
                 </button>
             </div>

             <div className="relative flex-1">
                 <select 
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full md:min-w-[250px] appearance-none bg-white border border-orange-300 text-gray-800 py-2 px-4 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                 >
                     <option value="">-- Select Flock --</option>
                     {visibleBatches.map(b => (
                         <option key={b.id} value={b.id}>
                             {b.notes ? b.notes : b.id} - {b.breed}
                         </option>
                     ))}
                 </select>
                 <ChevronDown className="absolute right-3 top-3 text-orange-500 pointer-events-none" size={16}/>
             </div>
          </div>
      </div>

      {!selectedBatchId ? (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Thermometer className="text-orange-500" size={32}/>
              </div>
              <h3 className="text-lg font-bold text-orange-900 mb-1">Select a Flock</h3>
              <p className="text-orange-700 max-w-sm">
                  {visibleBatches.length === 0 
                    ? `No ${viewCompleted ? 'completed' : 'active'} flocks found. Add a new batch in Flock Manager.` 
                    : "Choose a batch from the dropdown above to view its vaccination schedule and health history."}
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
              
              {/* Left Column: Schedule */}
              <div className="lg:col-span-2 space-y-6">
                  
                  {/* Batch Summary Card */}
                  {getSelectedBatch() && (
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                           <div>
                               <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Current Age</p>
                               <p className="text-lg font-bold text-orange-600">{getAgeDisplay(getSelectedBatch()!.hatchDate)}</p>
                           </div>
                           <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                           <div>
                               <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Hatch Date</p>
                               <p className="text-gray-800 font-medium">{getSelectedBatch()!.hatchDate}</p>
                           </div>
                           <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                           <div>
                               <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Flock Size</p>
                               <p className="text-gray-800 font-medium">{getSelectedBatch()!.currentCount} Birds</p>
                           </div>
                           <button 
                             onClick={() => { setActiveModal('treatment'); setRecordForm({...recordForm, type: 'Medicine', name: ''}); }}
                             className="ml-auto bg-orange-100 text-orange-700 hover:bg-orange-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                           >
                               <Plus size={16}/> Add Treatment
                           </button>
                      </div>
                  )}

                  {/* Vaccination Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                          <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                              <Syringe size={20} /> Vaccination Schedule
                          </h2>
                          <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">Auto-Calculated</span>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                  <tr>
                                      <th className="p-4">Schedule Age</th>
                                      <th className="p-4">Vaccine / Route</th>
                                      <th className="p-4">Due Date</th>
                                      <th className="p-4 text-center">Status</th>
                                      <th className="p-4 text-right">Action</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {VACCINE_SCHEDULE.map((v, i) => {
                                      const { status, date } = getScheduleStatus(v.name, v.ageDays);
                                      return (
                                          <tr key={i} className={`hover:bg-gray-50 transition-colors ${status === 'overdue' ? 'bg-red-50/30' : ''}`}>
                                              <td className="p-4">
                                                  <span className="font-bold text-gray-700">{v.ageDays} Days</span>
                                              </td>
                                              <td className="p-4">
                                                  <div className="font-medium text-gray-900">{v.name}</div>
                                                  <div className="text-xs text-gray-500">{v.method} • {v.dose}</div>
                                              </td>
                                              <td className="p-4 text-gray-600 font-medium">
                                                  {date}
                                              </td>
                                              <td className="p-4 text-center">
                                                  {status === 'done' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12}/> Done</span>}
                                                  {status === 'overdue' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><AlertCircle size={12}/> Overdue</span>}
                                                  {status === 'due' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><Clock size={12}/> Due Today</span>}
                                                  {status === 'upcoming' && <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Upcoming</span>}
                                              </td>
                                              <td className="p-4 text-right">
                                                  {status !== 'done' ? (
                                                      <button 
                                                        onClick={() => { setSelectedVaccineItem(v); setActiveModal('vaccine'); }}
                                                        disabled={viewCompleted}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded border shadow-sm transition-colors ${
                                                            viewCompleted ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400' :
                                                            status === 'overdue' 
                                                                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                                                                : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                                                        }`}
                                                      >
                                                          Mark Done
                                                      </button>
                                                  ) : (
                                                      <span className="text-xs text-gray-400 italic">Completed</span>
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>

              {/* Right Column: History & Stats */}
              <div className="space-y-6">
                  {/* Health Financial Summary */}
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                        <Activity className="text-orange-600" size={18} />
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Health Summary</h3>
                      </div>
                      
                      <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Total Health Cost</p>
                            <p className="text-2xl font-bold text-gray-900 flex items-center gap-0.5">
                                <IndianRupee size={20} className="text-gray-400"/>
                                {stats.totalCost.toLocaleString()}
                            </p>
                        </div>
                        <div className="flex gap-2">
                             <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                                 <div className="text-lg leading-none">{stats.vaccines}</div>
                                 <div className="text-[10px] font-medium opacity-75">Vaccines</div>
                             </div>
                             <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                                 <div className="text-lg leading-none">{stats.treatments}</div>
                                 <div className="text-[10px] font-medium opacity-75">Medicines</div>
                             </div>
                        </div>
                      </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100%-180px)] min-h-[400px] flex flex-col">
                      <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                          <h2 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                              <History size={20} /> History Log
                          </h2>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-4">
                          {getBatchRecords().length === 0 ? (
                              <div className="text-center py-8 text-gray-400">
                                  <Pill size={32} className="mx-auto mb-2 opacity-20"/>
                                  <p className="text-sm">No records found for this batch.</p>
                              </div>
                          ) : (
                              getBatchRecords().map(record => (
                                  <div key={record.id} className="relative border-l-2 border-orange-200 pl-4 pb-2 group">
                                      <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-orange-400"></div>
                                      
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="text-xs text-gray-400 font-medium mb-0.5">{record.date}</p>
                                              <h4 className="text-sm font-bold text-gray-800">{record.name}</h4>
                                          </div>
                                          <button 
                                              onClick={() => handleDeleteRecord(record.id)}
                                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                              title="Delete Record"
                                          >
                                              <Trash2 size={14}/>
                                          </button>
                                      </div>

                                      <div className="flex justify-between items-center mt-1">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${record.type === 'Vaccine' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                              {record.type}
                                          </span>
                                          {record.cost > 0 && (
                                              <span className="text-xs text-gray-600 font-medium">₹{record.cost}</span>
                                          )}
                                      </div>
                                      {record.notes && <p className="text-xs text-gray-500 mt-1 italic">"{record.notes}"</p>}
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: Mark Vaccine / Add Treatment */}
      {activeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                          {activeModal === 'vaccine' ? <Syringe className="text-blue-600"/> : <Pill className="text-green-600"/>}
                          {activeModal === 'vaccine' ? 'Confirm Vaccination' : 'Record Treatment'}
                      </h3>
                      <button onClick={() => { setActiveModal(null); setSelectedVaccineItem(null); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  {/* Context Header */}
                  {getSelectedBatch() && (
                      <div className="bg-gray-100 p-2 rounded text-xs text-gray-600 mb-4 flex justify-between items-center">
                          <span>For Flock:</span>
                          <span className="font-bold text-gray-800">{getSelectedBatch()?.breed} - {getSelectedBatch()?.notes || getSelectedBatch()?.id}</span>
                      </div>
                  )}
                  
                  <div className="space-y-4">
                      {activeModal === 'vaccine' && selectedVaccineItem ? (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                              <p className="text-sm text-blue-800 font-medium">Vaccine: <span className="font-bold">{selectedVaccineItem.name}</span></p>
                              <p className="text-xs text-blue-600 mt-1">Scheduled for Day {selectedVaccineItem.ageDays}</p>
                          </div>
                      ) : (
                          <>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Type</label>
                                <div className="flex gap-2 mt-1">
                                    {['Medicine', 'Deworming', 'Vitamin', 'Other'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setRecordForm({...recordForm, type: t})}
                                            className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${recordForm.type === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-600 uppercase">Name *</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Tetracycline, Albendazole"
                                    className="w-full p-2 border rounded mt-1 focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                                    value={recordForm.name}
                                    onChange={e => setRecordForm({...recordForm, name: e.target.value})}
                                />
                            </div>
                          </>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase">Date Given</label>
                              <input 
                                type="date" 
                                className="w-full p-2 border rounded mt-1 text-sm"
                                value={recordForm.date}
                                onChange={e => setRecordForm({...recordForm, date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-semibold text-gray-600 uppercase">Cost (₹)</label>
                              <input 
                                type="number" 
                                min="0"
                                className="w-full p-2 border rounded mt-1 text-sm font-medium"
                                value={recordForm.cost}
                                onChange={e => setRecordForm({...recordForm, cost: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-semibold text-gray-600 uppercase">Notes (Optional)</label>
                          <textarea 
                              rows={2}
                              className="w-full p-2 border rounded mt-1 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                              placeholder="Any observations..."
                              value={recordForm.notes}
                              onChange={e => setRecordForm({...recordForm, notes: e.target.value})}
                          />
                      </div>
                      
                      {recordForm.cost > 0 && (
                          <div className="text-[10px] text-gray-500 italic bg-gray-50 p-2 rounded">
                              <span className="font-bold text-orange-600">*</span> ₹{recordForm.cost} will be automatically added to the Expense Log for this flock.
                          </div>
                      )}
                  </div>

                  <div className="flex gap-3 mt-6">
                      <button onClick={handleSaveRecord} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold shadow-sm transition-colors">
                          Save Record
                      </button>
                      <button onClick={() => { setActiveModal(null); setSelectedVaccineItem(null); }} className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg font-medium transition-colors">
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HealthScheduler;
