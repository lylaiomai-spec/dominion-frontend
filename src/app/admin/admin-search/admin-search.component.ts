import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

export interface SonicCursorItem {
  bucket: string;
  last_id: number | null;
  date_ingested: string | null;
  current_max_id: number;
}

@Component({
  selector: 'app-admin-search',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-search.component.html',
})
export class AdminSearchComponent implements OnInit {
  private apiService = inject(ApiService);

  cursors = signal<SonicCursorItem[]>([]);
  syncing = signal<Set<string>>(new Set());

  ngOnInit() {
    this.apiService.get<SonicCursorItem[]>('admin/sonic/cursors').subscribe({
      next: (data) => this.cursors.set(data),
      error: (err) => console.error('Failed to load sonic cursors', err)
    });
  }

  isOutOfSync(item: SonicCursorItem): boolean {
    return item.last_id !== item.current_max_id;
  }

  sync(item: SonicCursorItem) {
    this.syncing.update(s => new Set(s).add(item.bucket));
    this.apiService.post(`admin/sonic/catchup/${item.bucket}`, {}).subscribe({
      next: () => {
        this.cursors.update(list =>
          list.map(c => c.bucket === item.bucket ? { ...c, last_id: c.current_max_id } : c)
        );
        this.syncing.update(s => { const next = new Set(s); next.delete(item.bucket); return next; });
      },
      error: (err) => {
        console.error('Failed to sync bucket', item.bucket, err);
        this.syncing.update(s => { const next = new Set(s); next.delete(item.bucket); return next; });
      }
    });
  }

  isSyncing(bucket: string): boolean {
    return this.syncing().has(bucket);
  }
}
