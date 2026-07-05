import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { CalendarOption, CalendarSetting, CalendarFreeFormatDate } from '../models/Calendar';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private apiService = inject(ApiService);

  getOptions(): Observable<CalendarOption[]> {
    return this.apiService.get<CalendarOption[]>('admin/free-format-date-settings/options');
  }

  getById(id: number): Observable<CalendarSetting> {
    return this.apiService.get<CalendarSetting>(`admin/free-format-date-settings/${id}`);
  }

  create(name: string, freeFormatDate: CalendarFreeFormatDate): Observable<{ id: number }> {
    return this.apiService.post<{ id: number }>('admin/free-format-date-settings', {
      name,
      free_format_date: freeFormatDate,
    });
  }

  update(id: number, name: string, freeFormatDate: CalendarFreeFormatDate): Observable<void> {
    return this.apiService.post<void>(`admin/free-format-date-settings/${id}`, {
      name,
      free_format_date: freeFormatDate,
    });
  }
}
