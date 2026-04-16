import { Breed, VaccineScheduleItem } from './types';

export const BREEDS_LIST = [
  Breed.GAVRAN,
  Breed.KADAKNATH,
  Breed.BLACK_AUSTRALORP,
  Breed.RIR,
  Breed.SONALI,
  Breed.KAVERI,
  Breed.PARROT_BEAK,
  Breed.ASEEL,
  Breed.CROSS_ASEEL,
  Breed.VANARAJA,
  Breed.GIRIRAJA,
  Breed.DUCK,
  Breed.TURKEY,
  Breed.GUINEA_FOWL,
  Breed.BRAHMA,
  Breed.CUSTOM
];

export const VACCINE_SCHEDULE: VaccineScheduleItem[] = [
  { ageDays: 1, name: "Marek's Disease", dose: "0.2ml", method: "Injection (SC)", description: "Prevention of paralysis." },
  { ageDays: 7, name: "Ranikhet (RD F1/Lasota)", dose: "1 drop", method: "Eye/Nostril Drop", description: "Newcastle disease prevention." },
  { ageDays: 14, name: "Gumboro (IBD)", dose: "1 drop", method: "Oral/Drinking Water", description: "Infectious Bursal Disease." },
  { ageDays: 21, name: "Ranikhet (Lasota Booster)", dose: "As per label", method: "Drinking Water", description: "Booster dose." },
  { ageDays: 28, name: "Gumboro (Booster)", dose: "As per label", method: "Drinking Water", description: "Booster dose." },
  { ageDays: 60, name: "R2B (Mesogenic)", dose: "0.5ml", method: "Injection (IM)", description: "Long term protection (Every 6 months)." },
  { ageDays: 70, name: "Fowl Pox", dose: "Prick", method: "Wing Web Prick", description: "Prevention of pox." },
];

export const DAILY_CHECKLIST_TEMPLATE = [
  { id: 1, task: "Morning Water Change (Fresh Water)", completed: false },
  { id: 2, task: "Feeder Cleaning & Refilling", completed: false },
  { id: 3, task: "Mortality Check (Remove dead birds)", completed: false },
  { id: 4, task: "Temperature Check (Brooder/Shed)", completed: false },
  { id: 5, task: "Observe Bird Activity (Dull birds isolation)", completed: false },
  { id: 6, task: "Evening Light Check", completed: false },
  { id: 7, task: "Update Daily Records", completed: false },
];

export const BREED_GROWTH_DATA = [
  { name: 'Gavran', day7: 45, day15: 85, day30: 180, price: 450, demand: 95 },
  { name: 'Kadaknath', day7: 40, day15: 75, day30: 160, price: 800, demand: 85 },
  { name: 'Australorp', day7: 55, day15: 110, day30: 280, price: 350, demand: 75 },
  { name: 'RIR', day7: 50, day15: 105, day30: 260, price: 350, demand: 75 },
  { name: 'Sonali', day7: 50, day15: 100, day30: 250, price: 280, demand: 80 },
  { name: 'Kaveri', day7: 65, day15: 140, day30: 350, price: 220, demand: 80 },
  { name: 'Vanaraja', day7: 65, day15: 140, day30: 350, price: 220, demand: 80 },
  { name: 'Aseel', day7: 50, day15: 100, day30: 200, price: 600, demand: 90 },
  { name: 'Duck', day7: 100, day15: 300, day30: 900, price: 300, demand: 60 },
  { name: 'Turkey', day7: 80, day15: 200, day30: 500, price: 400, demand: 50 },
];