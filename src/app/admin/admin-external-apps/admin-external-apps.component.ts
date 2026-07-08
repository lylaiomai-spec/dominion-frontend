import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExternalAppService } from '../../services/external-app.service';
import { ExternalApp } from '../../models/ExternalApp';

@Component({
  selector: 'app-admin-external-apps',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-external-apps.component.html',
})
export class AdminExternalAppsComponent implements OnInit {
  private externalAppService = inject(ExternalAppService);

  apps: ExternalApp[] = [];

  ngOnInit() {
    this.externalAppService.list().subscribe({
      next: (data) => this.apps = data,
      error: (err) => console.error('Failed to load external apps', err),
    });
  }
}
