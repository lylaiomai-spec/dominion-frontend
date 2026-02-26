import { Component, inject, effect, signal, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FactionService } from '../../services/faction.service';
import { Faction } from '../../models/Faction';

interface FactionLevel {
  label: string;
  options: Faction[];
  selectedId: number | null;
}

@Component({
  selector: 'app-faction-choose',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './faction-choose.component.html',
  styleUrl: './faction-choose.component.css'
})
export class FactionChooseComponent implements OnInit {
  private factionService = inject(FactionService);

  @Input() initialFactions: Faction[] = [];
  @Output() selectionChange = new EventEmitter<Faction[]>();

  factionLevels = signal<FactionLevel[]>([]);

  constructor() {
    // Constructor logic moved to ngOnInit or handled there
  }

  ngOnInit() {
    if (this.initialFactions.length > 0) {
      this.loadInitialFactions(0);
    } else {
      this.addFactionLevel(0);
    }
  }

  loadInitialFactions(index: number) {
    const parentId = index === 0 ? 0 : this.initialFactions[index - 1].id;

    this.factionService.getFactionChildren(parentId).subscribe(children => {
      if (children.length > 0 || this.factionLevels().length === 0) {
        const selectedId = index < this.initialFactions.length ? this.initialFactions[index].id : null;

        this.factionLevels.update(levels => [
          ...levels,
          {
            label: `Faction ${levels.length + 1}`,
            options: children,
            selectedId: selectedId
          }
        ]);

        if (selectedId !== null && index < this.initialFactions.length) {
          this.loadInitialFactions(index + 1);
        }
      }
    });
  }

  addFactionLevel(parentId: number) {
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
