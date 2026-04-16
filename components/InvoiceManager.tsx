import React, { useState } from 'react';
import { Invoice, InvoiceItem, Payment } from '../types';
import { dataService } from '../services/db';
import { useData } from '../hooks/useData';
import { exportService } from '../services/exportUtils';
import { Plus, FileText, IndianRupee, Trash2, Download, QrCode, RefreshCw, Loader2 } from 'lucide-react';

const InvoiceManager: React.FC = () => {
  const { invoices, payments, chicks, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  
  // Create Invoice State
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    customerName: '',
    customerPhone: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    taxRate: 0,
    paymentMethod: 'Cash',
    isRecurring: false,
    recurringInterval: 'Monthly',
    status: 'Pending'
  });
  
  const [currentItem, setCurrentItem] = useState<InvoiceItem>({
    id: '',
    description: '',
    quantity: 1,
    unit: 'kg',
    rate: 0,
    amount: 0
  });

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedFlockId, setSelectedFlockId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer'>('Cash');

  // --- Calculations ---
  const calculateTotals = (items: InvoiceItem[], taxRate: number) => {
    const subTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subTotal * taxRate) / 100;
    const totalAmount = subTotal + taxAmount;
    return { subTotal, taxAmount, totalAmount };
  };

  // --- Handlers ---
  const addItem = () => {
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.rate <= 0) return;
    
    const newItem = { ...currentItem, id: `ITEM-${Date.now()}`, amount: currentItem.quantity * currentItem.rate };
    const updatedItems = [...(newInvoice.items || []), newItem];
    
    const { subTotal, taxAmount, totalAmount } = calculateTotals(updatedItems, newInvoice.taxRate || 0);
    
    setNewInvoice({ 
      ...newInvoice, 
      items: updatedItems,
      subTotal,
      taxAmount,
      totalAmount
    });
    
    setCurrentItem({ id: '', description: '', quantity: 1, unit: 'kg', rate: 0, amount: 0 });
  };

  const removeItem = (id: string) => {
    const updatedItems = (newInvoice.items || []).filter(i => i.id !== id);
    const { subTotal, taxAmount, totalAmount } = calculateTotals(updatedItems, newInvoice.taxRate || 0);
    setNewInvoice({ ...newInvoice, items: updatedItems, subTotal, taxAmount, totalAmount });
  };

  const createInvoice = () => {
    if (!newInvoice.customerName || (newInvoice.items || []).length === 0) {
      alert("Please fill customer details and add at least one item.");
      return;
    }

    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      date: newInvoice.date!,
      dueDate: newInvoice.dueDate!,
      customerName: newInvoice.customerName!,
      customerPhone: newInvoice.customerPhone,
      customerAddress: newInvoice.customerAddress,
      items: newInvoice.items!,
      subTotal: newInvoice.subTotal || 0,
      taxRate: newInvoice.taxRate || 0,
      taxAmount: newInvoice.taxAmount || 0,
      totalAmount: newInvoice.totalAmount || 0,
      amountPaid: 0,
      status: 'Pending',
      paymentMethod: newInvoice.paymentMethod as any,
      isRecurring: newInvoice.isRecurring || false,
      recurringInterval: newInvoice.recurringInterval as any,
      notes: newInvoice.notes
    };

    dataService.saveInvoice(invoice);
    setActiveTab('list');
    setNewInvoice({
        customerName: '',
        customerPhone: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        taxRate: 0,
        paymentMethod: 'Cash',
        isRecurring: false,
        recurringInterval: 'Monthly',
        status: 'Pending'
    });
  };

  const handleRecordPayment = () => {
    if (!selectedInvoice || paymentAmount <= 0) return;

    const payment: Payment = {
        id: `PAY-${Date.now()}`,
        invoiceId: selectedInvoice.id,
        flockId: selectedFlockId || undefined,
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        method: paymentMethod
    };

    // Update Invoice Status
    const newAmountPaid = selectedInvoice.amountPaid + paymentAmount;
    let newStatus: Invoice['status'] = selectedInvoice.status;
    
    if (newAmountPaid >= selectedInvoice.totalAmount) {
        newStatus = 'Paid';
    } else if (newAmountPaid > 0) {
        newStatus = 'Partial';
    }

    const updatedInvoice = { ...selectedInvoice, amountPaid: newAmountPaid, status: newStatus };

    dataService.savePayment(payment);
    dataService.saveInvoice(updatedInvoice);
    
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPaymentAmount(0);
    setSelectedFlockId('');
  };

  const deleteInvoice = (id: string) => {
      if (window.confirm("Delete this invoice?")) {
          dataService.deleteInvoice(id);
      }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  const activeChicks = chicks.filter(c => c.status === 'Active');
  const sortedInvoices = [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Invoice & Billing</h1>
            <p className="text-gray-500 text-sm">Manage Invoices, Payments & Tax</p>
        </div>
        <button 
            onClick={() => setActiveTab(activeTab === 'list' ? 'create' : 'list')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium"
        >
            {activeTab === 'list' ? <><Plus size={18}/> New Invoice</> : 'Back to List'}
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice List */}
            <div className="lg:col-span-2 space-y-4">
                {sortedInvoices.length === 0 && (
                    <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                        <FileText size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>No invoices found. Create one to get started.</p>
                    </div>
                )}
                {sortedInvoices.map(inv => (
                    <div key={inv.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-gray-800">{inv.customerName}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        inv.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                        inv.status === 'Overdue' ? 'bg-red-100 text-red-700 border-red-200' :
                                        inv.status === 'Partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                        'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        {inv.status}
                                    </span>
                                    {inv.isRecurring && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                                            <RefreshCw size={10}/> {inv.recurringInterval}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">#{inv.invoiceNumber} • {inv.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-gray-900">₹ {inv.totalAmount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Due: {inv.dueDate}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                                Paid: <span className="font-semibold text-green-600">₹ {inv.amountPaid.toLocaleString()}</span>
                                {inv.totalAmount - inv.amountPaid > 0 && (
                                    <span className="ml-2 text-red-500">
                                        (Bal: ₹ {(inv.totalAmount - inv.amountPaid).toLocaleString()})
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => exportService.generateInvoicePDF(inv, 'PoultryMitra Farm')}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg tooltip"
                                    title="Download PDF"
                                >
                                    <Download size={18}/>
                                </button>
                                {inv.status !== 'Paid' && (
                                    <button 
                                        onClick={() => {
                                            setSelectedInvoice(inv);
                                            setPaymentAmount(inv.totalAmount - inv.amountPaid);
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold flex items-center gap-1"
                                    >
                                        <IndianRupee size={14}/> Record Pay
                                    </button>
                                )}
                                <button onClick={() => deleteInvoice(inv.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Stats & Quick Actions */}
            <div className="space-y-6">
                <div className="bg-blue-900 text-white p-6 rounded-xl shadow-lg">
                    <h3 className="font-bold text-blue-200 mb-4">Financial Summary</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm opacity-80">Total Invoiced</span>
                            <span className="font-bold text-lg">₹ {invoices.reduce((acc, i) => acc + i.totalAmount, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm opacity-80">Received</span>
                            <span className="font-bold text-lg text-green-400">₹ {invoices.reduce((acc, i) => acc + i.amountPaid, 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-blue-800">
                            <span className="text-sm opacity-80">Pending</span>
                            <span className="font-bold text-lg text-yellow-400">₹ {invoices.reduce((acc, i) => acc + (i.totalAmount - i.amountPaid), 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase">Recent Payments</h3>
                    <div className="space-y-3">
                        {payments.slice(0, 5).map(pay => {
                            const linkedFlock = chicks.find(c => c.id === pay.flockId);
                            return (
                                <div key={pay.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                                    <div>
                                        <p className="font-medium text-gray-800">₹ {pay.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">
                                            {pay.date} • {pay.method}
                                            {linkedFlock && (
                                                <span className="ml-1 text-blue-600 font-medium">
                                                    ({linkedFlock.breed})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Received</span>
                                </div>
                            );
                        })}
                        {payments.length === 0 && <p className="text-xs text-gray-400">No payments recorded yet.</p>}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        /* CREATE INVOICE FORM */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl mx-auto animate-in fade-in">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-bold text-lg text-gray-800">Create New Invoice</h2>
                <div className="text-sm text-gray-500">
                    Date: {newInvoice.date}
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Customer Information</h3>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded"
                                value={newInvoice.customerName}
                                onChange={e => setNewInvoice({...newInvoice, customerName: e.target.value})}
                                placeholder="Enter name"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded"
                                value={newInvoice.customerPhone}
                                onChange={e => setNewInvoice({...newInvoice, customerPhone: e.target.value})}
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Billing Address</label>
                            <textarea 
                                className="w-full p-2 border rounded h-20"
                                value={newInvoice.customerAddress}
                                onChange={e => setNewInvoice({...newInvoice, customerAddress: e.target.value})}
                                placeholder="Optional"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-700 uppercase">Invoice Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded"
                                    value={newInvoice.date}
                                    onChange={e => setNewInvoice({...newInvoice, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2 border rounded"
                                    value={newInvoice.dueDate}
                                    onChange={e => setNewInvoice({...newInvoice, dueDate: e.target.value})}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-purple-50 p-3 rounded-lg border border-purple-100">
                            <input 
                                type="checkbox" 
                                id="recurring"
                                checked={newInvoice.isRecurring}
                                onChange={e => setNewInvoice({...newInvoice, isRecurring: e.target.checked})}
                                className="w-4 h-4 text-purple-600 rounded"
                            />
                            <div className="flex-1">
                                <label htmlFor="recurring" className="block text-sm font-medium text-purple-900">Recurring Invoice</label>
                                <p className="text-xs text-purple-700">Auto-generate this bill periodically</p>
                            </div>
                            {newInvoice.isRecurring && (
                                <select 
                                    className="text-xs p-1 rounded border border-purple-200"
                                    value={newInvoice.recurringInterval}
                                    onChange={e => setNewInvoice({...newInvoice, recurringInterval: e.target.value as any})}
                                >
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly">Monthly</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div>
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-3">Items & Services</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                        <div className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-2 items-end">
                            <div className="col-span-2 md:col-span-5">
                                <label className="block text-xs text-gray-500 mb-1">Description</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded text-sm"
                                    placeholder="Item name"
                                    value={currentItem.description}
                                    onChange={e => setCurrentItem({...currentItem, description: e.target.value})}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded text-sm"
                                    value={currentItem.quantity}
                                    onChange={e => setCurrentItem({...currentItem, quantity: Number(e.target.value)})}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Rate</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded text-sm"
                                    value={currentItem.rate}
                                    onChange={e => setCurrentItem({...currentItem, rate: Number(e.target.value)})}
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">Amount</label>
                                <div className="w-full p-2 bg-gray-200 rounded text-sm font-bold text-gray-700">
                                    {(currentItem.quantity * currentItem.rate).toFixed(2)}
                                </div>
                            </div>
                            <div className="col-span-1 md:col-span-1">
                                <button 
                                    onClick={addItem}
                                    className="w-full p-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex justify-center items-center"
                                >
                                    <Plus size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Item List */}
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[500px]">
                            <thead className="bg-gray-100 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-3">Description</th>
                                    <th className="p-3 text-center">Qty</th>
                                    <th className="p-3 text-right">Rate</th>
                                    <th className="p-3 text-right">Amount</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(newInvoice.items || []).map(item => (
                                    <tr key={item.id}>
                                        <td className="p-3">{item.description}</td>
                                        <td className="p-3 text-center">{item.quantity}</td>
                                        <td className="p-3 text-right">{item.rate}</td>
                                        <td className="p-3 text-right font-medium">{item.amount}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {(newInvoice.items || []).length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400">No items added yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Totals & Tax */}
                <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">₹ {(newInvoice.subTotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600 flex items-center gap-2">
                                Tax / GST (%)
                                <input 
                                    type="number" 
                                    className="w-16 p-1 border rounded text-right"
                                    value={newInvoice.taxRate}
                                    onChange={e => {
                                        const rate = Number(e.target.value);
                                        const { subTotal, taxAmount, totalAmount } = calculateTotals(newInvoice.items || [], rate);
                                        setNewInvoice({ ...newInvoice, taxRate: rate, subTotal, taxAmount, totalAmount });
                                    }}
                                />
                            </span>
                            <span className="font-medium">₹ {(newInvoice.taxAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2 text-gray-900">
                            <span>Total</span>
                            <span>₹ {(newInvoice.totalAmount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button onClick={() => setActiveTab('list')} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium">Cancel</button>
                    <button onClick={createInvoice} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow-sm hover:bg-green-700">Save Invoice</button>
                </div>
            </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><IndianRupee/> Record Payment</h3>
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500">Invoice #{selectedInvoice.invoiceNumber}</p>
                          <p className="font-bold text-gray-800">{selectedInvoice.customerName}</p>
                          <div className="flex justify-between mt-2 text-sm">
                              <span>Total: ₹{selectedInvoice.totalAmount}</span>
                              <span className="text-red-600">Due: ₹{selectedInvoice.totalAmount - selectedInvoice.amountPaid}</span>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Amount Received</label>
                          <input 
                            type="number" 
                            className="w-full p-2 border rounded font-bold text-lg"
                            value={paymentAmount}
                            onChange={e => setPaymentAmount(Number(e.target.value))}
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Link to Flock/Batch (Optional)</label>
                          <select 
                            className="w-full p-2 border rounded text-sm"
                            value={selectedFlockId}
                            onChange={e => setSelectedFlockId(e.target.value)}
                          >
                              <option value="">No specific flock</option>
                              {activeChicks.map(c => (
                                  <option key={c.id} value={c.id}>
                                      {c.breed} - {c.hatchDate} ({c.currentCount} birds)
                                  </option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                          <div className="grid grid-cols-2 gap-2">
                              {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(m => (
                                  <button 
                                    key={m}
                                    onClick={() => setPaymentMethod(m as any)}
                                    className={`p-2 text-xs rounded border ${paymentMethod === m ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200 text-gray-600'}`}
                                  >
                                      {m}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {paymentMethod === 'UPI' && (
                          <div className="bg-gray-100 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                              <QrCode size={64} className="text-gray-800 mb-2"/>
                              <p className="text-xs text-gray-500">Scan to Pay (Simulation)</p>
                              <p className="text-[10px] text-gray-400 mt-1">In a real app, this would show a dynamic UPI QR code.</p>
                          </div>
                      )}

                      <button onClick={handleRecordPayment} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold mt-2">
                          Confirm Payment
                      </button>
                      <button onClick={() => setShowPaymentModal(false)} className="w-full text-gray-500 py-2 text-sm">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default InvoiceManager;
