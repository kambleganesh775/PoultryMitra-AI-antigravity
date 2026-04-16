import { Chick, SalesRecord, Expense, InventoryItem, HealthRecord, TrashItem, Invoice, Payment, UserProfile } from '../types';

// Simple Event Emitter for LocalStorage Mock
class LocalStorageDB {
  private getDb(userId: string) {
    const data = localStorage.getItem(`PM_data_${userId}`);
    if (data) return JSON.parse(data);
    return {
      chicks: [],
      sales: [],
      expenses: [],
      inventory: [],
      healthRecords: [],
      invoices: [],
      payments: [],
      trash: []
    };
  }

  private saveDb(userId: string, data: any) {
    localStorage.setItem(`PM_data_${userId}`, JSON.stringify(data));
    this.notify(userId);
  }

  // Observers
  private listeners: Map<string, Function[]> = new Map();

  subscribe(userId: string, callback: Function) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, []);
    }
    this.listeners.get(userId)!.push(callback);
    // initial call
    callback(this.getDb(userId));
    
    return () => {
      const arr = this.listeners.get(userId) || [];
      this.listeners.set(userId, arr.filter(cb => cb !== callback));
    };
  }

  notify(userId: string) {
    const callbacks = this.listeners.get(userId) || [];
    const data = this.getDb(userId);
    callbacks.forEach(cb => cb(data));
  }

  // Abstract CRUD Operations
  saveItem(userId: string, collection: string, item: any) {
    const db = this.getDb(userId);
    const index = db[collection].findIndex((i: any) => i.id === item.id);
    if (index >= 0) {
      db[collection][index] = item;
    } else {
      db[collection].push(item);
    }
    this.saveDb(userId, db);
  }

  deleteItem(userId: string, collection: string, id: string) {
    const db = this.getDb(userId);
    db[collection] = db[collection].filter((i: any) => i.id !== id);
    this.saveDb(userId, db);
  }
}

const localDb = new LocalStorageDB();

let currentUser: any = null;
const authListeners: Function[] = [];
function notifyAuth() {
  authListeners.forEach(cb => cb(currentUser));
}

// Load current user on start
try {
  const storedUser = localStorage.getItem('PM_currentUser');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
} catch (e) { }

export const authService = {
  async register(data: { email: string, password: string, name: string, farmName: string, mobile: string }) {
    const uid = `USER_${Date.now()}`;
    const user = {
      uid,
      email: data.email,
      name: data.name,
      farmName: data.farmName,
      mobile: data.mobile,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(`PM_USER_${uid}`, JSON.stringify(user));
    // Simulated auth user object
    const authUser = { uid, email: data.email, displayName: data.name };
    currentUser = authUser;
    localStorage.setItem('PM_currentUser', JSON.stringify(currentUser));
    notifyAuth();
    return authUser;
  },

  async login(email: string, password: string) {
    // In a real app we'd verify password. Here we mock it by finding user by email.
    // For local mock, we just look through localStorage for users
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('PM_USER_')) {
        const user = JSON.parse(localStorage.getItem(key) || '{}');
        if (user.email === email) {
          currentUser = { uid: user.uid, email: user.email, displayName: user.name };
          localStorage.setItem('PM_currentUser', JSON.stringify(currentUser));
          notifyAuth();
          return currentUser;
        }
      }
    }
    throw new Error('User not found in local browser storage.');
  },

  async loginWithGoogle() {
    throw new Error('Google Login is not supported in local offline mode.');
  },

  async updateFarmName(farmName: string) {
    if (!currentUser) return;
    const userStr = localStorage.getItem(`PM_USER_${currentUser.uid}`);
    if (userStr) {
      const user = JSON.parse(userStr);
      user.farmName = farmName;
      localStorage.setItem(`PM_USER_${currentUser.uid}`, JSON.stringify(user));
    }
  },

  async logout() {
    currentUser = null;
    localStorage.removeItem('PM_currentUser');
    notifyAuth();
  },

  onAuthChange(callback: (user: any) => void) {
    authListeners.push(callback);
    callback(currentUser); // Call immediately with current state
    return () => {
      const index = authListeners.indexOf(callback);
      if (index > -1) {
        authListeners.splice(index, 1);
      }
    };
  }
};

