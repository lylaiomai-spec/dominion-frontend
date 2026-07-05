import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { DesignDraftService } from '../../services/design-draft.service';
import { DesignDraft } from '../../models/DesignDraft';
import { CssEditorComponent } from '../../components/css-editor/css-editor.component';
import { SaveButtonComponent } from '../save-button/save-button.component';

type SaveState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-design-draft-edit',
  standalone: true,
  imports: [FormsModule, CssEditorComponent, SaveButtonComponent],
  templateUrl: './admin-design-draft-edit.component.html',
})
export class AdminDesignDraftEditComponent implements OnInit, OnDestroy {
  private draftService = inject(DesignDraftService);
  private route = inject(ActivatedRoute);

  draft = signal<DesignDraft | null>(null);
  saveState = signal<SaveState>('idle');
  publishState = signal<SaveState>('idle');
  autoSave = signal(false);
  showPublishModal = signal(false);

  private changeSubject = new Subject<void>();
  private autoSaveSubscription: Subscription | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.draftService.get(+id).subscribe({
      next: (data) => this.draft.set(data),
      error: (err) => console.error('Failed to load design draft', err),
    });

    this.autoSaveSubscription = this.changeSubject.pipe(debounceTime(3000)).subscribe(() => {
      if (this.autoSave()) this.save();
    });
  }

  ngOnDestroy() {
    this.autoSaveSubscription?.unsubscribe();
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

  publish() {
    const draft = this.draft();
    if (!draft) return;
    this.publishState.set('loading');
    this.draftService.publish(draft.id).subscribe({
      next: () => {
        this.publishState.set('success');
        setTimeout(() => {
          this.publishState.set('idle');
          this.showPublishModal.set(false);
        }, 1500);
      },
      error: (err) => {
        console.error('Failed to publish design draft', err);
        this.publishState.set('error');
        setTimeout(() => this.publishState.set('idle'), 3000);
      },
    });
  }

  openPreview() {
    const draft = this.draft();
    if (draft) window.open(`/?draft=${draft.session_key}`, '_blank');
  }

  updateMainCss(value: string) {
    this.draft.update(d => d ? { ...d, main_css: value } : d);
    this.changeSubject.next();
  }

  updateCustomStyleCss(value: string) {
    this.draft.update(d => d ? { ...d, custom_style_css: value } : d);
    this.changeSubject.next();
  }

  private flashState(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
