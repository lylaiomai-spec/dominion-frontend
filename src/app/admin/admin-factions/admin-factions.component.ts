import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactionService } from '../../services/faction.service';
import { Faction } from '../../models/Faction';

@Component({
  selector: 'app-admin-factions',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './admin-factions.component.html',
  styleUrl: './admin-factions.component.css'
})
export class AdminFactionsComponent implements OnInit {
  private factionService = inject(FactionService);

  factions = this.factionService.factionTree;

  private tempIdCounter = -1;

  ngOnInit() {
    this.factionService.loadFactionTree();
  }

  addChild(faction: Faction) {
    const child: Faction = {
      id: this.tempIdCounter--,
      name: '',
      level: faction.level + 1,
      description: null,
      icon: null,
      parent_id: faction.id,
      show_on_profile: false,
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
      this.factionService.updateFaction(faction.id, faction).subscribe({
        error: (err) => console.error('Failed to save faction', err)
      });
    }
  }

  private replaceFaction(temp: Faction, created: Faction) {
    this.factions.update(list =>
      list.map(f => f === temp ? created : f)
    );
  }
}
