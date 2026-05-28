import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-wrapper',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './admin-wrapper.component.html',
  styleUrl: './admin-wrapper.component.css'
})
export class AdminWrapperComponent {
  openGroups = signal<Set<string>>(new Set(['general']));

  isOpen(group: string): boolean {
    return this.openGroups().has(group);
  }

  toggleGroup(group: string) {
    const current = new Set(this.openGroups());
    if (current.has(group)) {
      current.delete(group);
    } else {
      current.add(group);
    }
    this.openGroups.set(current);
  }
}
