import { afterNextRender, Component, computed, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { BoardService } from '../../services/board.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { ApiService } from '../../services/api.service';
import { NotificationsComponent } from '../notifications/notifications.component';
import { NavlinksComponent } from '../navlinks/navlinks.component';
import { UlinksComponent } from '../ulinks/ulinks.component';
import { RouterLinksDirective } from '../../directives/router-links.directive';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NavlinksComponent, UlinksComponent, NotificationsComponent, RouterLinksDirective],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private boardService = inject(BoardService);
  authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private apiService = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);
  private injector = inject(Injector);

  title = computed(() => this.boardService.board().site_name || 'Cuento');
  navlinksAfterHeader = computed(() => this.boardService.board().visual_navlinks_after_header_panel === 'y');
  currentUser = this.authService.currentUser;
  headerPanelHtml = signal<SafeHtml>('');

  private widgetRefreshIntervals: ReturnType<typeof setInterval>[] = [];
  private panelReloadSub?: Subscription;
  private panelLinkHandler: ((e: MouseEvent) => void) | null = null;

  ngOnInit() {
    this.load();

    this.panelReloadSub = this.notificationService.panelReload$.subscribe(event => {
      if (event.panel_name === 'header') {
        this.load();
      }
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy() {
    this.panelReloadSub?.unsubscribe();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.widgetRefreshIntervals.forEach(id => clearInterval(id));
  }

  load() {
    this.apiService.getText('panel/header/content').subscribe({
      next: html => {
        this.headerPanelHtml.set(this.sanitizer.bypassSecurityTrustHtml(html));
        afterNextRender(() => this.processPanel(), { injector: this.injector });
      },
      error: () => {}
    });
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.authService.isAuthenticated()) {
      this.load();
    }
  };

  private processPanel() {
    this.widgetRefreshIntervals.forEach(id => clearInterval(id));
    this.widgetRefreshIntervals = [];

    const panel = document.getElementById('header-widget-panel');
    if (!panel) return;

    if (this.panelLinkHandler) panel.removeEventListener('click', this.panelLinkHandler);
    this.panelLinkHandler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.('a') as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (target.hostname !== window.location.hostname) return;
      e.preventDefault();
      this.router.navigateByUrl(target.pathname + target.search + target.hash);
    };
    panel.addEventListener('click', this.panelLinkHandler);

    panel.querySelectorAll<HTMLElement>('[data-is-link="true"]').forEach(widget => {
      this.attachWidgetLinks(widget);
    });

    panel.querySelectorAll<HTMLElement>('[data-refresh-interval][data-widget-id]').forEach(widget => {
      const intervalSeconds = +(widget.getAttribute('data-refresh-interval') ?? 0);
      const widgetId = widget.getAttribute('data-widget-id');
      if (!intervalSeconds || !widgetId) return;

      const isLink = widget.getAttribute('data-is-link') === 'true';
      const id = setInterval(() => {
        this.apiService.getText(`widget/${widgetId}/render?innerOnly=true`).subscribe({
          next: innerHtml => {
            widget.innerHTML = innerHtml;
            if (isLink) this.attachWidgetLinks(widget);
          },
          error: () => {}
        });
      }, intervalSeconds * 1000);
      this.widgetRefreshIntervals.push(id);
    });
  }

  private attachWidgetLinks(widget: HTMLElement) {
    widget.querySelectorAll<HTMLElement>('[data-entity-type][data-entity-id]').forEach(child => {
      const entityType = child.getAttribute('data-entity-type');
      const entityId = child.getAttribute('data-entity-id');
      if (!entityType || !entityId) return;

      const route = this.entityRoute(entityType, +entityId);
      if (!route) return;

      child.style.cursor = 'pointer';
      child.addEventListener('click', () => this.router.navigate(route));
    });
  }

  private entityRoute(entityType: string, entityId: number): any[] | null {
    switch (entityType) {
      case 'character': return ['/character', entityId];
      case 'topic':
      case 'episode':
      case 'wanted_character': return ['/viewtopic', entityId];
      case 'user': return ['/profile', entityId];
      default: return null;
    }
  }
}
