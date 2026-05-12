import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { DesignDraft, DesignDraftListItem, CreateDesignDraftRequest, UpdateDesignDraftRequest } from '../models/DesignDraft';

@Injectable({ providedIn: 'root' })
export class DesignDraftService {
  private apiService = inject(ApiService);

  list(): Observable<DesignDraftListItem[]> {
    return this.apiService.get<DesignDraftListItem[]>('admin/design-draft/list');
  }

  get(id: number): Observable<DesignDraft> {
    return this.apiService.get<DesignDraft>(`admin/design-draft/get/${id}`);
  }

  create(payload: CreateDesignDraftRequest): Observable<DesignDraft> {
    return this.apiService.post<DesignDraft>('admin/design-draft/create', payload);
  }

  update(id: number, payload: UpdateDesignDraftRequest): Observable<DesignDraft> {
    return this.apiService.post<DesignDraft>(`admin/design-draft/update/${id}`, payload);
  }

  publish(id: number): Observable<void> {
    return this.apiService.post<void>(`admin/design-draft/publish/${id}`, {});
  }
}
