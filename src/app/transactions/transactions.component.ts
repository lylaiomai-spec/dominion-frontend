import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
  host: { class: 'pun-page' },
  standalone: true,
  imports: [RouterLink, AddTransactionModalComponent],
  templateUrl: './transactions.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
    currency_income_100_general_posts: $localize`:@@transactions.incomeType.generalPosts100:100 general posts`,
    currency_income_500_general_posts: $localize`:@@transactions.incomeType.generalPosts500:500 general posts`,
    currency_income_1000_general_posts: $localize`:@@transactions.incomeType.generalPosts1000:1000 general posts`,
    currency_income_100_game_posts: $localize`:@@transactions.incomeType.gamePosts100:100 game posts`,
    currency_income_500_game_posts: $localize`:@@transactions.incomeType.gamePosts500:500 game posts`,
    currency_income_1000_game_posts: $localize`:@@transactions.incomeType.gamePosts1000:1000 game posts`,
    currency_income_manual_transaction: $localize`:@@transactions.incomeType.manual:Manual income`,
    currency_spend_manual_transaction: $localize`:@@transactions.spendType.manual:Manual spend`,
    currency_spend_auto_archiving_immunity: $localize`:@@transactions.spendType.autoArchivingImmunity:Auto-archiving immunity`,
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

  txLabel(tx: CurrencyTransaction): string {
    const name = tx.income_type_key ? (this.incomeTypeNames[tx.income_type_key] ?? tx.income_type_key) : this.manualLabel;
    const note = tx.metadata?.note;
    return note ? `${name} (${note})` : name;
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
