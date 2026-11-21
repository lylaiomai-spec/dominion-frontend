import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AiChatComponent } from './ai-chat.component';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { AiMessageData } from '../models/event';
import { aiNotification } from '../services/notification.service.spec';

describe('AiChatComponent AI message notifications', () => {
  let fixture: ComponentFixture<AiChatComponent>;
  let api: jasmine.SpyObj<ApiService>;
  let notifications: NotificationService;

  const history: AiMessageData[] = [
    { id: 30, role: 'user', content: 'question', date: '16 Nov 2026 10:00 AM' } as AiMessageData,
    { id: 31, role: 'assistant', content: '<p>answer</p>', date: '16 Nov 2026 10:01 AM' } as AiMessageData
  ];

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.callFake(((url: string) => url === 'ai-chat/history'
      ? of(history)
      : of({ system: [], ai_message: [aiNotification(1, 31), aiNotification(2, 40)] })) as any);
    api.post.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [AiChatComponent, HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: api }]
    }).compileComponents();

    notifications = TestBed.inject(NotificationService);
    notifications.loadUnreadNotifications();
    fixture = TestBed.createComponent(AiChatComponent);
    fixture.detectChanges();
  });

  function dismissedIds(): string[] {
    return api.post.calls.allArgs().map(args => args[0]).filter(url => url.startsWith('notifications/dismiss/'));
  }

  it('dismisses the notification for an AI message in the loaded history', () => {
    expect(dismissedIds()).toEqual(['notifications/dismiss/1']);
    expect(notifications.systemNotifications().map(n => n.id)).toEqual([2]);
  });

  it('dismisses the notification for an AI message that arrives while the chat is open', () => {
    (notifications as any).aiMessageSubject.next({
      type: 'ai_message',
      data: { id: 40, role: 'assistant', content: '<p>hello</p>', date: '16 Nov 2026 10:05 AM' }
    });
    fixture.detectChanges();

    expect(dismissedIds()).toEqual(['notifications/dismiss/1', 'notifications/dismiss/2']);
    expect(notifications.systemNotifications()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('hello');
  });

  function metadataTexts(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.message-metadata') as NodeListOf<HTMLElement>)
      .map(el => el.textContent!.trim());
  }

  function send(text: string) {
    fixture.nativeElement.querySelector('#ai-chat-input').value = text;
    fixture.componentInstance.handleSend();
    fixture.detectChanges();
  }

  it('shows the server-localized date under each history message', () => {
    expect(metadataTexts()).toEqual(['16 Nov 2026 10:00 AM', '16 Nov 2026 10:01 AM']);
  });

  it('shows the date returned by the server under a sent message', () => {
    api.post.and.callFake(((url: string) => url === 'ai-chat/message'
      ? of({ queue_position: 0, date: 'Today 9:15 AM' })
      : of({})) as any);

    send('new question');

    expect(metadataTexts()).toEqual(['16 Nov 2026 10:00 AM', '16 Nov 2026 10:01 AM', 'Today 9:15 AM']);
  });

  it('shows the date sent with an AI error', () => {
    (notifications as any).aiErrorSubject.next({ type: 'ai_error', data: { error: 'boom', date: 'Today 9:20 AM' } });
    fixture.detectChanges();

    expect(metadataTexts()).toEqual(['16 Nov 2026 10:00 AM', '16 Nov 2026 10:01 AM', 'Today 9:20 AM']);
  });

  it('renders no date label when sending fails because AI is unavailable', () => {
    api.post.and.callFake(((url: string) => url === 'ai-chat/message'
      ? throwError(() => ({ status: 503 }))
      : of({})) as any);

    send('new question');

    expect(fixture.nativeElement.textContent).toContain('AI is currently unavailable');
    expect(metadataTexts()).toEqual(['16 Nov 2026 10:00 AM', '16 Nov 2026 10:01 AM']);
  });
});
