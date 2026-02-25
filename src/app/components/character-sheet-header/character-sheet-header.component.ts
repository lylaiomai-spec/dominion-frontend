import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character, CustomFieldsData, CustomFieldValue } from '../../models/Character';
import { ShortTextFieldDisplayComponent } from '../short-text-field-display/short-text-field-display.component';
import { LongTextFieldDisplayComponent } from '../long-text-field-display/long-text-field-display.component';
import { NumberFieldDisplayComponent } from '../number-field-display/number-field-display.component';
import { AuthService } from '../../services/auth.service';
import { CharacterService } from '../../services/character.service';

@Component({
  selector: 'app-character-sheet-header',
  imports: [CommonModule, ShortTextFieldDisplayComponent, LongTextFieldDisplayComponent, NumberFieldDisplayComponent],
  templateUrl: './character-sheet-header.component.html',
  standalone: true,
  styleUrl: './character-sheet-header.component.css'
})
export class CharacterSheetHeaderComponent implements OnInit {
  @Input() character!: Character | null;
  @Input() context: 'topic' | 'page' = 'page';

  private authService = inject(AuthService);
  private characterService = inject(CharacterService);

  isAdmin = this.authService.isAdmin;
  customFields: any[] = [];

  ngOnInit() {
    if (this.character && this.character.custom_fields) {
      this.customFields = this.processCustomFields(this.character.custom_fields);
    }
  }

  private processCustomFields(data: CustomFieldsData): any[] {
    if (!data || !data.field_config) return [];

    return data.field_config.map(config => {
      const customField: CustomFieldValue | undefined = data.custom_fields ? data.custom_fields[config.machine_field_name] : undefined;
      let fieldValue: any = '';

      if (customField) {
        fieldValue = config.content_field_type === 'long_text' ? customField.content_html : customField.content;
      }

      return {
        fieldMachineName: config.machine_field_name,
        fieldName: config.human_field_name,
        fieldValue: fieldValue ?? '',
        type: config.content_field_type,
        showFieldName: true,
        order: config.order
      };
    }).sort((a, b) => a.order - b.order);
  }

  acceptCharacter() {
    if (this.character) {
      this.characterService.acceptCharacter(this.character.id).subscribe({
        next: () => {
          console.log('Character accepted successfully');
          if (this.character) {
            this.character.character_status = 1;
          }
        },
        error: (err) => console.error('Failed to accept character', err)
      });
    }
  }
}
