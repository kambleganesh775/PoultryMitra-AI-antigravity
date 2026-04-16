export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  farmName: string;
  mobile?: string;
  createdAt: string;
}

export enum Breed {
  GAVRAN = 'Gavran (Pure Desi)',
  KADAKNATH = 'Kadaknath',
  BLACK_AUSTRALORP = 'Black Australorp',
  RIR = 'Rhode Island Red (RIR)',
  SONALI = 'Sonali',
  KAVERI = 'Kaveri',
  PARROT_BEAK = 'Parrot Beak',
  ASEEL = 'Aseel',
  CROSS_ASEEL = 'Cross Aseel (Dogla)',
  VANARAJA = 'Vanaraja',
  GIRIRAJA = 'Giriraja',
  DUCK = 'Duck (Khaki/Pekin)',
  TURKEY = 'Turkey',
  GUINEA_FOWL = 'Guinea Fowl (Titari)',
  BRAHMA = 'Columbian Brahma',
  CUSTOM = 'Custom Breed'
}

export interface TrashItem {
  id: string; // Unique ID for the trash entry
  originalId: string; // ID of the object before deletion
  type: 'Batch' | 'Sale' | 'Expense' | 'Inventory' | 'Health';
  data: any; // The full deleted object
  deletedDate: string;
  description: string;
}

export interface Chick {
  id: string;
  batchName?: string; // Optional custom name for the batch
  breed: Breed;
  hatchDate: string;
  source: 'Natural' | 'Incubator' | 'Purchased';
  initialCount: number;
  currentCount: number;
  mortalityCount: number;
  soldCount: number;
  purchaseCost: number; // Cost of buying the batch
  initialWeight: number; // in grams
  currentWeight: number; // in grams (Average)
  status: 'Active' | 'Completed';
  notes?: string;
  tags?: string[];
}

export interface Expense {
  id: string;
  flockId?: string; // Optional link to a specific batch
  category: 'Bird Purchase' | 'Feed' | 'Medicine' | 'Vaccine' | 'Deworming' | 'Vitamin' | 'Electricity' | 'Labour' | 'Transport' | 'Other';
  amount: number;
  date: string;
  description: string;
  type?: 'Cash' | 'Usage'; // Cash = actual money spent, Usage = inventory consumed
}

export interface SalesRecord {
  id: string;
  flockId: string;
  breed: string;
  date: string;
  buyerName: string;
  quantity: number;
  weightKg: number;
  saleType: 'kg' | 'count';
  rate: number;
  totalAmount: number;
  notes?: string;
}

export interface InventoryItem {
  id: string;
  type: 'Feed' | 'Medicine' | 'Vaccine' | 'Deworming' | 'Vitamin' | 'Other';
  name: string; // e.g., "Pre-Starter", "Lasota"
  quantity: number;
  unit: string; // kg, bags, ml, doses
  lowStockThreshold?: number;
  avgCost?: number;
  lastUpdated: string;
}

export interface VaccineScheduleItem {
  ageDays: number;
  name: string;
  dose: string;
  method: string;
  description: string;
}

export interface HealthRecord {
  id: string;
  flockId: string;
  type: 'Vaccine' | 'Medicine' | 'Deworming' | 'Vitamin' | 'Other';
  name: string;
  date: string;
  cost: number;
  notes?: string;
  isScheduled?: boolean; // True if it corresponds to the standard schedule
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subTotal: number;
  taxRate: number; // GST %
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'Pending' | 'Paid' | 'Overdue' | 'Partial';
  paymentMethod?: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  isRecurring: boolean;
  recurringInterval?: 'Weekly' | 'Monthly';
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  flockId?: string; // Optional link to a specific batch
  date: string;
  amount: number;
  method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  referenceId?: string; // Transaction ID
  notes?: string;
}