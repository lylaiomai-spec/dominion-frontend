import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export type TimeUnitType = 'number' | 'list';

export interface TimeUnit {
  _tempId: number;
  name: string;
  position: number;
  type: TimeUnitType;
  minValue: number | null;
  maxValue: number | null;
  listValues: string[];
  canBeNull: boolean;
}

export interface FormatEntry {
  _tempId: number;
  value: string;
}

interface PlaceholderResponse {
  type: TimeUnitType;
  name: string;
  position: number;
  is_nullable: boolean;
  min_value?: number | null;
  max_value?: number | null;
  value_list?: string[];
}

interface FreeFormatDateResponse {
  format_strings: string[];
  placeholders: PlaceholderResponse[];
}

@Component({
  selector: 'app-admin-faction-free-format-date',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-faction-free-format-date.component.html',
  styleUrl: './admin-faction-free-format-date.component.css',
})
export class AdminFactionFreeFormatDateComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  factionId = 0;
  saveState: SaveState = 'idle';
  private nextId = 1;

  timeUnits: TimeUnit[] = [this.createTimeUnit()];
  formats: FormatEntry[] = [this.createFormat()];

  ngOnInit() {
    this.factionId = Number(this.route.snapshot.paramMap.get('faction_id'));
    this.load();
  }

  private load() {
    this.apiService.get<FreeFormatDateResponse>(`faction/${this.factionId}/free-format-date`).subscribe({
      next: (data) => this.populateForm(data),
      error: (err) => {
        if (err.status !== 404) {
          console.error('Failed to load free-format date config', err);
        }
      },
    });
  }

  private populateForm(data: FreeFormatDateResponse) {
    this.timeUnits = data.placeholders.map(p => ({
      _tempId: this.nextId++,
      name: p.name,
      position: p.position,
      type: p.type,
      minValue: p.min_value ?? null,
      maxValue: p.max_value ?? null,
      listValues: p.value_list?.length ? p.value_list : [''],
      canBeNull: p.is_nullable,
    }));
    this.formats = data.format_strings.map(s => ({
      _tempId: this.nextId++,
      value: this.fromFormatString(s, data.placeholders),
    }));
  }

  // ── Time Units ──────────────────────────────────────────────────────────────

  addTimeUnit() {
    this.timeUnits.push(this.createTimeUnit());
  }

  removeTimeUnit(unit: TimeUnit) {
    this.timeUnits = this.timeUnits.filter(u => u !== unit);
  }

  onTypeChange(unit: TimeUnit) {
    unit.minValue = null;
    unit.maxValue = null;
    unit.listValues = [''];
  }

  addListValue(unit: TimeUnit) {
    unit.listValues.push('');
  }

  removeListValue(unit: TimeUnit, index: number) {
    unit.listValues.splice(index, 1);
  }

  trackByIndex(index: number) {
    return index;
  }

  // ── Formats ─────────────────────────────────────────────────────────────────

  addFormat() {
    this.formats.push(this.createFormat());
  }

  removeFormat(format: FormatEntry) {
    this.formats = this.formats.filter(f => f !== format);
  }

  insertTag(input: HTMLInputElement, format: FormatEntry, unitName: string) {
    const tag = `{${unitName}}`;
    const start = input.selectionStart ?? format.value.length;
    const end = input.selectionEnd ?? format.value.length;
    format.value = format.value.slice(0, start) + tag + format.value.slice(end);
    const newPos = start + tag.length;
    setTimeout(() => {
      input.setSelectionRange(newPos, newPos);
      input.focus();
    });
  }

  namedTimeUnits(): TimeUnit[] {
    return this.timeUnits.filter(u => u.name.trim() !== '');
  }

  missingUnits(format: FormatEntry): string[] {
    return this.timeUnits
      .filter(u => !u.canBeNull && u.name.trim() !== '' && !format.value.includes(`{${u.name}}`))
      .map(u => u.name);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  isValid(): boolean {
    return this.formats.every(f => this.missingUnits(f).length === 0);
  }

  submit() {
    if (!this.isValid()) return;

    const placeholders = this.timeUnits.map(u => {
      const base = {
        type: u.type,
        name: u.name,
        position: u.position,
        is_nullable: u.canBeNull,
      };
      return u.type === 'number'
        ? { ...base, min_value: u.minValue, max_value: u.maxValue }
        : { ...base, value_list: u.listValues };
    });

    const body = {
      format_strings: this.formats.map(f => this.toFormatString(f.value)),
      placeholders,
    };

    this.saveState = 'saving';
    this.apiService.post(`admin/faction/${this.factionId}/free-format-date`, body).subscribe({
      next: () => {
        this.saveState = 'success';
        setTimeout(() => (this.saveState = 'idle'), 3000);
      },
      error: (err) => {
        console.error('Failed to save free-format date config', err);
        this.saveState = 'error';
        setTimeout(() => (this.saveState = 'idle'), 3000);
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private toFormatString(format: string): string {
    return this.timeUnits.reduce(
      (str, u) => (u.name.trim() ? str.replaceAll(`{${u.name}}`, `$${u.position}`) : str),
      format
    );
  }

  private fromFormatString(format: string, placeholders: PlaceholderResponse[]): string {
    // Sort descending so $10 is replaced before $1
    return [...placeholders]
      .sort((a, b) => b.position - a.position)
      .reduce((str, p) => str.replaceAll(`$${p.position}`, `{${p.name}}`), format);
  }

  private createTimeUnit(): TimeUnit {
    return {
      _tempId: this.nextId++,
      name: '',
      position: this.timeUnits?.length ?? 0,
      type: 'number',
      minValue: null,
      maxValue: null,
      listValues: [''],
      canBeNull: false,
    };
  }

  private createFormat(): FormatEntry {
    return { _tempId: this.nextId++, value: '' };
  }
}
