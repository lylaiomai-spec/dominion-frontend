import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {EpisodeFilterRequest} from '../models/Episode';
import {CharacterShort} from '../models/Character';
import {FormsModule} from '@angular/forms';
import {TopicStatus} from '../models/Topic';
import {EpisodeService} from '../services/episode.service';
import {CharacterService} from '../services/character.service';
import {FactionService} from '../services/faction.service';
import {CommonModule} from '@angular/common';
import {debounceTime, distinctUntilChanged, forkJoin, Subject} from 'rxjs';
import {Faction} from '../models/Faction';


@Component({
  selector: 'app-episode-list',
  imports: [
    RouterLink,
    FormsModule,
    CommonModule
  ],
  templateUrl: './episode-list.component.html',
  standalone: true,
})
export class EpisodeListComponent implements OnInit {
  protected episodeService = inject(EpisodeService);
  protected characterService = inject(CharacterService);
  protected factionService = inject(FactionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected currentPage: number = 1;
  protected totalPages: number = 1;
  protected topics = this.episodeService.episodeListPage;
  protected selectedCharacters: CharacterShort[] = [];
  protected selectedSubforums: number[] = [];
  protected selectedFactions: number[] = [];
  protected searchQuery: string = '';
  protected characterSearchQuery: string = '';
  protected subforums = this.episodeService.subforumList;
  protected characterSuggestions = this.characterService.shortCharacterList;
  protected factions = this.factionService.factions;

  private characterSearchTerms = new Subject<string>();

  constructor() {
    this.episodeService.loadSubforumList();
    this.factionService.loadFactions();
  }

  public ngOnInit(): void {
    this.characterSearchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.characterService.loadShortCharacterList(term);
    });

    const params = this.route.snapshot.queryParamMap;

    const subforums = params.get('subforums');
    if (subforums) {
      this.selectedSubforums = subforums.split(',').map(Number).filter(n => !isNaN(n));
    }

    const factions = params.get('factions');
    if (factions) {
      this.selectedFactions = factions.split(',').map(Number).filter(n => !isNaN(n));
    }

    const page = params.get('page');
    if (page) {
      this.currentPage = parseInt(page, 10) || 1;
    }

    const characterIds = params.get('characters');
    if (characterIds) {
      const ids = characterIds.split(',').map(Number).filter(n => !isNaN(n));
      if (ids.length > 0) {
        forkJoin(ids.map(id => this.characterService.loadCharacter(id))).subscribe(characters => {
          this.selectedCharacters = characters.map(c => ({ id: c.id, name: c.name, avatar: c.avatar ?? '' }));
          this.applyFilters();
        });
        return;
      }
    }

    this.applyFilters();
  }

  protected isSubforumSelected(id: number): boolean {
    return this.selectedSubforums.includes(id);
  }

  protected isFactionSelected(id: number): boolean {
    return this.selectedFactions.includes(id);
  }

  protected toggleForum(id: number): void {
    const index = this.selectedSubforums.indexOf(id);
    if (index > -1) {
      this.selectedSubforums.splice(index, 1);
    } else {
      this.selectedSubforums.push(id);
    }
  }

  protected onSearchChange() {
    this.characterSearchTerms.next(this.characterSearchQuery);
  }

  protected selectCharacter(character: CharacterShort) {
    if (!this.selectedCharacters.find(c => c.id === character.id)) {
      this.selectedCharacters.push(character);
    }
    this.characterSearchQuery = '';
    this.characterService.loadShortCharacterList('');
  }

  protected removeChar(id: number) {
    const index = this.selectedCharacters.findIndex(c => c.id === id);
    if (index > -1) {
      this.selectedCharacters.splice(index, 1);
    }
  }

  protected toggleGroup(faction: Faction) {
    const index = this.selectedFactions.indexOf(faction.id);
    if (index > -1) {
      this.selectedFactions.splice(index, 1);
    } else {
      this.selectedFactions.push(faction.id);
    }
  }

  protected applyFilters() {
    const request: EpisodeFilterRequest = {
      subforum_ids: this.selectedSubforums,
      character_ids: this.selectedCharacters.map(c => c.id),
      faction_ids: this.selectedFactions,
      page: this.currentPage
    };

    this.updateUrlParams();
    this.episodeService.loadEpisodeListPage(this.currentPage, request);
  }

  private updateUrlParams(): void {
    const queryParams: Record<string, string | number> = {};

    if (this.selectedSubforums.length > 0) {
      queryParams['subforums'] = this.selectedSubforums.join(',');
    }
    if (this.selectedCharacters.length > 0) {
      queryParams['characters'] = this.selectedCharacters.map(c => c.id).join(',');
    }
    if (this.selectedFactions.length > 0) {
      queryParams['factions'] = this.selectedFactions.join(',');
    }
    if (this.currentPage > 1) {
      queryParams['page'] = this.currentPage;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  protected readonly TopicStatus = TopicStatus;
}
