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

interface FactionDateTemplate {
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
  @Input() fieldValue: string = '';
  @Input() showFieldName: boolean = true;
  @Input() name: string | undefined;
  @Input() characterIds: number[] = [];

  factions: FactionDateTemplate[] = [];
  selectedFaction: FactionDateTemplate | null = null;
  selectedFormatIndex = 0;
  values: Record<number, string | number | null> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['characterIds']) {
      this.load();
    }
  }

  onFactionChange() {
    this.selectedFormatIndex = 0;
    this.resetValues();
  }

  get serializedValue(): string {
    if (!this.selectedFaction) return '';
    const ffd = this.selectedFaction.free_format_date;
    const rawFormat = ffd.format_strings[this.selectedFormatIndex];

    const formatString = [...ffd.placeholders]
      .sort((a, b) => b.position - a.position)
      .reduce((str, p) => str.replaceAll(`$${p.position}`, `{${p.name}}`), rawFormat);

    const placeholders: Record<string, string | number | null> = {};
    for (const p of ffd.placeholders) {
      placeholders[p.name] = this.values[p.position] ?? null;
    }

    return JSON.stringify({ faction_id: this.selectedFaction.id, format_string: formatString, placeholders });
  }

  segments(formatString: string): Segment[] {
    if (!this.selectedFaction) return [];
    const parts = formatString.split(/(\$\d+)/);
    return parts.flatMap<Segment>(part => {
      const match = part.match(/^\$(\d+)$/);
      if (match) {
        const pos = Number(match[1]);
        const ph = this.selectedFaction!.free_format_date.placeholders.find(p => p.position === pos);
        if (ph) return [{ kind: 'input', placeholder: ph }];
      }
      return part ? [{ kind: 'text', text: part }] : [];
    });
  }

  private load() {
    if (!this.characterIds.length) {
      this.factions = [];
      this.selectedFaction = null;
      return;
    }
    this.apiService.post<FactionDateTemplate[]>('factions/free-format-date', { character_ids: this.characterIds }).subscribe({
      next: (data) => {
        this.factions = data;
        this.selectedFaction = data[0] ?? null;
        this.resetValues();
      },
      error: (err) => console.error('Failed to load faction date templates', err),
    });
  }

  private resetValues() {
    this.values = {};
    if (!this.selectedFaction) return;
    for (const ph of this.selectedFaction.free_format_date.placeholders) {
      this.values[ph.position] = ph.is_nullable ? null : (ph.type === 'number' ? (ph.min_value ?? null) : (ph.value_list?.[0] ?? null));
    }
  }
}
