import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';

@Component({
  selector: '[app-ulinks]',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ulinks.component.html',
})
export class UlinksComponent {
  private authService = inject(AuthService);
  private boardService = inject(BoardService);

  public isAuthenticated = this.authService.isAuthenticated;
  public showAutoArchiveLink = computed(() => this.boardService.board().auto_archiving_show_page_link === 'y');
  public showShopLink = computed(() => this.boardService.board().features?.['currency'] === 1);
}
