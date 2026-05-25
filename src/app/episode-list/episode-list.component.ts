import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {EpisodeFilterRequest} from '../models/Episode';
import {CharacterShort} from '../models/Character';
import {FormsModule} from '@angular/forms';
import {TopicStatus} from '../models/Topic';
import {EpisodeService} from '../services/episode.service';
import {CharacterService} from '../services/character.service';
import {FactionService} from '../services/faction.service';
import {FactionSettingService} from '../services/faction-setting.service';
import {CommonModule} from '@angular/common';
import {debounceTime, distinctUntilChanged, forkJoin, Subject} from 'rxjs';
import {Faction} from '../models/Faction';

const FIXED_COLUMNS = [
  { key: 'name', label: $localize`:@@episodelist.topicTitle:Topic Title` },
  { key: 'subforum_name', label: $localize`:@@episodelist.subforum:Subforum` },
  { key: 'topic_status', label: $localize`:@@episodelist.status:Status` },
  { key: 'last_post_date', label: $localize`:@@episodelist.dateLastPost:Last Post Date` },
  { key: 'characters', label: $localize`:@@episodelist.characters:Characters` },
];

@Component({
  selector: 'app-episode-list',
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './episode-list.component.html',
  standalone: true,
})
export class EpisodeListComponent implements OnInit {
  protected episodeService = inject(EpisodeService);
  protected characterService = inject(CharacterService);
  protected factionService = inject(FactionService);
  private factionSettingService = inject(FactionSettingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected currentPage: number = 1;
  protected totalPages: number = 1;
  protected topics = this.episodeService.episodeListPage;
  protected episodeTemplate = this.episodeService.episodeTemplate;
  protected selectedCharacters: CharacterShort[] = [];
  protected selectedSubforums: number[] = [];
  protected selectedFactions: number[] = [];
  protected searchQuery: string = '';
  protected characterSearchQuery: string = '';
  protected subforums = this.episodeService.subforumList;
  protected characterSuggestions = this.characterService.shortCharacterList;
  protected factions = this.factionService.factions;
  protected order = signal<string[]>(['name']);

  protected visibleColumns = signal<string[]>(['name', 'subforum_name', 'topic_status', 'last_post_date', 'characters']);

  protected allColumns = computed(() => [
    ...FIXED_COLUMNS,
    ...this.episodeTemplate()
      .filter(f => !['long_text', 'image', 'cropped_image'].includes(f.content_field_type))
      .map(f => ({ key: f.machine_field_name, label: f.human_field_name }))
  ]);

  private characterSearchTerms = new Subject<string>();

  protected factionsHeader = computed(() => {
    const setting = this.factionSettingService.factionSettings()
      .find(s => s.level === 0 && s.parent_faction_id === null);
    return setting?.human_name ?? $localize`:@@episodelist.factions:Фракции участников`;
  });

  constructor() {
    this.episodeService.loadSubforumList();
    this.episodeService.loadEpisodeTemplate();
    this.factionService.loadFactions();
    this.factionSettingService.load();
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

    const orderParam = params.get('order');
    if (orderParam) {
      this.order.set(orderParam.split(','));
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

  protected isColumnVisible(key: string): boolean {
    return this.visibleColumns().includes(key);
  }

  protected toggleColumn(key: string): void {
    this.visibleColumns.update(cols =>
      cols.includes(key) ? cols.filter(c => c !== key) : [...cols, key]
    );
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

  protected setOrder(col: string): void {
    this.order.update(current => {
      const withoutCol = current.filter(o => o !== col && o !== '-' + col);
      if (current.includes(col)) {
        return [...withoutCol, '-' + col];
      } else if (current.includes('-' + col)) {
        return withoutCol;
      } else {
        return [...withoutCol, col];
      }
    });
    this.currentPage = 1;
    this.applyFilters();
  }

  protected orderIcon(col: string): string {
    const current = this.order();
    if (current.includes(col)) return '▲';
    if (current.includes('-' + col)) return '▼';
    return '⇅';
  }

  protected applyFilters() {
    const request: EpisodeFilterRequest = {
      subforum_ids: this.selectedSubforums,
      character_ids: this.selectedCharacters.map(c => c.id),
      faction_ids: this.selectedFactions,
      page: this.currentPage,
      order: this.order()
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
    if (this.order().length > 0) {
      queryParams['order'] = this.order().join(',');
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      replaceUrl: true
    });
  }

  protected readonly TopicStatus = TopicStatus;
}
