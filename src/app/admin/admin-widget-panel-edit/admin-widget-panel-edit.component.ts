import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BbToolbarComponent } from '../../components/bb-toolbar/bb-toolbar.component';

type SaveState = 'idle' | 'loading' | 'success' | 'error';

interface PanelDetail {
  key: string;
  content: string | null;
  is_hidden: boolean;
}

@Component({
  selector: 'app-admin-widget-panel-edit',
  imports: [FormsModule, BbToolbarComponent],
  templateUrl: './admin-widget-panel-edit.component.html',
  standalone: true,
  styleUrl: './admin-widget-panel-edit.component.css'
})
export class AdminWidgetPanelEditComponent implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);

  panel = signal<PanelDetail | null>(null);
  saveState = signal<SaveState>('idle');

  ngOnInit() {
    const key = this.route.snapshot.paramMap.get('key')!;
    this.apiService.get<PanelDetail>(`panel/${key}`).subscribe({
      next: p => this.panel.set({ ...p, content: p.content ?? '' }),
      error: () => {}
    });
  }

  save(contentEl: HTMLTextAreaElement) {
    const panel = this.panel();
    if (!panel) return;

    this.saveState.set('loading');
    this.apiService.post(`panel/${panel.key}/update`, {
      content: contentEl.value,
      is_hidden: panel.is_hidden
    }).subscribe({
      next: () => {
        this.saveState.set('success');
        setTimeout(() => this.saveState.set('idle'), 3000);
      },
      error: () => {
        this.saveState.set('error');
        setTimeout(() => this.saveState.set('idle'), 3000);
      }
    });
  }
}
