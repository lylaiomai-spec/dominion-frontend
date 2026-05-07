import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { GlobalSettingsService } from '../services/global-settings.service';
import { ErrorBannerComponent } from '../components/error-banner/error-banner.component';

interface ShortCharacter {
  id: number;
  name: string;
}

interface AbsentUserItem {
  user_id: number;
  username: string;
  absence_start_date: string;
  absence_end_date: string;
  characters: ShortCharacter[];
}

@Component({
  selector: 'app-absence-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ErrorBannerComponent],
  templateUrl: './absence-list.component.html',
})
export class AbsenceListComponent implements OnInit {
  private apiService = inject(ApiService);
  private globalSettings = inject(GlobalSettingsService);
  authService = inject(AuthService);

  users = signal<AbsentUserItem[]>([]);
  showModal = signal(false);
  serverError = signal<string | null>(null);

  startDate = '';
  endDate = '';
  today = new Date().toISOString().slice(0, 10);

  maxDays = computed(() => {
    const v = this.globalSettings.getSetting('absence_max_days');
    return v ? parseInt(v, 10) : null;
  });

  durationError = computed(() => {
    const max = this.maxDays();
    if (!max || !this.startDate || !this.endDate) return null;
    const diff = (new Date(this.endDate).getTime() - new Date(this.startDate).getTime()) / 86400000;
    return diff > max ? max : null;
  });

  ngOnInit() {
    this.loadList();
    this.globalSettings.loadSettings();
  }

  openModal() {
    this.startDate = this.today;
    this.endDate = '';
    this.serverError.set(null);
    this.showModal.set(true);
  }

  submit() {
    if (this.durationError() !== null) return;
    this.serverError.set(null);
    this.apiService.post('user/absence', {
      start_date: this.startDate,
      end_date: this.endDate,
    }).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadList();
      },
      error: (err) => {
        if (err.status === 400) {
          this.serverError.set(err.error?.message ?? err.error ?? 'Bad request');
        }
      },
    });
  }

  private loadList() {
    this.apiService.get<AbsentUserItem[]>('absence').subscribe(data => this.users.set(data));
  }
}
