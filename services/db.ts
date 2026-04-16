import { Chick, SalesRecord, Expense, InventoryItem, HealthRecord, TrashItem, Invoice, Payment, UserProfile } from '../types';

// ============================================
// LocalStorage Keys
// ============================================
const USERS_KEY = 'poultrymitra_users';
const CURRENT_USER_KEY = 'poultrymitra_current_uid';
const STORAGE_PREFIX = 'poultrymitra_data_';

// ============================================
// Event Bus for Subscription Mocking
// ============================================
type ListenerType = 'auth' | 'profile' | 'chicks' | 'sales' | 'expenses' | 'inventory' | 'health' | 'invoices' | 'payments' | 'trash';

class EventEmitter {
  private listeners: Record<string, Set<Function>> = {};

  on(event: ListenerType, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(callback);
    return () => this.listeners[event].delete(callback);
  }

  emit(event: ListenerType, data?: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }
}

const events = new EventEmitter();

// ============================================
// Helpers
// ============================================
const getLocal = (key: string, defaultVal: any = []) => {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultVal;
  try { return JSON.parse(stored); } catch { return defaultVal; }
};

const setLocal = (key: string, val: any) => {
  localStorage.setItem(key, JSON.stringify(val));
};

const getCollectionKey = (uid: string, colName: string) => `${STORAGE_PREFIX}${uid}_${colName}`;

let currentUid: string | null = localStorage.getItem(CURRENT_USER_KEY);

// ============================================
// Auth Layer (Offline Mock)
// ============================================
/**
 * Authentication service handling user registration, login, and offline persistence.
 * Mocks typical auth flows using browser local storage to maintain session states.
 */
