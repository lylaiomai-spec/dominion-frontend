import { Component, inject, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CharacterService } from '../services/character.service';
import { ShortTextFieldComponent } from '../components/short-text-field/short-text-field.component';
import { LongTextFieldComponent } from '../components/long-text-field/long-text-field.component';
import { ImageFieldComponent } from '../components/image-field/image-field.component';
import { FactionChooseComponent } from '../components/faction-choose/faction-choose.component';
import { CreateCharacterRequest, Character } from '../models/Character';
import { Faction } from '../models/Faction';

@Component({
  selector: 'app-character-create',
  imports: [ShortTextFieldComponent, LongTextFieldComponent, ImageFieldComponent, FactionChooseComponent],
  templateUrl: './character-create.component.html',
  standalone: true,
  styleUrl: './character-create.component.css'
})
export class CharacterCreateComponent implements OnInit {
  characterService = inject(CharacterService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  characterTemplate = this.characterService.characterTemplate;

  @Input() initialData: Character | null = null;
  @Output() formSubmit = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  subforumId: number = 0;
  selectedFactions: Faction[] = [];

  characterName: string = '';
  characterAvatar: string = '';

  ngOnInit() {
    this.characterService.loadCharacterTemplate();
    this.route.queryParams.subscribe(params => {
      if (params['fid']) {
        this.subforumId = +params['fid'];
      }
    });

    if (this.initialData) {
      this.populateForm(this.initialData);
    }
  }

  populateForm(data: Character) {
    this.characterName = data.name;
    this.characterAvatar = data.avatar || '';
    if (data.factions) {
      this.selectedFactions = data.factions;
    }
  }

  onFactionsChanged(factions: any[]) {
    console.log('--- CharacterCreate: onFactionsChanged called with:', factions);
    this.selectedFactions = factions;
  }

  getFieldValue(machineName: string): any {
    if (this.initialData && this.initialData.custom_fields && this.initialData.custom_fields.custom_fields) {
      const field = this.initialData.custom_fields.custom_fields[machineName];
      return field ? field.content : null;
    }
    return null;
  }

  onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const customFields: { [key: string]: any } = {};
    this.characterTemplate().forEach(field => {
      let value: any = formData.get(field.machine_field_name);
      if (value !== null) {
        if (field.field_type === 'int') {
          value = parseInt(value, 10);
        }
        customFields[field.machine_field_name] = {
          'content': value
        };
      }
    });

    console.log('--- CharacterCreate: onSubmit selectedFactions:', this.selectedFactions);

    const factions = this.selectedFactions.map(f => ({
      id: f.id,
      name: f.name,
      parent_id: f.parent_id,
      level: f.level,
      description: f.description,
      icon: f.icon,
      show_on_profile: true,
      faction_status: 0,
      characters: []
    }));

    const request: any = {
      subforum_id: this.subforumId,
      name: formData.get('req_name') as string,
      avatar: formData.get('req_avatar') as string,
      custom_fields: customFields,
      factions: factions
    };

    if (this.formSubmit.observed) {
      this.formSubmit.emit(request);
    } else {
      this.characterService.createCharacter(request as CreateCharacterRequest).subscribe({
        next: (response) => {
          console.log('Character created successfully', response);
          this.router.navigate(['/viewforum', this.subforumId]);
        },
        error: (err) => {
          console.error('Failed to create character', err);
        }
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
