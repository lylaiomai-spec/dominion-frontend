import { Component, inject, OnInit } from '@angular/core';
import { Notification } from '../../models/Notification';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';
import { NotificationData } from '../../models/event';

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  standalone: true,
  styleUrl: './toast.component.css'
})
export class ToastComponent implements OnInit {
  private notificationService = inject(NotificationService);
  notifications: Notification[] = [];

  ngOnInit() {
    this.notificationService.notification$.subscribe((event: NotificationData) => {
      const newNotification: Notification = {
        id: event.id,
        title: event.title,
        message: event.message,
        from: event.type
      };

      this.notifications.push(newNotification);

      // Auto-dismiss after 5 minutes (300000 ms)
      setTimeout(() => {
        this.remove(newNotification.id);
      }, 300000);
    });
  }

  remove(toastId: number) {
    this.notifications = this.notifications.filter(n => n.id !== toastId);
  }
}
