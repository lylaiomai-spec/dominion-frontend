import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { BoardService } from '../services/board.service';
import { ErrorBannerComponent } from '../components/error-banner/error-banner.component';

interface ArchivingWarningItem {
  id: number;
  name: string;
  user_id: number;
  username: string;
  date_last_post: string | null;
  days_left: number;
}

@Component({
  selector: 'app-auto-archive',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ErrorBannerComponent],
  templateUrl: './auto-archive.component.html',
})
export class AutoArchiveComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private boardService = inject(BoardService);
  private router = inject(Router);

  characters = signal<ArchivingWarningItem[]>([]);

  archivingEnabled = computed(() => this.boardService.board().auto_archiving_enabled === 'y');
  archivingDays = computed(() => this.boardService.board().auto_archiving_days || '?');

  canAddImmunity = computed(() => this.authService.hasPermission('show_add_immunity_button'));

  immunityModalCharacter = signal<ArchivingWarningItem | null>(null);
  immunityStartDate = '';
  immunityEndDate = '';
  immunityReason = '';
  immunityError = signal<string | null>(null);
  today = new Date().toISOString().slice(0, 10);

  ngOnInit() {
    this.loadList();
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
}
