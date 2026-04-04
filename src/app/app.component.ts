import {Component, effect, inject, OnInit, computed, signal} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {FooterComponent} from './components/footer/footer.component';
import {NavlinksComponent} from './components/navlinks/navlinks.component';
import {filter, map, mergeMap} from 'rxjs';
import {ToastComponent} from './components/toast/toast.component';
import {BoardService} from './services/board.service';
import {AuthService} from './services/auth.service';
import {UserService} from './services/user.service';
import {NotificationsComponent} from './components/notifications/notifications.component';
import {NotificationService} from './services/notification.service';
import {ApiService} from './services/api.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent, NavlinksComponent, ToastComponent, NotificationsComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private authChannel = new BroadcastChannel('auth_channel');

  boardService = inject(BoardService);
  authService = inject(AuthService);
  private userService = inject(UserService);
  private apiService = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  headerPanelHtml = signal<SafeHtml>('');

  title = computed(() => this.boardService.board().site_name || 'Cuento');

  pageId = 'pun-main';
  currentUser = this.authService.currentUser;
  currentDate = new Date();
  private notificationService = inject(NotificationService);

  constructor() {
    this.listenForAuthChanges();
    this.setupRouteListener();

    // Effect to connect/disconnect notification service based on auth state
    effect(() => {
      const user = this.currentUser();
      const token = this.authService.authToken();
      if (user && user.id !== 0 && token) {
        this.notificationService.connect(token);
      } else {
        this.notificationService.disconnect();
      }
    });

    // Effect to apply font size
    effect(() => {
      const user = this.currentUser();
      if (user && user.interface_font_size) {
        const fontSize = user.interface_font_size;
        document.documentElement.style.fontSize = `${fontSize * 100}%`;
      } else {
        document.documentElement.style.fontSize = '100%';
      }
    });
  }

  ngOnInit() {
    this.boardService.loadBoard();
    this.apiService.getText('panel/header/content').subscribe({
      next: html => this.headerPanelHtml.set(this.sanitizer.bypassSecurityTrustHtml(html)),
      error: () => {}
    });
  }

  private setupRouteListener() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) route = route.firstChild;
        return route;
      }),
      mergeMap(route => {
        // We need both data and params
        return route.data.pipe(
          map(data => ({ data, params: route.snapshot.params }))
        );
      })
    ).subscribe(({ data, params }) => {
      this.pageId = data['pageId'] || 'pun-index';

      // Send page change notification
      let pageType = 'unknown';
      let pageId = 0;

      switch (this.pageId) {
        case 'pun-viewtopic':
          pageType = 'topic';
          pageId = +params['id'] || 0;
          break;
        case 'pun-viewforum':
          pageType = 'forum';
          pageId = +params['id'] || 0;
          break;
        case 'pun-index':
          pageType = 'home';
          break;
        case 'pun-profile':
          pageType = 'profile';
          pageId = +params['id'] || 0;
          break;
        case 'pun-character':
          pageType = 'character';
          pageId = +params['id'] || 0;
          break;
        default:
          pageType = this.pageId.replace('pun-', '');
      }

      this.notificationService.sendPageChange(pageType, pageId);
    });
  }

  private listenForAuthChanges(): void {
    this.authChannel.onmessage = (event) => {
      if (event.data === 'logout') {
        // When another tab logs out, update this tab's state without notifying back
        this.authService.clearLocalAuth(false);
      } else if (event.data === 'login') {
        // When another tab logs in, reload the page to get the new state.
        // Guard: if this tab is already authenticated, the message came from ourselves — skip reload.
        if (!this.authService.isAuthenticated()) {
          window.location.reload();
        }
      }
    };
  }

  protected readonly Date = Date;
}
