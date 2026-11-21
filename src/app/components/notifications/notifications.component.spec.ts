import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { ApiService } from '../../services/api.service';
import { aiNotification } from '../../services/notification.service.spec';

describe('NotificationsComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('NotificationsComponent AI message notifications', () => {
  let fixture: ComponentFixture<NotificationsComponent>;

  beforeEach(async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.callFake(((url: string) => url === 'notifications/unread'
      ? of({ system: [], ai_message: [aiNotification(1, 10)] })
      : of([])) as any);
    api.post.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [NotificationsComponent, HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: api }, provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
  });

  it('counts the AI message under system messages and links it to the AI chat', () => {
    const block: HTMLElement = fixture.nativeElement.querySelector('.system-messages');
    expect(block.querySelector('.count')?.textContent?.trim()).toBe('1');

    block.click();
    fixture.detectChanges();

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.feed-item a');
    expect(link.textContent?.trim()).toBe('You have a message from AI');
    expect(link.getAttribute('href')).toBe('/ai-chat');
  });
});
