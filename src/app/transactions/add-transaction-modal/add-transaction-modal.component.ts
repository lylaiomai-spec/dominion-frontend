import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CurrencyService } from '../../services/currency.service';
import { AddTransactionRequest, CurrencyIncomeType, CurrencySpendType } from '../../models/Currency';

export const CUSTOM_KEY = '__custom__';
const KEYS_WITH_POST_LINK = new Set(['currency_income_game_post']);

@Component({
  selector: 'app-add-transaction-modal',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './add-transaction-modal.component.html',
})
export class AddTransactionModalComponent implements OnInit {
  @Input() userId!: number;
  @Input() incomeTypes: CurrencyIncomeType[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  private currencyService = inject(CurrencyService);
  private destroyRef = inject(DestroyRef);

  readonly spendTypes = signal<CurrencySpendType[]>([]);

  readonly customKey = CUSTOM_KEY;

  amount: number | null = null;
  type: 'income' | 'spend' = 'income';
  incomeTypeKey: string = '';
  note = '';
  topicId: number | null = null;
  postId: number | null = null;
  saving = false;
  error = '';

  ngOnInit() {
    this.currencyService.loadSpendTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.spendTypes.set(types),
        error: (err) => console.error('Failed to load spend types', err),
      });
  }

  get isSpend(): boolean {
    return this.type === 'spend';
  }

  get typeOptions(): (CurrencyIncomeType | CurrencySpendType)[] {
    return this.isSpend ? this.spendTypes() : this.incomeTypes;
  }

  // A key chosen for one direction is not valid for the other, so switching resets it.
  onTypeChange(type: 'income' | 'spend') {
    this.type = type;
    this.incomeTypeKey = '';
  }

  get isCustom(): boolean {
    return this.incomeTypeKey === CUSTOM_KEY;
  }

  get hasPostLink(): boolean {
    return KEYS_WITH_POST_LINK.has(this.incomeTypeKey);
  }

  onSubmit() {
    if (!this.amount) return;

    const req: AddTransactionRequest = {
      amount: this.amount,
      type: this.type,
      income_type_key: this.isCustom ? null : (this.incomeTypeKey || null),
      metadata: this.isCustom
        ? { note: this.note || null }
        : this.hasPostLink && (this.topicId || this.postId)
          ? { topic_id: this.topicId ?? undefined, post_id: this.postId ?? undefined }
          : null,
    };

    this.saving = true;
    this.error = '';
    this.currencyService.addTransaction(this.userId, req).subscribe({
      next: () => {
        this.saving = false;
        this.created.emit();
        this.close.emit();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message ?? $localize`:@@addTransaction.error:Failed to add transaction.`;
      },
    });
  }

  onCancel() {
    this.close.emit();
  }
}
