import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { SaveButtonComponent } from '../save-button/save-button.component';

export interface FrontendComponent {
  name: string;
  template_path: string;
  default_template_path: string;
  description: string;
  active: boolean;
}

type SaveState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-frontend-templates',
  standalone: true,
  imports: [CommonModule, RouterLink, SaveButtonComponent],
  templateUrl: './admin-frontend-templates.component.html',
  styleUrl: './admin-frontend-templates.component.css',
})
export class AdminFrontendTemplatesComponent implements OnInit {
  private apiService = inject(ApiService);

  components = signal<FrontendComponent[]>([]);
  saveState = signal<SaveState>('idle');

  ngOnInit() {
    this.apiService.get<FrontendComponent[]>('admin/frontend-templates/components').subscribe({
      next: (data) => this.components.set(data),
      error: (err) => console.error('Failed to load frontend components', err),
    });
  }

  toggle(comp: FrontendComponent) {
    this.components.update((list) =>
      list.map((c) => (c.name === comp.name ? { ...c, active: !c.active } : c))
    );
  }

  save() {
    this.saveState.set('loading');
    const activeComponents = this.components()
      .filter((c) => c.active)
      .map((c) => c.name);

    this.apiService
      .post('admin/frontend-templates/env/update', { active_components: activeComponents })
      .subscribe({
        next: () => this.flash('success'),
        error: (err) => {
          console.error('Failed to update frontend templates', err);
          this.flash('error');
        },
      });
  }

  private flash(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
