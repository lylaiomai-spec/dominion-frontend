import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);

  language: string = 'en-US';
  timezone: string = 'UTC';
  avatarUrl = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';

  timezones: string[] = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00',
    'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:00',
    'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00',
    'UTC+03:00', 'UTC+04:00', 'UTC+05:00', 'UTC+06:00', 'UTC+07:00',
    'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];

  ngOnInit() {
    this.avatarUrl = this.authService.currentUser()?.avatar || '';
  }

  onSubmit(event: Event) {
    event.preventDefault();
    console.log('Settings saved:', {
      language: this.language,
      timezone: this.timezone,
      avatarUrl: this.avatarUrl,
      passwords: {
        old: this.oldPassword,
        new: this.newPassword
      }
    });
  }
}
