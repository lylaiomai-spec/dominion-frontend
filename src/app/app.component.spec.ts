import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { BoardService } from './services/board.service';
import { signal } from '@angular/core';

describe('AppComponent', () => {
  let boardServiceSpy: jasmine.SpyObj<BoardService>;

  beforeEach(async () => {
    boardServiceSpy = jasmine.createSpyObj('BoardService', ['loadBoard'], {
      board: signal({ site_name: 'Cuento', domain: '', total_user_number: 0, total_character_number: 0, total_topic_number: 0, total_post_number: 0, total_episode_number: 0, total_episode_post_number: 0, last_registered_user: null })
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [
        { provide: BoardService, useValue: boardServiceSpy }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'Cuento' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title()).toEqual('Cuento');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Cuento');
  });
});
