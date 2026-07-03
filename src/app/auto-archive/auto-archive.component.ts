import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { BoardService } from '../services/board.service';
import { CurrencyService } from '../services/currency.service';
import { CurrencySpendType } from '../models/Currency';
import { ErrorBannerComponent } from '../components/error-banner/error-banner.component';

interface ArchivingWarningItem {
  id: number;
  name: string;
  user_id: number;
  username: string;
  date_last_post: string | null;
  days_left: number;
}

interface BuyImmunityResponse {
  start_date: string;
  end_date: string;
  cost: number;
  new_balance: number;
}

@Component({
  selector: 'app-auto-archive',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ErrorBannerComponent],
  templateUrl: './auto-archive.component.html',
})
export class AutoArchiveComponent implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private boardService = inject(BoardService);
  private currencyService = inject(CurrencyService);
  private router = inject(Router);

  characters = signal<ArchivingWarningItem[]>([]);

  archivingEnabled = computed(() => this.boardService.board().auto_archiving_enabled === 'y');
  archivingDays = computed(() => this.boardService.board().auto_archiving_days || '?');

  canAddImmunity = computed(() => this.authService.hasPermission('show_add_immunity_button'));

  // Admin immunity modal
  immunityModalCharacter = signal<ArchivingWarningItem | null>(null);
  immunityStartDate = '';
  immunityEndDate = '';
  immunityReason = '';
  immunityError = signal<string | null>(null);

  // Buy immunity (user)
  immunitySpendType = signal<CurrencySpendType | null>(null);
  buyImmunityModalCharacter = signal<ArchivingWarningItem | null>(null);
  buyImmunityStartDate = '';
  buyImmunityEndDate = '';
  buyImmunityError = signal<string | null>(null);

  today = new Date().toISOString().slice(0, 10);

  showActionsColumn = computed(() => this.canAddImmunity() || !!this.immunitySpendType());
  currencyName = computed(() => this.currencyService.settings().currency_name);

  get buyImmunityDays(): number {
    if (!this.buyImmunityStartDate || !this.buyImmunityEndDate) return 0;
    const diff = (new Date(this.buyImmunityEndDate).getTime() - new Date(this.buyImmunityStartDate).getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  }

  get buyImmunityTotalCost(): number {
    return this.buyImmunityDays * (this.immunitySpendType()?.amount ?? 0);
  }

  get buyImmunityCanAfford(): boolean {
    return (this.authService.currentUser()?.currency_amount ?? 0) >= this.buyImmunityTotalCost;
  }

  ngOnInit() {
    this.loadList();
    this.currencyService.loadSettings();
    this.currencyService.loadActiveSpendTypes().subscribe({
      next: (types) => {
        const found = types.find(t => t.key === 'currency_spend_auto_archiving_immunity') ?? null;
        this.immunitySpendType.set(found);
      },
      error: () => {}
    });
  }

  private loadList() {
    this.apiService.get<ArchivingWarningItem[]>('characters/archiving-warnings').subscribe({
      next: (data) => this.characters.set(data),
      error: (err) => {
        if (err.status === 403) {
          this.router.navigateByUrl('/403');
        } else {
          console.error('Failed to load archiving warnings', err);
        }
      },
    });
  }

  // Admin immunity
  openImmunityModal(character: ArchivingWarningItem) {
    this.immunityModalCharacter.set(character);
    this.immunityStartDate = this.today;
    this.immunityEndDate = '';
    this.immunityReason = '';
    this.immunityError.set(null);
  }

  closeImmunityModal() {
    this.immunityModalCharacter.set(null);
  }

  submitImmunity() {
    const character = this.immunityModalCharacter();
    if (!character) return;
    this.immunityError.set(null);
    this.apiService.post('admin/character/immunity', {
      character_id: character.id,
      start_date: this.immunityStartDate,
      end_date: this.immunityEndDate,
      reason: this.immunityReason,
    }).subscribe({
      next: () => {
        this.closeImmunityModal();
        this.loadList();
      },
      error: (err) => {
        if (err.status === 400) {
          this.immunityError.set(err.error?.message ?? err.error ?? 'Bad request');
        }
      },
    });
  }

  // Buy immunity (user)
  openBuyImmunityModal(character: ArchivingWarningItem) {
    this.buyImmunityModalCharacter.set(character);
    this.buyImmunityStartDate = this.today;
    this.buyImmunityEndDate = '';
    this.buyImmunityError.set(null);
  }

  closeBuyImmunityModal() {
    this.buyImmunityModalCharacter.set(null);
  }

  submitBuyImmunity() {
    const character = this.buyImmunityModalCharacter();
    if (!character || this.buyImmunityDays <= 0 || !this.buyImmunityCanAfford) return;
    this.buyImmunityError.set(null);
    this.apiService.post<BuyImmunityResponse>('character/immunity/buy', {
      character_id: character.id,
      start_date: this.buyImmunityStartDate,
      duration_days: this.buyImmunityDays,
    }).subscribe({
      next: (res) => {
        this.authService.currentUser.update(u => u ? { ...u, currency_amount: res.new_balance } : u);
        this.closeBuyImmunityModal();
        this.loadList();
      },
      error: (err) => {
        this.buyImmunityError.set(err.error?.message ?? err.error ?? 'Bad request');
      },
    });
  }
}
