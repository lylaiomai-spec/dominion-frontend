import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AdditionalNavlink } from '../models/AdditionalNavlink';

@Injectable({ providedIn: 'root' })
export class AdditionalNavlinkService {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  navlinks = signal<AdditionalNavlink[]>([]);

  constructor() {
    effect(() => {
      this.authService.isAuthenticated(); // track login/logout
      this.load();
    });
  }

  load() {
    this.apiService.get<AdditionalNavlink[]>('additional-navlink/list').subscribe({
      next: (data) => this.navlinks.set(data),
      error: (err) => console.error('Failed to load additional navlinks', err)
    });
  }
}
