import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface PlaceholderDef {
  type: 'number' | 'list';
  name: string;
  position: number;
  is_nullable: boolean;
  min_value?: number | null;
  max_value?: number | null;
  value_list?: string[];
}

interface FreeFormatDateTemplate {
  id: number;
  name: string;
  free_format_date: {
    format_strings: string[];
    placeholders: PlaceholderDef[];
  };
}

type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'input'; placeholder: PlaceholderDef };

@Component({
  selector: 'app-free-format-date-field',
  imports: [FormsModule],
  templateUrl: './free-format-date-field.component.html',
  styleUrl: './free-format-date-field.component.css',
  standalone: true,
})
export class FreeFormatDateFieldComponent implements OnChanges {
  private apiService = inject(ApiService);

  @Input() fieldName: string | undefined;
  @Input() fieldValue: any = null;
  @Input() showFieldName: boolean = true;
  @Input() name: string | undefined;
  @Input() characterIds: number[] = [];

  dateTemplates: FreeFormatDateTemplate[] = [];
  selectedTemplate: FreeFormatDateTemplate | null = null;
  selectedFormatIndex = 0;
  values: Record<number, string | number | null> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['characterIds']) {
      this.load();
    }
  }

  onTemplateChange() {
    this.selectedFormatIndex = 0;
    this.resetValues();
  }

  get serializedValue(): string {
    if (!this.selectedTemplate) return '';
    const ffd = this.selectedTemplate.free_format_date;
    const rawFormat = ffd.format_strings[this.selectedFormatIndex];

    const formatString = [...ffd.placeholders]
      .sort((a, b) => b.position - a.position)
      .reduce((str, p) => str.replaceAll(`$${p.position}`, `{${p.name}}`), rawFormat);

    const placeholders: Record<string, string | number | null> = {};
    for (const p of ffd.placeholders) {
      placeholders[p.name] = this.values[p.position] ?? null;
    }

    return JSON.stringify({ free_format_date_id: this.selectedTemplate.id, format_string: formatString, placeholders });
  }

  segments(formatString: string): Segment[] {
    if (!this.selectedTemplate) return [];
    const parts = formatString.split(/(\$\d+)/);
    return parts.flatMap<Segment>(part => {
      const match = part.match(/^\$(\d+)$/);
      if (match) {
        const pos = Number(match[1]);
        const ph = this.selectedTemplate!.free_format_date.placeholders.find(p => p.position === pos);
        if (ph) return [{ kind: 'input', placeholder: ph }];
      }
      return part ? [{ kind: 'text', text: part }] : [];
    });
  }

  private load() {
    if (!this.characterIds.length) {
      this.dateTemplates = [];
      this.selectedTemplate = null;
      return;
    }
    this.apiService.post<FreeFormatDateTemplate[]>('factions/free-format-date', { character_ids: this.characterIds }).subscribe({
      next: (data) => {
        this.dateTemplates = data;
        this.populateFromValue(data);
      },
      error: (err) => console.error('Failed to load free format date templates', err),
    });
  }

  private populateFromValue(factions: FreeFormatDateTemplate[]) {
    const v = this.fieldValue;
    if (!v || typeof v !== 'object') {
      this.selectedTemplate = factions[0] ?? null;
      this.resetValues();
      return;
    }

    this.selectedTemplate = factions.find(f => f.id === v.free_format_date_id) ?? factions[0] ?? null;
    if (!this.selectedTemplate) return;

    const ffd = this.selectedTemplate.free_format_date;

    this.selectedFormatIndex = 0;
    for (let i = 0; i < ffd.format_strings.length; i++) {
      const converted = [...ffd.placeholders]
        .sort((a, b) => b.position - a.position)
        .reduce((str, p) => str.replaceAll(`$${p.position}`, `{${p.name}}`), ffd.format_strings[i]);
      if (converted === v.format_string) {
        this.selectedFormatIndex = i;
        break;
      }
    }

    this.values = {};
    if (v.placeholders && typeof v.placeholders === 'object') {
      for (const p of ffd.placeholders) {
        this.values[p.position] = v.placeholders[p.name] ?? null;
      }
    } else {
      this.resetValues();
    }
  }

  private resetValues() {
    this.values = {};
    if (!this.selectedTemplate) return;
    for (const ph of this.selectedTemplate.free_format_date.placeholders) {
      this.values[ph.position] = ph.type === 'number' ? null : (ph.is_nullable ? null : (ph.value_list?.[0] ?? null));
    }
  }
}
