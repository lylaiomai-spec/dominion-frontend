import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterSheetHeaderComponent } from './character-sheet-header.component';
import { AuthService } from '../../services/auth.service';
import { CharacterService } from '../../services/character.service';
import { of } from 'rxjs';
import { Character } from '../../models/Character';
import { signal, WritableSignal } from '@angular/core';

describe('CharacterSheetHeaderComponent', () => {
  let component: CharacterSheetHeaderComponent;
  let fixture: ComponentFixture<CharacterSheetHeaderComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let characterServiceSpy: jasmine.SpyObj<CharacterService>;
  let isAdminSignal: WritableSignal<boolean>;

  const mockCharacter: Character = {
    id: 1,
    user_id: 1,
    name: 'Test Character',
    avatar: 'avatar.png',
    character_status: 0, // Active
    topic_id: 10,
    total_episodes: 5,
    factions: [{ id: 1, name: 'Faction A', parent_id: null, level: 0, description: null, icon: null, show_on_profile: true, characters: [] }],
    episodes: [],
    custom_fields: {
      custom_fields: {},
      field_config: []
    }
  };

  beforeEach(async () => {
    isAdminSignal = signal(false);
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      isAdmin: isAdminSignal
    });
    characterServiceSpy = jasmine.createSpyObj('CharacterService', ['acceptCharacter']);

    await TestBed.configureTestingModule({
      imports: [CharacterSheetHeaderComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CharacterService, useValue: characterServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CharacterSheetHeaderComponent);
    component = fixture.componentInstance;
    component.character = mockCharacter;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display character name', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Test Character');
  });

  it('should display factions', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Faction A');
  });

  it('should not show accept button for non-admin', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeNull();
  });

  it('should show accept button for admin in topic context with pending status', () => {
    isAdminSignal.set(true);
    component.character = { ...mockCharacter, character_status: 2 }; // Pending
    component.context = 'topic';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const acceptButton = Array.from(buttons).find(b => b.textContent?.includes('Accept'));

    expect(acceptButton).toBeTruthy();
  });

  it('should call acceptCharacter on click', () => {
    isAdminSignal.set(true);
    component.character = { ...mockCharacter, character_status: 2 };
    component.context = 'topic';
    fixture.detectChanges();

    characterServiceSpy.acceptCharacter.and.returnValue(of({}));

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const acceptButton = Array.from(buttons).find(b => b.textContent?.includes('Accept'));

    acceptButton?.click();
    expect(characterServiceSpy.acceptCharacter).toHaveBeenCalledWith(1);
  });
});
