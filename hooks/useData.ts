import { useState, useEffect } from 'react';
import { dataService, authService } from '../services/db';
import { Chick, SalesRecord, Expense, InventoryItem, HealthRecord, TrashItem, Invoice, Payment, UserProfile } from '../types';
import { DAILY_CHECKLIST_TEMPLATE } from '../constants';

export const useData = () => {
  const [chicks, setChicks] = useState<Chick[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = authService.onAuthChange((user) => {
      setAuthUser(user);
      if (!user) {
        setUser(null);
        setIsLoading(false);
        setChicks([]);
        setSales([]);
        setExpenses([]);
        setInventory([]);
        setHealthRecords([]);
        setInvoices([]);
        setPayments([]);
        setTrash([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    setIsLoading(true);

    const unsubProfile = dataService.subscribeUserProfile(authUser.uid, (profile) => {
      setUser(profile);
      setIsLoading(false);
    });

    const unsubChicks = dataService.subscribeChicks(setChicks);
    const unsubSales = dataService.subscribeSales(setSales);
    const unsubExpenses = dataService.subscribeExpenses(setExpenses);
    const unsubInventory = dataService.subscribeInventory(setInventory);
    const unsubHealth = dataService.subscribeHealthRecords(setHealthRecords);
    const unsubInvoices = dataService.subscribeInvoices(setInvoices);
    const unsubPayments = dataService.subscribePayments(setPayments);
    const unsubTrash = dataService.subscribeTrash(setTrash);

    return () => {
      unsubProfile();
      unsubChicks();
      unsubSales();
      unsubExpenses();
      unsubInventory();
      unsubHealth();
      unsubInvoices();
      unsubPayments();
      unsubTrash();
    };
  }, [authUser]);

  return {
    chicks,
    sales,
    expenses,
    inventory,
    healthRecords,
    invoices,
    payments,
    trash,
    isLoading,
    user
  };
};
