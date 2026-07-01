import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MonitorService } from '../services/monitor.service';

@Component({
  selector: 'app-recovery-codes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recovery-codes.component.html',
})
export class RecoveryCodesComponent implements OnInit {
  codes: string[] = [];

  private router = inject(Router);
  private monitor = inject(MonitorService);

  ngOnInit() {
    const state = history.state;
    if (!state?.codes?.length) {
      this.router.navigate(['/']);
      return;
    }
    this.codes = state.codes;
    this.monitor.track('recovery_codes_viewed');
  }
}
