import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyService } from '../services/currency.service';
import { CurrencyIncomeType, CurrencySpendType } from '../models/Currency';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [],
  templateUrl: './shop.component.html',
})
export class ShopComponent implements OnInit {
  private currencyService = inject(CurrencyService);

  incomeTypes = signal<CurrencyIncomeType[]>([]);
  spendTypes = signal<CurrencySpendType[]>([]);

  ngOnInit() {
    this.currencyService.loadActiveIncomeTypes().subscribe({
      next: (data) => this.incomeTypes.set(data),
      error: (err) => console.error('Failed to load active income types', err)
    });

    this.currencyService.loadActiveSpendTypes().subscribe({
      next: (data) => this.spendTypes.set(data),
      error: (err) => console.error('Failed to load active spend types', err)
    });
  }
}
