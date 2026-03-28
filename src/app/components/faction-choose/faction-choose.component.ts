import { Component, inject, effect, signal, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactionService } from '../../services/faction.service';
import { Faction } from '../../models/Faction';
import { FactionCreateModalComponent } from '../faction-create-modal/faction-create-modal.component';

interface FactionLevel {
  label: string;
  options: Faction[];
  selectedId: number | null;
}

@Component({
  selector: 'app-faction-choose',
  standalone: true,
  imports: [CommonModule, FormsModule, FactionCreateModalComponent],
  templateUrl: './faction-choose.component.html',
  styleUrl: './faction-choose.component.css'
})
export class FactionChooseComponent implements OnInit {
  private factionService = inject(FactionService);

  @Input() initialFactions: Faction[] = [];
  @Output() selectionChange = new EventEmitter<Faction[]>();

  factionLevels = signal<FactionLevel[]>([]);

  showModal = false;
  activeLevelIndex: number | null = null;
  activeParentId: number | null = null;

  constructor() {
    // Constructor logic moved to ngOnInit or handled there
  }

  ngOnInit() {
    if (this.initialFactions.length > 0) {
      this.initFromKnownFactions();
    } else {
      this.addFactionLevel(0);
    }
  }

  private initFromKnownFactions() {
    // Directly set levels from known factions — no need to "find" them in a list
    this.factionLevels.set(
      this.initialFactions.map((faction, i) => ({
        label: `Faction ${i + 1}`,
        options: [faction],
        selectedId: faction.id
      }))
    );

    // Load full options for each level in the background so the user can change selections
    this.initialFactions.forEach((faction, index) => {
      const parentId = index === 0 ? 0 : this.initialFactions[index - 1].id;
      if (parentId < 0) return;
      this.factionService.getFactionChildren(parentId).subscribe(children => {
        this.factionLevels.update(levels => {
          const updated = [...levels];
          if (updated[index]) {
            const inList = children.some(c => c.id === faction.id);
            const options = inList ? children : [faction, ...children];
            updated[index] = { ...updated[index], options };
          }
          return updated;
        });
      });
    });

    // Load children of the last selected faction to allow deeper selection
    const lastId = this.initialFactions[this.initialFactions.length - 1].id;
    this.addFactionLevel(lastId);
  }

  addFactionLevel(parentId: number) {
    // If parentId is temporary (negative), don't load from backend
    if (parentId < 0) return;

    this.factionService.getFactionChildren(parentId).subscribe(children => {
      if (children.length > 0 || this.factionLevels().length === 0) {
        this.factionLevels.update(levels => [
          ...levels,
          {
            label: `Faction ${levels.length + 1}`,
            options: children,
            selectedId: null
          }
        ]);
      }
    });
  }

  onFactionChange(levelIndex: number) {
    const currentLevels = this.factionLevels();
    let selectedId = currentLevels[levelIndex].selectedId;

    if (selectedId !== null) {
      selectedId = +selectedId;
      currentLevels[levelIndex].selectedId = selectedId;
    }

    const nextLevels = currentLevels.slice(0, levelIndex + 1);
    this.factionLevels.set(nextLevels);

    if (selectedId !== null) {
      this.addFactionLevel(selectedId);
    }

    this.emitSelection();
  }

  openCreateModal(levelIndex: number) {
    const levels = this.factionLevels();
    // Parent ID is the selected ID of the previous level, or 0 if this is the first level
    this.activeParentId = levelIndex === 0 ? 0 : levels[levelIndex - 1].selectedId;
    this.activeLevelIndex = levelIndex;
    this.showModal = true;
  }

  onModalClose() {
    this.showModal = false;
    this.activeLevelIndex = null;
    this.activeParentId = null;
  }

  onFactionCreated(newFaction: Faction) {
    if (this.activeLevelIndex !== null) {
      const index = this.activeLevelIndex;
      this.factionLevels.update(currentLevels => {
        const updatedLevels = [...currentLevels];
        // Add new faction to options
        updatedLevels[index].options = [...updatedLevels[index].options, newFaction];
        // Select it
        updatedLevels[index].selectedId = newFaction.id;
        return updatedLevels;
      });

      // Trigger change to update selection and potentially add next level (though empty for new faction)
      this.onFactionChange(index);
    }
  }

  private emitSelection() {
    const selectedFactions = this.factionLevels()
      .map(level => level.options.find(f => f.id == level.selectedId))
      .filter((f): f is Faction => f !== undefined);

    this.selectionChange.emit(selectedFactions);
  }

  // Keep this for backward compatibility if needed, but prefer the event
  public getSelectedFactions(): Faction[] {
    return this.factionLevels()
      .map(level => level.options.find(f => f.id == level.selectedId))
      .filter((f): f is Faction => f !== undefined);
  }
}
