import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CharacterProfile } from '../models/Character';
import { EpisodeListItem } from '../models/Episode';
import { MaskService } from '../services/mask.service';
import { TopicStatus } from '../models/Topic';

@Component({
  selector: 'app-mask-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mask-page.component.html',
})
export class MaskPageComponent implements OnInit {
  @Input({ required: true }) id!: number;

  private maskService = inject(MaskService);

  mask = signal<CharacterProfile | null>(null);
  episodes = signal<EpisodeListItem[]>([]);
  currentPage = signal<number>(1);
  totalPages = signal<number>(1);
  isLoadingMask = signal<boolean>(true);
  isLoadingEpisodes = signal<boolean>(true);

  readonly defaultOrder = ['-last_post_date'];
  readonly TopicStatus = TopicStatus;

  ngOnInit(): void {
    this.maskService.getMask(this.id).subscribe({
      next: (data) => {
        this.mask.set(data);
        this.isLoadingMask.set(false);
      },
      error: (err) => {
        console.error('Failed to load mask', err);
        this.isLoadingMask.set(false);
      }
    });

    this.loadEpisodes();
  }

  private loadEpisodes(): void {
    this.isLoadingEpisodes.set(true);
    this.maskService.getEpisodesByMask({
      mask_id: this.id,
      page: this.currentPage(),
      order: this.defaultOrder
    }).subscribe({
      next: (data) => {
        this.episodes.set(data.items);
        this.totalPages.set(data.total_pages);
        this.isLoadingEpisodes.set(false);
      },
      error: (err) => {
        console.error('Failed to load episodes for mask', err);
        this.isLoadingEpisodes.set(false);
      }
    });
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadEpisodes();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
      this.loadEpisodes();
    }
  }

  getCustomFields(mask: CharacterProfile): { fieldName: string; fieldValue: any; type: string }[] {
    if (!mask.custom_fields?.field_config) return [];
    return mask.custom_fields.field_config
      .sort((a, b) => a.order - b.order)
      .map(config => {
        const field = mask.custom_fields.custom_fields?.[config.machine_field_name];
        return {
          fieldName: config.human_field_name,
          fieldValue: config.content_field_type === 'long_text' ? field?.content_html : field?.content,
          type: config.content_field_type
        };
      });
  }
}