export const dataService = {
  // Helper to safely get the current userId
  get uid() {
    return currentUser?.uid;
  },

  // --- Profile ---
  subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    // We return a mock un-subscriber that polls every second for changes since profile updates aren't naturally pub-subbed here
    const interval = setInterval(() => {
        const data = localStorage.getItem(`PM_USER_${uid}`);
        if(data) callback(JSON.parse(data));
        else callback(null);
    }, 1000);
    const data = localStorage.getItem(`PM_USER_${uid}`);
    if(data) callback(JSON.parse(data)); else callback(null);
    return () => clearInterval(interval);
  },

  async getUserProfile(uid: string): Promise<UserProfile | null> {
      const data = localStorage.getItem(`PM_USER_${uid}`);
      return data ? JSON.parse(data) : null;
  },

  // --- Generic Wrappers ---
  subscribeChicks(callback: (val: Chick[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.chicks));
  },
  async saveChick(item: Chick) { if (this.uid) localDb.saveItem(this.uid, 'chicks', item); },
  async deleteChick(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'chicks', id); },

  subscribeSales(callback: (val: SalesRecord[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.sales));
  },
  async saveSale(item: SalesRecord) { if (this.uid) localDb.saveItem(this.uid, 'sales', item); },
  async deleteSale(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'sales', id); },

  subscribeExpenses(callback: (val: Expense[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.expenses));
  },
  async saveExpense(item: Expense) { if (this.uid) localDb.saveItem(this.uid, 'expenses', item); },
  async deleteExpense(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'expenses', id); },

  subscribeInventory(callback: (val: InventoryItem[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.inventory));
  },
  async saveInventoryItem(item: InventoryItem) { if (this.uid) localDb.saveItem(this.uid, 'inventory', item); },
  async deleteInventoryItem(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'inventory', id); },

  subscribeHealthRecords(callback: (val: HealthRecord[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.healthRecords));
  },
  async saveHealthRecord(item: HealthRecord) { if (this.uid) localDb.saveItem(this.uid, 'healthRecords', item); },
  async deleteHealthRecord(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'healthRecords', id); },

  subscribeInvoices(callback: (val: Invoice[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.invoices));
  },
  async saveInvoice(item: Invoice) { if (this.uid) localDb.saveItem(this.uid, 'invoices', item); },
  async deleteInvoice(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'invoices', id); },

  subscribePayments(callback: (val: Payment[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.payments));
  },
  async savePayment(item: Payment) { if (this.uid) localDb.saveItem(this.uid, 'payments', item); },
  async deletePayment(id: string) { if (this.uid) localDb.deleteItem(this.uid, 'payments', id); },

  subscribeTrash(callback: (val: TrashItem[]) => void) {
    if (!this.uid) return () => {};
    return localDb.subscribe(this.uid, (db: any) => callback(db.trash));
  },

  async moveToTrash(item: any, type: TrashItem['type'], description: string) {
    if (!this.uid) return;
    const trashId = `TRASH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const trashItem: TrashItem = {
      id: trashId,
      originalId: item.id,
      type,
      data: item,
      deletedDate: new Date().toISOString(),
      description
    };
    localDb.saveItem(this.uid, 'trash', trashItem);
  },

  async deleteFromTrash(trashId: string) {
    if (this.uid) localDb.deleteItem(this.uid, 'trash', trashId);
  },

  async restoreFromTrash(trashId: string) {
    if (!this.uid) return;
    const dataObj = localStorage.getItem(`PM_data_${this.uid}`);
    if(!dataObj) return;
    const db = JSON.parse(dataObj);
    const trashItem = db.trash.find((t: any) => t.id === trashId) as TrashItem;
    if (!trashItem) return;

    const { type, data } = trashItem;
    if (type === 'Batch') await this.saveChick(data);
    else if (type === 'Sale') await this.saveSale(data);
    else if (type === 'Expense') await this.saveExpense(data);
    else if (type === 'Inventory') await this.saveInventoryItem(data);
    else if (type === 'Health') await this.saveHealthRecord(data);

    await this.deleteFromTrash(trashId);
  },

  async exportDatabase() {
    if (!this.uid) return;
    try {
      const dataObj = localStorage.getItem(`PM_data_${this.uid}`) || "{}";
      const userObj = localStorage.getItem(`PM_USER_${this.uid}`) || "{}";
      const db = JSON.parse(dataObj);
      
      const backup: any = { 
        exportDate: new Date().toISOString(), 
        userId: this.uid,
        userProfile: JSON.parse(userObj),
        ...db
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PoultryMitra_Local_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Backup Error:", error);
      alert("Failed to export database. Please try again.");
    }
  },

  async importDatabase(backupData: any) {
    if (!this.uid) return;
    if (backupData.userId && backupData.userId !== this.uid) {
      if (!confirm("This backup belongs to a different user account. Do you still want to import it?")) {
        return;
      }
    }
    try {
      const dbStr = localStorage.getItem(`PM_data_${this.uid}`);
      const currentDb = dbStr ? JSON.parse(dbStr) : {};
      
      const collections = ['chicks', 'sales', 'expenses', 'inventory', 'healthRecords', 'invoices', 'payments', 'trash'];
      
      for (const colName of collections) {
         if(!currentDb[colName]) currentDb[colName] = [];
         
         const data = backupData[colName] || [];
         for (const item of data) {
             const existingIdx = currentDb[colName].findIndex((x: any) => x.id === item.id);
             if (existingIdx > -1) {
                 currentDb[colName][existingIdx] = item;
             } else {
                 currentDb[colName].push(item);
             }
         }
      }
      
      localStorage.setItem(`PM_data_${this.uid}`, JSON.stringify(currentDb));
      localDb.notify(this.uid);
      window.location.reload(); 
    } catch (error) {
      console.error("Restore Error:", error);
      alert("Failed to restore database. Please check the file format.");
    }
  }
};
