import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactionSettingService } from '../../services/faction-setting.service';
import { FactionService } from '../../services/faction.service';
import { FactionSetting } from '../../models/FactionSetting';
import { Faction } from '../../models/Faction';

@Component({
  selector: 'app-admin-faction-settings',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './admin-faction-settings.component.html',
  styleUrl: './admin-faction-settings.component.css'
})
export class AdminFactionSettingsComponent implements OnInit {
  private service = inject(FactionSettingService);
  private factionService = inject(FactionService);

  factionSettings = this.service.factionSettings;
  factions = this.factionService.factions;

  private tempIdCounter = -1;

  ngOnInit() {
    this.service.load();
    this.factionService.loadFactions();
  }

  isNew(setting: FactionSetting): boolean {
    return setting.id < 0;
  }

  addNew() {
    const newSetting: FactionSetting = {
      id: this.tempIdCounter--,
      level: 0,
      human_name: '',
      parent_faction_id: null
    };
    this.factionSettings.update(list => [...list, newSetting]);
  }

  save(setting: FactionSetting) {
    const payload = {
      level: setting.level,
      human_name: setting.human_name,
      parent_faction_id: setting.parent_faction_id ?? null
    };

    if (this.isNew(setting)) {
      this.service.create(payload).subscribe({
        next: (created) => this.replace(setting, created),
        error: (err) => console.error('Failed to create faction setting', err)
      });
    } else {
      this.service.update(setting.id, payload).subscribe({
        next: (updated) => this.replace(setting, updated),
        error: (err) => console.error('Failed to update faction setting', err)
      });
    }
  }

  delete(setting: FactionSetting) {
    if (this.isNew(setting)) {
      this.factionSettings.update(list => list.filter(s => s !== setting));
      return;
    }
    this.service.delete(setting.id).subscribe({
      next: () => this.factionSettings.update(list => list.filter(s => s.id !== setting.id)),
      error: (err) => console.error('Failed to delete faction setting', err)
    });
  }

  parentOptions(): Faction[] {
    return this.factions();
  }

  private replace(temp: FactionSetting, updated: FactionSetting) {
    this.factionSettings.update(list =>
      list.map(s => s === temp ? updated : s)
    );
  }
}
