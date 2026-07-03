import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { CurrencyService } from '../services/currency.service';
import { CurrencyTransaction, CurrencyIncomeType } from '../models/Currency';
import { AuthService } from '../services/auth.service';
import { FeatureService } from '../services/feature.service';
import { AddTransactionModalComponent } from './add-transaction-modal/add-transaction-modal.component';

function coerceToPage(value: string | null): number {
  const num = Number(value);
  return num >= 1 ? Math.floor(num) : 1;
}

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [RouterLink, AddTransactionModalComponent],
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.css',
})
export class TransactionsComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected currencyService = inject(CurrencyService);
  private authService = inject(AuthService);
  protected featureService = inject(FeatureService);

  transactions: CurrencyTransaction[] = [];
  currentPage = 1;
  totalPages = 1;
  userId = 0;
  canAdd = false;
  showAddModal = false;

  readonly manualLabel = $localize`:@@transactions.manual:Manual`;

  readonly incomeTypeNames: Record<string, string> = {
    currency_income_game_post: $localize`:@@transactions.incomeType.gamePost:Game post`,
    currency_income_wanted_character: $localize`:@@transactions.incomeType.wantedCharacter:Wanted character`,
    currency_income_new_character: $localize`:@@transactions.incomeType.newCharacter:Character accepted`,
  };

  readonly statusLabels: Record<number, string> = {
    0: $localize`:@@transactions.status.pending:Pending`,
    1: $localize`:@@transactions.status.approved:Approved`,
    2: $localize`:@@transactions.status.rejected:Rejected`,
  };

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([paramMap, queryParamMap]) => {
        this.userId = Number(paramMap.get('user_id'));
        this.currentPage = coerceToPage(queryParamMap.get('page'));
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToPage(page: number): void {
    this.router.navigate([], { queryParams: { page }, replaceUrl: false });
  }

  openAddModal(): void {
    this.showAddModal = true;
  }

  onTransactionCreated(): void {
    this.load();
  }

  private load(): void {
    this.currencyService.loadTransactions(this.userId, this.currentPage).subscribe({
      next: (res) => {
        this.transactions = res.items;
        this.totalPages = res.total_pages;
        this.canAdd = res.can_add;
        if (res.can_add) {
          this.currencyService.loadIncomeTypes();
        }
      },
      error: (err) => console.error('Failed to load transactions', err)
    });
  }
}
