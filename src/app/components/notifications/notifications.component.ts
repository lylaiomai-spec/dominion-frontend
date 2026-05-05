import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { NotificationData } from '../../models/event';
import { Router, RouterLink } from '@angular/router';
import { DirectChatService } from '../../services/direct-chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './notifications.component.html',
  standalone: true,
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private directChatService = inject(DirectChatService);
  private authService = inject(AuthService);
  private router = inject(Router);

  systemNotifications = this.notificationService.systemNotifications;
  gameNotifications = this.notificationService.gameNotifications;
  mentionNotifications = this.notificationService.mentionNotifications;
  directMessageNotifications = this.notificationService.directMessageNotifications;
  reactionNotifications = this.notificationService.reactionNotifications;
  dmNotifications = computed(() => this.directChatService.chatList().filter(c => c.unread_count > 0));

  activeModal = signal<string | null>(null);

  constructor() {
    effect(() => {
      const modal = this.activeModal();
      if (!modal) return;
      if (this.getNotificationsForType(modal)().length === 0) {
        this.activeModal.set(null);
      }
    }, { allowSignalWrites: true });
  }

  private getNotificationsForType(type: string): () => unknown[] {
    switch (type) {
      case 'system': return this.systemNotifications;
      case 'game': return this.gameNotifications;
      case 'mention': return this.mentionNotifications;
      case 'direct_message': return this.directMessageNotifications;
      case 'reaction': return this.reactionNotifications;
      case 'dm': return this.dmNotifications;
      default: return () => [];
    }
  }

  ngOnInit() {
    this.notificationService.loadUnreadNotifications();
    this.directChatService.loadChatList();
  }

  openModal(type: string) {
    this.activeModal.set(type);
  }

  closeModal() {
    this.activeModal.set(null);
  }

  dismissNotification(notification: NotificationData, event: MouseEvent) {
    event.stopPropagation();
    this.notificationService.dismissNotification(notification);
  }

  dismissAll(event: MouseEvent) {
    event.stopPropagation();
    const modal = this.activeModal();
    if (!modal) return;
    const list = this.getNotificationsForType(modal)() as NotificationData[];
    list.forEach(n => this.notificationService.dismissNotification(n));
  }

  onNotificationClick(item: NotificationData) {
    this.notificationService.dismissNotification(item);
    this.closeModal();
  }

  isTypeDisabled(type: string): boolean {
    return this.authService.currentUser()?.notification_settings
      ?.find(s => s.notification_type === type)?.disable_all ?? false;
  }
}
