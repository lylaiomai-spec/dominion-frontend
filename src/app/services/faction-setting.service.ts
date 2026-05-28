import { Injectable, signal, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FactionSetting } from '../models/FactionSetting';

@Injectable({ providedIn: 'root' })
export class FactionSettingService {
  private apiService = inject(ApiService);

  factionSettings = signal<FactionSetting[]>([]);

  load(): void {
    this.apiService.get<FactionSetting[]>('admin/faction-settings/list').subscribe({
      next: (data) => this.factionSettings.set(data),
      error: (err) => console.error('Failed to load faction settings', err)
    });
  }

  create(setting: Partial<FactionSetting>): Observable<FactionSetting> {
    return this.apiService.post<FactionSetting>('admin/faction-setting/create', setting);
  }

  update(id: number, setting: Partial<FactionSetting>): Observable<FactionSetting> {
    return this.apiService.post<FactionSetting>(`admin/faction-setting/update/${id}`, setting);
  }

  delete(id: number): Observable<void> {
    return this.apiService.post<void>(`admin/faction-setting/delete/${id}`, {});
  }
}