export const authService = {
  async register(data: any) {
    const users = getLocal(USERS_KEY, []);
    if (users.find((u: any) => u.email === data.email)) {
      throw new Error('Email already in use.');
    }
    
    const newUser = {
      uid: 'user_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      email: data.email,
      password: data.password,
      name: data.name,
      farmName: data.farmName,
      mobile: data.mobile,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    setLocal(USERS_KEY, users);
    
    currentUid = newUser.uid;
    localStorage.setItem(CURRENT_USER_KEY, newUser.uid);
    events.emit('auth', { uid: newUser.uid });
    events.emit('profile', newUser);
    return newUser;
  },

  async login(email: string, password: string) {
    const users = getLocal(USERS_KEY, []);
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid email or password.');
    
    currentUid = user.uid;
    localStorage.setItem(CURRENT_USER_KEY, user.uid);
    events.emit('auth', { uid: user.uid });
    events.emit('profile', user);
    return user;
  },

  async logout() {
    currentUid = null;
    localStorage.removeItem(CURRENT_USER_KEY);
    events.emit('auth', null);
  },

  onAuthChange(callback: (user: any | null) => void) {
    callback(currentUid ? { uid: currentUid } : null);
    return events.on('auth', callback);
  },

  async updateFarmName(farmName: string) {
    if (!currentUid) return;
    const users = getLocal(USERS_KEY, []);
    const index = users.findIndex((u: any) => u.uid === currentUid);
    if (index > -1) {
      users[index].farmName = farmName;
      setLocal(USERS_KEY, users);
      events.emit('profile', users[index]);
    }
  }
};

// ============================================
// Data Layer (Offline DB)
// ============================================
/**
 * Main application data service acting as a proxy to local storage collections.
 * Handles Subscriptions, CRUD operations, and generic collections (sales, inventory, chicks).
 */
export const dataService = {
  get uid() { return currentUid; },

  subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    const fetchProfile = () => {
      const users = getLocal(USERS_KEY, []);
      const user = users.find((u: any) => u.uid === uid);
      callback(user || null);
    };
    fetchProfile();
    return events.on('profile', fetchProfile);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const users = getLocal(USERS_KEY, []);
    return users.find((u: any) => u.uid === uid) || null;
  },

  _subscribeToCollection<T>(colName: ListenerType, callback: (data: T[]) => void) {
    const fetchCollection = () => {
      if (!this.uid) return callback([]);
      const data = getLocal(getCollectionKey(this.uid, colName), []);
      callback(data);
    };
    fetchCollection();
    return events.on(colName, fetchCollection);
  },

  async _saveDoc(colName: ListenerType, item: any) {
    if (!this.uid) throw new Error('Not authenticated');
    const key = getCollectionKey(this.uid, colName);
    const data = getLocal(key, []);
    
    // Auto-generate an ID if it's a new item natively like Firebase docRef
    if (!item.id) {
      item.id = colName.substring(0, 3) + '_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Ensure userId is present natively
    if (!item.userId) {
      item.userId = this.uid;
    }

    const index = data.findIndex((i: any) => i.id === item.id);
    if (index > -1) {
      data[index] = { ...data[index], ...item };
    } else {
      data.push(item);
    }
    
    setLocal(key, data);
    events.emit(colName);
  },

  async _deleteDoc(colName: ListenerType, id: string) {
    if (!this.uid) throw new Error('Not authenticated');
    const key = getCollectionKey(this.uid, colName);
    let data = getLocal(key, []);
    data = data.filter((item: any) => item.id !== id);
    setLocal(key, data);
    events.emit(colName);
  },

  subscribeChicks(cb: any) { return this._subscribeToCollection('chicks', cb); },
  subscribeSales(cb: any) { return this._subscribeToCollection('sales', cb); },
  subscribeExpenses(cb: any) { return this._subscribeToCollection('expenses', cb); },
  subscribeInventory(cb: any) { return this._subscribeToCollection('inventory', cb); },
  subscribeHealthRecords(cb: any) { return this._subscribeToCollection('health', cb); },
  subscribeInvoices(cb: any) { return this._subscribeToCollection('invoices', cb); },
  subscribePayments(cb: any) { return this._subscribeToCollection('payments', cb); },
  subscribeTrash(cb: any) { return this._subscribeToCollection('trash', cb); },

  async saveChick(item: any) { return this._saveDoc('chicks', item); },
  async deleteChick(id: string) { return this._deleteDoc('chicks', id); },

  async saveSale(item: any) { return this._saveDoc('sales', item); },
  async deleteSale(id: string) { return this._deleteDoc('sales', id); },

  async saveExpense(item: any) { return this._saveDoc('expenses', item); },
  async deleteExpense(id: string) { return this._deleteDoc('expenses', id); },

  async saveInventoryItem(item: any) { return this._saveDoc('inventory', item); },
  async deleteInventoryItem(id: string) { return this._deleteDoc('inventory', id); },

  async saveHealthRecord(item: any) { return this._saveDoc('health', item); },
  async deleteHealthRecord(id: string) { return this._deleteDoc('health', id); },

  async saveInvoice(item: any) { return this._saveDoc('invoices', item); },
  async deleteInvoice(id: string) { return this._deleteDoc('invoices', id); },

  async savePayment(item: any) { return this._saveDoc('payments', item); },
  async deletePayment(id: string) { return this._deleteDoc('payments', id); },

  async moveToTrash(item: any, type: string, description: string) { 
    return this._saveDoc('trash', { 
      originalId: item.id, 
      type, 
      data: item, 
      description,
      deletedDate: new Date().toISOString()
    }); 
  },
  async restoreFromTrash(id: string) { return this._deleteDoc('trash', id); },
  async deleteFromTrash(id: string) { return this._deleteDoc('trash', id); },

  async exportDatabase() {
    if (!this.uid) throw new Error('Not authenticated');
    const cols: ListenerType[] = ['chicks', 'sales', 'expenses', 'inventory', 'health', 'invoices', 'payments'];
    const exportObj: any = {};
    cols.forEach(col => {
      exportObj[col] = getLocal(getCollectionKey(this.uid as string, col), []);
    });
    return JSON.stringify(exportObj);
  },

  async importDatabase(jsonData: string) {
    if (!this.uid) throw new Error('Not authenticated');
    const parsed = JSON.parse(jsonData);
    Object.keys(parsed).forEach(col => {
      setLocal(getCollectionKey(this.uid as string, col), parsed[col]);
      events.emit(col as ListenerType);
    });
  }
};
