import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DesignDraftService } from '../../services/design-draft.service';
import { DesignDraft } from '../../models/DesignDraft';

type SaveState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-design-draft-edit',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-design-draft-edit.component.html',
})
export class AdminDesignDraftEditComponent implements OnInit {
  private draftService = inject(DesignDraftService);
  private route = inject(ActivatedRoute);

  draft = signal<DesignDraft | null>(null);
  saveState = signal<SaveState>('idle');

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.draftService.get(+id).subscribe({
      next: (data) => this.draft.set(data),
      error: (err) => console.error('Failed to load design draft', err),
    });
  }

  save() {
    const draft = this.draft();
    if (!draft) return;
    this.saveState.set('loading');
    this.draftService.update(draft.id, {
      name: draft.name,
      main_css: draft.main_css,
      custom_style_css: draft.custom_style_css,
    }).subscribe({
      next: () => this.flashState('success'),
      error: (err) => {
        console.error('Failed to save design draft', err);
        this.flashState('error');
      },
    });
  }

  openPreview() {
    const draft = this.draft();
    if (draft) window.open(`/?draft=${draft.session_key}`, '_blank');
  }

  private flashState(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
