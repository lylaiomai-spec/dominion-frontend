import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { WantedCharacterService } from '../services/wanted-character.service';
import { ShortTextFieldComponent } from '../components/short-text-field/short-text-field.component';
import { LongTextFieldComponent } from '../components/long-text-field/long-text-field.component';
import { ImageFieldComponent } from '../components/image-field/image-field.component';
import { FactionPathsComponent } from '../components/faction-paths/faction-paths.component';
import { Faction } from '../models/Faction';

@Component({
  selector: 'app-wanted-character-create',
  standalone: true,
  imports: [CommonModule, ShortTextFieldComponent, LongTextFieldComponent, ImageFieldComponent, FactionPathsComponent],
  templateUrl: './wanted-character-create.component.html',
  styleUrl: './wanted-character-create.component.css'
})
export class WantedCharacterCreateComponent implements OnInit {
  private wantedCharacterService = inject(WantedCharacterService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  template = this.wantedCharacterService.template;
  subforumId: number = 0;
  characterName: string = '';
  factionPaths: Faction[][] = [[]];

  ngOnInit() {
    this.wantedCharacterService.loadTemplate();
    this.route.queryParams.subscribe(params => {
      if (params['fid']) {
        this.subforumId = +params['fid'];
      }
    });
  }

  onFactionsChanged(paths: Faction[][]) {
    this.factionPaths = paths;
  }

  onSubmit(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const customFields: { [key: string]: any } = {};
    this.template().forEach(field => {
      let value: any = formData.get(field.machine_field_name);
      if (value !== null) {
        if (field.field_type === 'int') {
          const parsed = parseInt(value, 10);
          value = isNaN(parsed) ? null : parsed;
        }
        customFields[field.machine_field_name] = { content: value };
      }
    });

    const allSelectedFactions = this.factionPaths.flat();
    const uniqueFactions = Array.from(new Map(allSelectedFactions.map(f => [f.id, f])).values());
    const factions = uniqueFactions.map(f => ({
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

    const request = {
      subforum_id: this.subforumId,
      name: formData.get('req_name') as string,
      custom_fields: customFields,
      factions
    };

    this.wantedCharacterService.save(request).subscribe({
      next: (response: any) => {
        if (response?.id) {
          this.router.navigate(['/viewtopic', response.id]);
        } else {
          this.router.navigate(['/viewforum', this.subforumId]);
        }
      },
      error: (err) => console.error('Failed to save wanted character', err)
    });
  }
}
