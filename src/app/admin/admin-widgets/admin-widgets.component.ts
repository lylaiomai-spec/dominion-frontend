import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface WidgetListItem {
  id: number;
  name: string;
  template_name: string;
}

@Component({
  selector: 'app-admin-widgets',
  imports: [RouterLink],
  templateUrl: './admin-widgets.component.html',
  standalone: true,
  styleUrl: './admin-widgets.component.css'
})
export class AdminWidgetsComponent implements OnInit {
  private apiService = inject(ApiService);

  widgets = signal<WidgetListItem[]>([]);

  ngOnInit() {
    this.apiService.get<WidgetListItem[]>('widget/list').subscribe({
      next: widgets => this.widgets.set(widgets),
      error: () => {}
    });
  }
}
