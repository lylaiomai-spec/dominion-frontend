import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ToastComponent } from './toast.component';
import { aiNotification } from '../../services/notification.service.spec';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ToastComponent AI message notifications', () => {
  let fixture: ComponentFixture<ToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent, HttpClientTestingModule],
      providers: [provideRouter([]), provideNoopAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    fixture.componentInstance.notifications = [aiNotification(1, 10)];
    fixture.detectChanges();
  });

  it('shows an AI label and a link to the AI chat', () => {
    expect(fixture.nativeElement.querySelector('.toast-label').textContent.trim()).toBe('AI');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.toast-content a');
    expect(link.textContent?.trim()).toBe('You have a message from AI');
    expect(link.getAttribute('href')).toBe('/ai-chat');
  });
});
