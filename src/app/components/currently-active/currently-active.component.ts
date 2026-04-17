import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UserShort } from '../../models/UserShort';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-currently-active',
  imports: [RouterLink],
  templateUrl: './currently-active.component.html',
  standalone: true,
})
export class CurrentlyActiveComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private destroy$ = new Subject<void>();

  users = signal<UserShort[]>([]);

  private visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      this.fetchActiveUsers();
    }
  };

  ngOnInit() {
    this.fetchActiveUsers();

    this.notificationService.activeUsersUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.users.set(event.data);
      });

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchActiveUsers() {
    this.apiService.get<UserShort[]>('active-users').subscribe(users => {
      this.users.set(users);
    });
  }
}
