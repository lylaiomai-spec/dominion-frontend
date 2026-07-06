import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FactionService } from '../../services/faction.service';
import { ApiService } from '../../services/api.service';
import { Faction } from '../../models/Faction';
import { SaveButtonComponent, SaveState } from '../save-button/save-button.component';

interface FreeFormatDateOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-admin-factions',
  imports: [CommonModule, FormsModule, RouterLink, SaveButtonComponent],
  standalone: true,
  templateUrl: './admin-factions.component.html',
  styleUrl: './admin-factions.component.css'
})
export class AdminFactionsComponent implements OnInit {
  private factionService = inject(FactionService);
  private apiService = inject(ApiService);

  factions = this.factionService.factionTree;
  pendingFactions = this.factionService.pendingFactions;
  freeFormatDateOptions: FreeFormatDateOption[] = [];

  showDeleteErrorModal = false;

  private tempIdCounter = -1;
  private saveStates = signal<Map<number, SaveState>>(new Map());

  saveStateFor(faction: Faction): SaveState {
    return this.saveStates().get(faction.id) ?? 'idle';
  }

  ngOnInit() {
    this.factionService.loadFactionTree();
    this.factionService.loadPendingFactions();
    this.apiService.get<FreeFormatDateOption[]>('admin/free-format-date-settings/options').subscribe({
      next: (data) => this.freeFormatDateOptions = data,
      error: (err) => console.error('Failed to load free format date options', err),
    });
  }

  approve(faction: Faction) {
    this.factionService.updateFactionStatus(faction.id, 0).subscribe({
      next: () => {
        this.factionService.pendingFactions.update(list => list.filter(f => f.id !== faction.id));
        this.factionService.loadFactionTree();
      },
      error: (err) => console.error('Failed to approve faction', err)
    });
  }

  decline(faction: Faction) {
    this.factionService.updateFactionStatus(faction.id, 1).subscribe({
      next: () => this.factionService.pendingFactions.update(list => list.filter(f => f.id !== faction.id)),
      error: (err) => console.error('Failed to decline faction', err)
    });
  }

  addChild(faction: Faction) {
    const child: Faction = {
      id: this.tempIdCounter--,
      name: '',
      level: faction.level + 1,
      description: null,
      icon: null,
      parent_id: faction.id,
      faction_status: 0,
      show_on_profile: false,
      free_format_date_id: null,
      characters: []
    };
    this.factions.update(list => {
      const index = list.indexOf(faction);
      const updated = [...list];
      updated.splice(index + 1, 0, child);
      return updated;
    });
  }

  isNew(faction: Faction): boolean {
    return faction.id < 0;
  }

  save(faction: Faction) {
    if (this.isNew(faction)) {
      this.factionService.createFaction(faction).subscribe({
        next: (created) => this.replaceFaction(faction, created),
        error: (err) => console.error('Failed to create faction', err)
      });
    } else {
      this.setSaveState(faction.id, 'loading');
      this.factionService.updateFaction(faction.id, faction).subscribe({
        next: () => this.flashSaveState(faction.id, 'success'),
        error: (err) => {
          console.error('Failed to save faction', err);
          this.flashSaveState(faction.id, 'error');
        }
      });
    }
  }

  private setSaveState(id: number, state: SaveState) {
    this.saveStates.update(m => new Map(m).set(id, state));
  }

  private flashSaveState(id: number, value: 'success' | 'error') {
    this.setSaveState(id, value);
    setTimeout(() => this.setSaveState(id, 'idle'), 3000);
  }

  deleteFaction(faction: Faction) {
    this.factionService.deleteFaction(faction.id).subscribe({
      next: () => this.factions.update(list => list.filter(f => f.id !== faction.id)),
      error: (err) => {
        if (err.status === 409) {
          this.showDeleteErrorModal = true;
        } else {
          console.error('Failed to delete faction', err);
        }
      }
    });
  }

  private replaceFaction(temp: Faction, created: Faction) {
    this.factions.update(list =>
      list.map(f => f === temp ? created : f)
    );
  }
}
