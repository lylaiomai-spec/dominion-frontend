import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Feature, FeatureToggleResponse } from '../models/Feature';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private apiService = inject(ApiService);

  private featuresSignal = signal<Feature[]>([]);
  readonly features = this.featuresSignal.asReadonly();

  isFeatureActive(key: string): boolean {
    return this.featuresSignal().some(f => f.key === key && f.is_active);
  }

  loadFeatures(): void {
    this.apiService.get<Feature[]>('features').subscribe({
      next: (data) => this.featuresSignal.set(data),
      error: (err) => console.error('Failed to load features', err)
    });
  }

  toggle(key: string): void {
    const feature = this.featuresSignal().find(f => f.key === key);
    if (!feature) return;
    this.apiService.post<FeatureToggleResponse>(`features/${key}/toggle`, { is_active: !feature.is_active }).subscribe({
      next: (updated) => this.featuresSignal.update(list =>
        list.map(f => f.key === updated.key ? { ...f, is_active: updated.is_active } : f)
      ),
      error: (err) => console.error('Failed to toggle feature', err)
    });
  }
}
