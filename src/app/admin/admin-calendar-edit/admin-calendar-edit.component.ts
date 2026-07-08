import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CalendarService } from '../../services/calendar.service';
import { CalendarFreeFormatDate, PlaceholderDef } from '../../models/Calendar';
import { SaveButtonComponent } from '../save-button/save-button.component';

type SaveState = 'idle' | 'loading' | 'success' | 'error';
type TimeUnitType = 'number' | 'list';

interface TimeUnit {
  _tempId: number;
  name: string;
  position: number;
  type: TimeUnitType;
  minValue: number | null;
  maxValue: number | null;
  listValues: string[];
  canBeNull: boolean;
  isHiddenNegative: boolean;
}

interface FormatEntry {
  _tempId: number;
  value: string;
}

@Component({
  selector: 'app-admin-calendar-edit',
  standalone: true,
  imports: [FormsModule, SaveButtonComponent],
  templateUrl: './admin-calendar-edit.component.html',
  styleUrl: './admin-calendar-edit.component.css',
})
export class AdminCalendarEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private calendarService = inject(CalendarService);

  calendarId: number | null = null;
  name = '';
  saveState: SaveState = 'idle';
  private nextId = 1;

  timeUnits: TimeUnit[] = [this.createTimeUnit()];
  formats: FormatEntry[] = [this.createFormat()];

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw && raw !== 'new') {
      this.calendarId = Number(raw);
      this.calendarService.getById(this.calendarId).subscribe({
        next: (data) => {
          this.name = data.name;
          this.populateForm(data.free_format_date);
        },
        error: (err) => console.error('Failed to load calendar', err),
      });
    }
  }

  private populateForm(data: CalendarFreeFormatDate) {
    this.timeUnits = data.placeholders.map(p => ({
      _tempId: this.nextId++,
      name: p.name,
      position: p.position,
      type: p.type,
      minValue: p.min_value ?? null,
      maxValue: p.max_value ?? null,
      listValues: p.value_list?.length ? p.value_list : [''],
      canBeNull: p.is_nullable,
      isHiddenNegative: p.is_hidden_negative ?? false,
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
    return this.name.trim() !== '' && this.formats.every(f => this.missingUnits(f).length === 0);
  }

  submit() {
    if (!this.isValid()) return;

    const placeholders = this.timeUnits.map(u => {
      const base: PlaceholderDef = {
        type: u.type,
        name: u.name,
        position: u.position,
        is_nullable: u.canBeNull,
        ...(u.isHiddenNegative ? { is_hidden_negative: true } : {}),
      };
      return u.type === 'number'
        ? { ...base, min_value: u.minValue, max_value: u.maxValue }
        : { ...base, value_list: u.listValues };
    });

    const ffd: CalendarFreeFormatDate = {
      format_strings: this.formats.map(f => this.toFormatString(f.value)),
      placeholders,
    };

    this.saveState = 'loading';

    if (this.calendarId === null) {
      this.calendarService.create(this.name, ffd).subscribe({
        next: ({ id }) => {
          this.calendarId = id;
          this.saveState = 'success';
          setTimeout(() => {
            this.saveState = 'idle';
            this.router.navigate(['/admin/calendar', id]);
          }, 1500);
        },
        error: (err) => {
          console.error('Failed to create calendar', err);
          this.saveState = 'error';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
      });
    } else {
      this.calendarService.update(this.calendarId, this.name, ffd).subscribe({
        next: () => {
          this.saveState = 'success';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
        error: (err) => {
          console.error('Failed to save calendar', err);
          this.saveState = 'error';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private toFormatString(format: string): string {
    return this.timeUnits.reduce(
      (str, u) => (u.name.trim() ? str.replaceAll(`{${u.name}}`, `$${u.position}`) : str),
      format
    );
  }

  private fromFormatString(format: string, placeholders: PlaceholderDef[]): string {
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
      isHiddenNegative: false,
    };
  }

  private createFormat(): FormatEntry {
    return { _tempId: this.nextId++, value: '' };
  }
}
