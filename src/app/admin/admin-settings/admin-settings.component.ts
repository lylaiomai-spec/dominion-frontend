import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalSettingsService } from '../../services/global-settings.service';

type SaveState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-admin-settings',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css'
})
export class AdminSettingsComponent implements OnInit {
  private globalSettingsService = inject(GlobalSettingsService);

  settings = this.globalSettingsService.settings;
  saveState = signal<SaveState>('idle');

  ngOnInit() {
    this.globalSettingsService.loadSettings();
  }

  save() {
    this.saveState.set('loading');
    this.globalSettingsService.updateSettings(this.settings()).subscribe({
      next: () => this.flashState('success'),
      error: (err) => {
        console.error('Failed to save settings', err);
        this.flashState('error');
      }
    });
  }

  private flashState(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
