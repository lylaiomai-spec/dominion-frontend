import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveTopicsComponent } from './active-topics.component';

describe('ActiveTopicsComponent', () => {
  let component: ActiveTopicsComponent;
  let fixture: ComponentFixture<ActiveTopicsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveTopicsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActiveTopicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
