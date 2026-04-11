import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeatureService } from '../../services/feature.service';

@Component({
  selector: 'app-admin-features',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-features.component.html',
  styleUrl: './admin-features.component.css',
})
export class AdminFeaturesComponent implements OnInit {
  private featureService = inject(FeatureService);

  features = this.featureService.features;

  ngOnInit(): void {
    this.featureService.loadFeatures();
  }

  toggle(key: string): void {
    this.featureService.toggle(key);
  }
}
