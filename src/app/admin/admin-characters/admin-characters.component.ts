import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CharacterService } from '../../services/character.service';
import { ErrorBannerComponent } from '../../components/error-banner/error-banner.component';

interface ProtectionHistoryItem {
  type: 'immunity' | 'absence';
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface AdminCharacterListItem {
  id: number;
  name: string;
  character_status: number;
  user_id: number;
  username: string;
  date_last_post: string | null;
  date_created: string | null;
}

@Component({
  selector: 'app-admin-characters',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, ErrorBannerComponent],
  templateUrl: './admin-characters.component.html',
})
export class AdminCharactersComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private characterService = inject(CharacterService);

  characters = signal<AdminCharacterListItem[]>([]);
  total = signal(0);
  page = signal(1);
  perPage = signal(20);

  totalPages = computed(() => Math.ceil(this.total() / this.perPage()));

  filterUserId = '';
  filterStatus = '';

  canAddImmunity = computed(() => this.authService.hasPermission('show_add_immunity_button'));

  historyModalCharacter = signal<AdminCharacterListItem | null>(null);
  historyRecords = signal<ProtectionHistoryItem[]>([]);

  immunityModalCharacter = signal<AdminCharacterListItem | null>(null);
  immunityStartDate = '';
  immunityEndDate = '';
  immunityReason = '';
  immunityError = signal<string | null>(null);
  today = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.load();
  }

  load(page = 1) {
    this.page.set(page);
    let params = new HttpParams().set('page', String(page));
    if (this.filterUserId.trim()) params = params.set('user_id', this.filterUserId.trim());
    if (this.filterStatus !== '') params = params.set('character_status', this.filterStatus);

    this.apiService.get<{ data: AdminCharacterListItem[]; total: number; page: number; per_page: number }>('admin/character-list', params).subscribe({
      next: (res) => {
        this.characters.set(res.data);
        this.total.set(res.total);
        this.perPage.set(res.per_page);
      },
      error: (err) => console.error('Failed to load admin character list', err),
    });
  }

  resetFilters() {
    this.filterUserId = '';
    this.filterStatus = '';
    this.load(1);
  }

  statusLabel(status: number): string {
    switch (status) {
      case 0: return 'Active';
      case 1: return 'Inactive';
      case 2: return 'Pending';
      case 3: return 'Declined';
      default: return String(status);
    }
  }

  toggleStatus(character: AdminCharacterListItem) {
    const action = character.character_status === 0
      ? this.characterService.deactivateCharacter(character.id)
      : this.characterService.activateCharacter(character.id);

    action.subscribe({
      next: (res) => {
        this.characters.update(list =>
          list.map(c => c.id === character.id ? { ...c, character_status: res.character_status } : c)
        );
      },
      error: (err) => console.error('Failed to update character status', err),
    });
  }

  openHistoryModal(character: AdminCharacterListItem) {
    this.historyModalCharacter.set(character);
    this.historyRecords.set([]);
    this.apiService.get<ProtectionHistoryItem[]>(`admin/character/${character.id}/protection-history`).subscribe({
      next: (data) => this.historyRecords.set(data),
      error: (err) => console.error('Failed to load protection history', err),
    });
  }

  closeHistoryModal() {
    this.historyModalCharacter.set(null);
  }

  openImmunityModal(character: AdminCharacterListItem) {
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
      next: () => this.closeImmunityModal(),
      error: (err) => {
        if (err.status === 400) {
          this.immunityError.set(err.error?.message ?? err.error ?? 'Bad request');
        }
      },
    });
  }
}
