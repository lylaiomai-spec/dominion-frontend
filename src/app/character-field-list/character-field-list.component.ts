import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

interface ShortCharacter {
  id: number;
  name: string;
}

interface WantedCharacterRef {
  name: string;
  topic_id: number | null;
}

interface FieldValue {
  value: string;
  characters: ShortCharacter[];
}

interface WantedFieldValue {
  value: string;
  characters: WantedCharacterRef[];
}

@Component({
  selector: 'app-character-field-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './character-field-list.component.html',
})
export class CharacterFieldListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  humanFieldName = signal<string>('');
  items = signal<FieldValue[]>([]);
  wantedItems = signal<WantedFieldValue[]>([]);

  ngOnInit() {
    const machineName = this.route.snapshot.paramMap.get('field')!;
    this.apiService.get<{ human_field_name: string; values: FieldValue[] }>(`character/field-list/${machineName}`).subscribe({
      next: (data) => {
        this.humanFieldName.set(data.human_field_name);
        this.items.set(data.values);
      },
      error: (err) => console.error('Failed to load field list', err)
    });
    this.apiService.get<{ values: WantedFieldValue[] }>(`wanted-character/field-list/${machineName}`).subscribe({
      next: (data) => this.wantedItems.set(data.values),
      error: (err) => console.error('Failed to load wanted character field list', err)
    });
  }
}
