import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FieldTemplate } from '../models/FieldTemplate';

@Injectable({ providedIn: 'root' })
export class WantedCharacterService {
  private apiService = inject(ApiService);

  private templateSignal = signal<FieldTemplate[]>([]);
  readonly template = this.templateSignal.asReadonly();

  loadTemplate(): void {
    this.apiService.get<FieldTemplate[]>('template/wanted_character/get').subscribe({
      next: (data) => this.templateSignal.set(data.sort((a, b) => a.order - b.order)),
      error: (err) => console.error('Failed to load wanted character template', err)
    });
  }

  save(data: any): Observable<any> {
    return this.apiService.post('wanted-character/create', data);
  }
}
