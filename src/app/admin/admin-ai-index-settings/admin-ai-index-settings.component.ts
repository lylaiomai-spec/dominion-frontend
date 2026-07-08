import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { SaveButtonComponent } from '../save-button/save-button.component';

export interface SubforumBucketRow {
  subforum_id: number;
  subforum_name: string;
  buckets: { [key: string]: boolean };
}

@Component({
  selector: 'app-admin-ai-index-settings',
  imports: [CommonModule, FormsModule, SaveButtonComponent],
  templateUrl: './admin-ai-index-settings.component.html',
  standalone: true,
  styleUrl: './admin-ai-index-settings.component.css'
})
export class AdminAiIndexSettingsComponent implements OnInit {
  private apiService = inject(ApiService);

  rows = signal<SubforumBucketRow[]>([]);

  bucketKeys = computed(() => {
    const data = this.rows();
    if (data.length === 0) return [];
    return Object.keys(data[0].buckets);
  });

  saveState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

  ngOnInit() {
    this.apiService.get<SubforumBucketRow[]>('admin/qdrant/subforum-matrix').subscribe({
      next: (data) => this.rows.set(data),
      error: (err) => console.error('Failed to load subforum matrix', err)
    });
  }

  saveMatrix() {
    const payload = this.rows().flatMap(row =>
      Object.entries(row.buckets)
        .filter(([, enabled]) => enabled)
        .map(([bucket]) => ({ subforum_id: row.subforum_id, bucket }))
    );

    this.saveState.set('loading');
    this.apiService.post('admin/qdrant/subforum-matrix/update', payload).subscribe({
      next: () => this.flashState('success'),
      error: (err) => {
        console.error('Failed to save subforum matrix', err);
        this.flashState('error');
      }
    });
  }

  private flashState(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
