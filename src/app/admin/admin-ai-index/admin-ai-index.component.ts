import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';

export interface QdrantCursorItem {
  bucket: string;
  last_id: number | null;
  date_ingested: string | null;
  current_max_id: number;
}

@Component({
  selector: 'app-admin-ai-index',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './admin-ai-index.component.html',
})
export class AdminAiIndexComponent implements OnInit {
  private apiService = inject(ApiService);

  cursors = signal<QdrantCursorItem[]>([]);
  catchingUp = signal<Set<string>>(new Set());

  ngOnInit() {
    this.apiService.get<QdrantCursorItem[]>('admin/qdrant/cursors').subscribe({
      next: (data) => this.cursors.set(data),
      error: (err) => console.error('Failed to load qdrant cursors', err)
    });
  }

  isOutOfSync(item: QdrantCursorItem): boolean {
    return item.last_id !== item.current_max_id;
  }

  catchUp(item: QdrantCursorItem) {
    this.catchingUp.update(s => new Set(s).add(item.bucket));
    this.apiService.post(`admin/qdrant/catchup/${item.bucket}`, {}).subscribe({
      next: () => {
        this.cursors.update(list =>
          list.map(c => c.bucket === item.bucket ? { ...c, last_id: c.current_max_id } : c)
        );
        this.catchingUp.update(s => { const next = new Set(s); next.delete(item.bucket); return next; });
      },
      error: (err) => {
        console.error('Failed to catch up bucket', item.bucket, err);
        this.catchingUp.update(s => { const next = new Set(s); next.delete(item.bucket); return next; });
      }
    });
  }

  isCatchingUp(bucket: string): boolean {
    return this.catchingUp().has(bucket);
  }
}
