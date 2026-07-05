import { Component, inject, signal, OnInit, effect } from '@angular/core';
import { EpisodeService } from '../../services/episode.service';
import { FieldTemplateRowComponent, FieldTemplateForm } from '../field-template-row/field-template-row.component';
import { CommonModule } from '@angular/common';
import { SaveButtonComponent } from '../save-button/save-button.component';

@Component({
  selector: 'app-episode-template-edit',
  imports: [FieldTemplateRowComponent, CommonModule, SaveButtonComponent],
  templateUrl: './episode-template-edit.component.html',
  standalone: true,
  styleUrl: './episode-template-edit.component.css'
})
export class EpisodeTemplateEditComponent implements OnInit {
  episodeService = inject(EpisodeService);
  fields: FieldTemplateForm[] = [];
  saveState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  schemaConflicts = signal<{ machineName: string; existingType: string; newType: string }[]>([]);

  dbSchema = this.episodeService.episodeDbSchema;

  private templateLoaded = false;

  constructor() {
    effect(() => {
      const template = this.episodeService.episodeTemplate();
      if (template.length > 0 && !this.templateLoaded) {
        this.templateLoaded = true;
        this.fields = template.map((field, index) => ({ ...field, id: index }));
        this.addEmptyField();
      }
    });
  }

  ngOnInit() {
    this.episodeService.loadEpisodeTemplate();
    this.episodeService.loadEpisodeDbFieldSchema();

    setTimeout(() => {
      if (this.fields.length === 0) {
        this.addEmptyField();
      }
    }, 200);
  }

  addEmptyField() {
    this.fields.push({
      id: this.fields.length,
      machine_field_name: '',
      human_field_name: '',
      field_type: 'text',
      content_field_type: 'string',
      order: this.fields.length
    });
  }

  removeField(index: number) {
    this.fields.splice(index, 1);
    this.schemaConflicts.set([]);
  }

  saveTemplate() {
    const data = this.fields.filter(field => field.machine_field_name !== '');
    const schemaMap = new Map(this.episodeService.episodeDbSchema().map(s => [s.machine_name, s.field_type]));

    const conflicts = data
      .filter(field => {
        const existingType = schemaMap.get(field.machine_field_name);
        return existingType !== undefined && existingType !== field.field_type;
      })
      .map(field => ({
        machineName: field.machine_field_name,
        existingType: schemaMap.get(field.machine_field_name)!,
        newType: field.field_type
      }));

    if (conflicts.length > 0) {
      this.schemaConflicts.set(conflicts);
      return;
    }

    this.schemaConflicts.set([]);
    this.saveState.set('loading');
    this.episodeService.saveEpisodeTemplate(data).subscribe({
      next: () => { this.saveState.set('success'); setTimeout(() => this.saveState.set('idle'), 3000); },
      error: () => { this.saveState.set('error'); setTimeout(() => this.saveState.set('idle'), 3000); }
    });
  }
}
