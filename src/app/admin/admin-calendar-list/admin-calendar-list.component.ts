import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalendarService } from '../../services/calendar.service';
import { CalendarOption } from '../../models/Calendar';

@Component({
  selector: 'app-admin-calendar-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-calendar-list.component.html',
})
export class AdminCalendarListComponent implements OnInit {
  private calendarService = inject(CalendarService);

  calendars: CalendarOption[] = [];

  ngOnInit() {
    this.calendarService.getOptions().subscribe({
      next: (data) => this.calendars = data,
      error: (err) => console.error('Failed to load calendars', err),
    });
  }
}
