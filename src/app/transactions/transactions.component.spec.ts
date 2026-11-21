import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TransactionsComponent } from './transactions.component';
import { ApiService } from '../services/api.service';
import { FeatureService } from '../services/feature.service';
import { CurrencyTransaction } from '../models/Currency';

describe('TransactionsComponent transaction labels', () => {
  let fixture: ComponentFixture<TransactionsComponent>;

  function tx(id: number, type: number, key: string | null, note?: string): CurrencyTransaction {
    return {
      id, user_id: 7, type, amount: 5, datetime: '', datetime_localized: '18 Nov 2026 9:00 AM', status: 1,
      income_type_key: key, metadata: note ? { note } : null,
    };
  }

  const items: CurrencyTransaction[] = [
    tx(1, 1, 'currency_income_manual_transaction', 'event prize'),
    tx(2, -1, 'currency_spend_manual_transaction'),
    tx(3, 1, 'currency_income_500_game_posts'),
    tx(4, -1, 'currency_spend_auto_archiving_immunity'),
    tx(5, 1, 'currency_income_future_type'),
    tx(6, 1, null, 'legacy'),
  ];

  beforeEach(async () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.callFake(((url: string) => url === 'features'
      ? of([{ key: 'currency', name: '', description: '', is_active: true }])
      : of({ items, total_pages: 1, can_add: false })) as any);

    await TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ user_id: '7' })), queryParamMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();

    TestBed.inject(FeatureService).loadFeatures().subscribe();
    fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();
  });

  function labels(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.tx-type') as NodeListOf<HTMLElement>)
      .map(el => el.textContent!.replace(/\s+/g, ' ').trim());
  }

  it('names every transaction type and appends the note when present', () => {
    expect(labels()).toEqual([
      'Manual income (event prize)',
      'Manual spend',
      '500 game posts',
      'Auto-archiving immunity',
      'currency_income_future_type',
      'Manual (legacy)',
    ]);
  });
});
