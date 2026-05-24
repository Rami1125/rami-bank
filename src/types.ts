/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  startingBalance: number;
  currency: string;
}

export interface Vendor {
  id?: string;
  userId: string;
  name: string;
  category: string;
  expectedMonthlyCost: number;
}

export interface Transaction {
  id?: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string; // ISO String (e.g. YYYY-MM-DD)
  vendorId?: string;
  vendorName: string;
  category: string;
  freeText: string;
}

export interface Budget {
  id?: string;
  userId: string;
  month: number; // 1-12
  year: number;
  category: string;
  allocatedAmount: number;
  currentAmount: number;
}

export interface RecoveryPlan {
  id?: string;
  userId: string;
  targetGoals: string;
  timeline: string;
  status: 'active' | 'completed' | 'paused';
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  parsedTransaction?: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    vendorName: string;
    approved?: boolean;
  };
  adviceType?: 'warning' | 'tip' | 'praise' | 'info';
  vaultRecords?: any[];
}

export interface StandingOrder {
  id: string;
  userId: string;
  vendorName: string;
  category: string;
  amount: number;
  frequency: 'weekly' | 'bimonthly' | 'monthly' | 'yearly';
  startDate: string;
  nextPaymentDate: string;
  status: 'active' | 'paused';
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'failed';
  }[];
}

export interface Loan {
  id: string;
  userId: string;
  source: 'bank' | 'private';
  lenderName: string;
  originalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  interestRate: number;
  startDate: string;
}

