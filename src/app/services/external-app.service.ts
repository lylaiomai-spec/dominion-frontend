import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ExternalApp } from '../models/ExternalApp';

@Injectable({ providedIn: 'root' })
export class ExternalAppService {
  private apiService = inject(ApiService);

  list(): Observable<ExternalApp[]> {
    return this.apiService.get<ExternalApp[]>('admin/external-app/list');
  }

  create(name: string): Observable<ExternalApp> {
    return this.apiService.post<ExternalApp>('admin/external-app/create', { name });
  }

  update(id: number, payload: { name?: string; status?: boolean; user_id?: number | null }): Observable<ExternalApp> {
    return this.apiService.post<ExternalApp>(`admin/external-app/update/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.apiService.get<void>(`admin/external-app/delete/${id}`);
  }

  getPermissions(id: number): Observable<string[]> {
    return this.apiService.get<string[]>(`admin/external-app/${id}/permissions`);
  }

  addPermission(id: number, permission: string): Observable<void> {
    return this.apiService.post<void>(`admin/external-app/${id}/permission/create`, { permission });
  }

  removePermission(id: number, permission: string): Observable<void> {
    return this.apiService.post<void>(`admin/external-app/${id}/permission/delete`, { permission });
  }
}
