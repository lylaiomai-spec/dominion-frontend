import { Component, computed, inject, LOCALE_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardService } from '../../services/board.service';

@Component({
  selector: '[app-footer]',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  standalone: true,
})
export class FooterComponent {
  private boardService = inject(BoardService);
  private locale = inject(LOCALE_ID);

  private readonly languageLabel = $localize`:@@rating.language:Language`;
  private readonly violenceLabel = $localize`:@@rating.violence:Violence`;
  private readonly sexLabel = $localize`:@@rating.sexContent:Sexual Content`;

  private readonly languageLabels: Record<string, string> = {
    L0: $localize`:@@rating.L0:No swearing permitted.`,
    L1: $localize`:@@rating.L1:Infrequent, mild swearing is permitted.`,
    L2: $localize`:@@rating.L2:Swearing is permitted, with some limitations.`,
    L3: $localize`:@@rating.L3:Swearing and mature language is permitted.`,
  };

  private readonly violenceLabels: Record<string, string> = {
    V0: $localize`:@@rating.V0:No violence permitted.`,
    V1: $localize`:@@rating.V1:Mild violence is permitted.`,
    V2: $localize`:@@rating.V2:Violence is permitted, with some limitations.`,
    V3: $localize`:@@rating.V3:Explicit violence is permitted.`,
  };

  private readonly sexLabels: Record<string, string> = {
    S0: $localize`:@@rating.S0:No sexual content is permitted.`,
    S1: $localize`:@@rating.S1:Mild sexual innuendo and references permitted.`,
    S2: $localize`:@@rating.S2:Sexual content is permitted, with some limitations.`,
    S3: $localize`:@@rating.S3:Sexual content may be described in detail.`,
  };

  siteName = computed(() => this.boardService.board().site_name || 'Cuento');
  privacyPolicyUrl = this.locale === 'ru-RU'
    ? 'https://cuento.ca/ru/docs/privacy-policy/'
    : 'https://cuento.ca/docs/privacy-policy/';

  useRatingSystem = computed(() => this.boardService.board().use_rating_system === 'y');

  maxRating = computed(() => this.boardService.board().site_max_rating ?? '');

  ratingTooltip = computed(() => {
    const rating = this.maxRating();
    if (!rating) return '';

    const lMatch = rating.match(/L\d/)?.[0];
    const vMatch = rating.match(/V\d/)?.[0];
    const sMatch = rating.match(/S\d/)?.[0];

    const parts: string[] = [];
    if (lMatch) parts.push(`${this.languageLabel} (${lMatch}): ${this.languageLabels[lMatch] ?? ''}`);
    if (vMatch) parts.push(`${this.violenceLabel} (${vMatch}): ${this.violenceLabels[vMatch] ?? ''}`);
    if (sMatch) parts.push(`${this.sexLabel} (${sMatch}): ${this.sexLabels[sMatch] ?? ''}`);

    return parts.join('\n');
  });
}
