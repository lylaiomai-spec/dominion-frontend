import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { NotificationService } from './notification.service';
import { ApiService } from './api.service';
import { NotificationData, UnreadNotificationsResponse } from '../models/event';

export function aiNotification(id: number, messageId: number): NotificationData {
  return {
    id,
    user_id: 2,
    type: 'ai_message',
    title: 'You have a message from AI',
    message: 'You have a message from AI.',
    date_created: '2026-11-16T10:00:00Z',
    date_created_localized: '16.11.2026 10:00',
    is_read: false,
    mention: null,
    game: null,
    direct_message: null,
    data: { message_id: messageId }
  };
}

describe('NotificationService AI message notifications', () => {
  let service: NotificationService;
  let api: jasmine.SpyObj<ApiService>;

  const unread = { system: [], ai_message: [aiNotification(1, 10), aiNotification(2, 11)] } as unknown as UnreadNotificationsResponse;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(of(unread));
    api.post.and.returnValue(of({}));

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: api }]
    });
    service = TestBed.inject(NotificationService);
  });

  function receive(n: NotificationData) {
    (service as any).handleNotification({ type: 'notification', data: n });
  }

  it('lists unread AI message notifications under system messages', () => {
    service.loadUnreadNotifications();

    expect(service.systemNotifications().map(n => [n.id, n.type])).toEqual([[1, 'ai_message'], [2, 'ai_message']]);
  });

  it('dismisses only the notifications whose messages were shown', () => {
    service.loadUnreadNotifications();

    service.checkAiMessageIds([10, 99]);

    expect(api.post.calls.allArgs().map(args => args[0])).toEqual(['notifications/dismiss/1']);
    expect(service.systemNotifications().map(n => n.id)).toEqual([2]);
  });

  it('dismisses a live notification whose message is already shown, without a toast', () => {
    const toasts: NotificationData[] = [];
    service.notification$.subscribe(n => toasts.push(n));
    service.checkAiMessageIds([20]);

    receive(aiNotification(5, 20));

    expect(api.post).toHaveBeenCalledWith('notifications/dismiss/5', {});
    expect(service.systemNotifications()).toEqual([]);
    expect(toasts).toEqual([]);
  });

  it('keeps and toasts a live notification whose message has not been shown', () => {
    const toasts: NotificationData[] = [];
    service.notification$.subscribe(n => toasts.push(n));

    receive(aiNotification(6, 21));

    expect(service.systemNotifications().map(n => n.id)).toEqual([6]);
    expect(toasts.map(n => n.id)).toEqual([6]);
    expect(api.post).not.toHaveBeenCalled();

    service.checkAiMessageIds([21]);
    expect(service.systemNotifications()).toEqual([]);
  });
});
