import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  template: `
    @if (message) {
      <div class="alert alert-error">{{ message }}</div>
    }
  `,
})
export class ErrorBannerComponent {
  @Input() message: string | null = null;
}
