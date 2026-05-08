import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { HttpParams } from '@angular/common/http';
import { CurrencySettings, CurrencySettingsUpdateRequest, CurrencyIncomeType, CurrencySpendType, CurrencyTransactionsResponse, AddTransactionRequest, CurrencyTransaction } from '../models/Currency';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private apiService = inject(ApiService);

  private settingsSignal = signal<CurrencySettings>({ currency_name: '', icon_url: '' });
  readonly settings = this.settingsSignal.asReadonly();

  private incomeTypesSignal = signal<CurrencyIncomeType[]>([]);
  readonly incomeTypes = this.incomeTypesSignal.asReadonly();

  loadSettings(): void {
    this.apiService.get<CurrencySettings>('currency/settings').subscribe({
      next: (data) => this.settingsSignal.set(data),
      error: (err) => console.error('Failed to load currency settings', err)
    });
  }

  loadIncomeTypes(): void {
    this.apiService.get<CurrencyIncomeType[]>('currency/income-types').subscribe({
      next: (data) => this.incomeTypesSignal.set(data),
      error: (err) => console.error('Failed to load income types', err)
    });
  }

  updateSettings(req: CurrencySettingsUpdateRequest) {
    return this.apiService.post<CurrencySettings>('currency/settings/update', req);
  }

  patchIncomeType(key: string, patch: Partial<CurrencyIncomeType>): void {
    this.incomeTypesSignal.update(list =>
      list.map(t => t.key === key ? { ...t, ...patch } : t)
    );
  }

  loadTransactions(userId: number, page: number) {
    const params = new HttpParams().set('page', page);
    return this.apiService.get<CurrencyTransactionsResponse>(`currency/user/${userId}/transactions`, params);
  }

  addTransaction(userId: number, req: AddTransactionRequest) {
    return this.apiService.post<CurrencyTransaction>(`currency/user/${userId}/transactions/add`, req);
  }

  updateIncomeTypes(types: CurrencyIncomeType[]) {
    const payload = types.map(t => ({ key: t.key, amount: t.amount, is_active: t.is_active }));
    return this.apiService.post<CurrencyIncomeType[]>('currency/income-types/update', payload);
  }

  loadActiveIncomeTypes() {
    return this.apiService.get<CurrencyIncomeType[]>('currency/active-income-types');
  }

  loadSpendTypes() {
    return this.apiService.get<CurrencySpendType[]>('currency/spend-types');
  }

  loadActiveSpendTypes() {
    return this.apiService.get<CurrencySpendType[]>('currency/active-spend-types');
  }

  updateSpendType(types: CurrencySpendType[]) {
    return this.apiService.post<CurrencySpendType[]>('currency/spend-types/update', types);
  }
}
