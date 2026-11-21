import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AddTransactionModalComponent } from './add-transaction-modal.component';
import { ApiService } from '../../services/api.service';

describe('AddTransactionModalComponent type options', () => {
  let fixture: ComponentFixture<AddTransactionModalComponent>;
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'post']);
    api.get.and.returnValue(of([
      { key: 'currency_spend_auto_archiving_immunity', name: 'Auto-archiving immunity', description: '', amount: 1, is_active: true },
    ]) as any);
    api.post.and.returnValue(of({}) as any);

    await TestBed.configureTestingModule({
      imports: [AddTransactionModalComponent],
      providers: [{ provide: ApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTransactionModalComponent);
    fixture.componentInstance.userId = 7;
    fixture.componentInstance.incomeTypes = [
      { key: 'currency_income_game_post', name: 'Game post', description: '', amount: 1, is_active: true },
    ];
    fixture.detectChanges();
    await fixture.whenStable();
  });

  async function select(id: string, value: string) {
    const el: HTMLSelectElement = fixture.nativeElement.querySelector(id);
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function optionTexts(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('#tx-income-type option') as NodeListOf<HTMLOptionElement>)
      .map(o => o.textContent!.trim());
  }

  function typeLabel(): string {
    return fixture.nativeElement.querySelector('label[for="tx-income-type"]').textContent.trim();
  }

  it('lists income types for income', () => {
    expect(typeLabel()).toBe('Income Type');
    expect(optionTexts()).toEqual(['— None —', 'Game post', 'Custom']);
  });

  it('lists spend types for spend and clears the chosen income type', async () => {
    await select('#tx-income-type', 'currency_income_game_post');
    await select('#tx-type', 'spend');

    expect(typeLabel()).toBe('Spend Type');
    expect(optionTexts()).toEqual(['— None —', 'Auto-archiving immunity', 'Custom']);
    expect(fixture.nativeElement.querySelector('#tx-income-type').value).toBe('');
  });

  it('submits the chosen spend type', async () => {
    await select('#tx-type', 'spend');
    await select('#tx-income-type', 'currency_spend_auto_archiving_immunity');
    fixture.componentInstance.amount = 3;
    fixture.componentInstance.onSubmit();

    expect(api.post).toHaveBeenCalledWith('currency/user/7/transactions/add', jasmine.objectContaining({
      type: 'spend', amount: 3, income_type_key: 'currency_spend_auto_archiving_immunity',
    }));
  });
});
