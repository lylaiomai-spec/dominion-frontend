import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface RecentUser {
  id: number;
  username: string;
}

interface RecentCharacter {
  id: number;
  name: string;
}

@Component({
  selector: 'app-recently-active',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './recently-active.component.html',
})
export class RecentlyActiveComponent implements OnInit {
  private apiService = inject(ApiService);

  mode = signal<'users' | 'characters'>('users');
  users = signal<RecentUser[]>([]);
  characters = signal<RecentCharacter[]>([]);

  ngOnInit() {
    this.apiService.get<RecentUser[]>('user/recent').subscribe(data => this.users.set(data));
    this.apiService.get<RecentCharacter[]>('character/recent').subscribe(data => this.characters.set(data));
  }

  setMode(m: 'users' | 'characters') {
    this.mode.set(m);
  }
}
