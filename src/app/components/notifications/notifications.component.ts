import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { NotificationData } from '../../models/event';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './notifications.component.html',
  standalone: true,
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  systemNotifications = this.notificationService.systemNotifications;
  gameNotifications = this.notificationService.gameNotifications;
  mentionNotifications = this.notificationService.mentionNotifications;

  activeModal: string | null = null;

  ngOnInit() {
    this.notificationService.loadUnreadNotifications();
  }

  openModal(type: string) {
    this.activeModal = type;
  }

  closeModal() {
    this.activeModal = null;
  }
}
