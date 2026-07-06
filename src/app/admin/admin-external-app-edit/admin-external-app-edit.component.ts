import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ExternalAppService } from '../../services/external-app.service';
import { ExternalApp } from '../../models/ExternalApp';
import { SaveButtonComponent, SaveState } from '../save-button/save-button.component';

@Component({
  selector: 'app-admin-external-app-edit',
  standalone: true,
  imports: [FormsModule, RouterLink, SaveButtonComponent],
  templateUrl: './admin-external-app-edit.component.html',
  styleUrl: './admin-external-app-edit.component.css',
})
export class AdminExternalAppEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private externalAppService = inject(ExternalAppService);

  app: ExternalApp | null = null;
  isNew = false;

  name = '';
  status = true;
  userId: number | null = null;

  saveState: SaveState = 'idle';

  permissions: string[] = [];
  newPermission = '';
  permSaveState: SaveState = 'idle';

  ngOnInit() {
    const raw = this.route.snapshot.paramMap.get('id');
    if (raw === 'new') {
      this.isNew = true;
    } else {
      const id = Number(raw);
      this.externalAppService.list().subscribe({
        next: (apps) => {
          const found = apps.find(a => a.id === id) ?? null;
          this.app = found;
          if (found) {
            this.name = found.name;
            this.status = found.status;
            this.userId = found.user_id;
          }
        },
        error: (err) => console.error('Failed to load app', err),
      });
      this.externalAppService.getPermissions(id).subscribe({
        next: (data) => this.permissions = data,
        error: (err) => console.error('Failed to load permissions', err),
      });
    }
  }

  submit() {
    this.saveState = 'loading';
    if (this.isNew) {
      this.externalAppService.create(this.name).subscribe({
        next: (created) => {
          this.saveState = 'success';
          setTimeout(() => {
            this.saveState = 'idle';
            this.router.navigate(['/admin/external-app', created.id]);
          }, 1500);
        },
        error: (err) => {
          console.error('Failed to create external app', err);
          this.saveState = 'error';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
      });
    } else {
      this.externalAppService.update(this.app!.id, {
        name: this.name,
        status: this.status,
        user_id: this.userId,
      }).subscribe({
        next: (updated) => {
          this.app = updated;
          this.saveState = 'success';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
        error: (err) => {
          console.error('Failed to save external app', err);
          this.saveState = 'error';
          setTimeout(() => (this.saveState = 'idle'), 3000);
        },
      });
    }
  }

  addPermission() {
    const perm = this.newPermission.trim();
    if (!perm) return;
    this.permSaveState = 'loading';
    this.externalAppService.addPermission(this.app!.id, perm).subscribe({
      next: () => {
        this.permissions = [...this.permissions, perm];
        this.newPermission = '';
        this.permSaveState = 'idle';
      },
      error: (err) => {
        console.error('Failed to add permission', err);
        this.permSaveState = 'error';
        setTimeout(() => (this.permSaveState = 'idle'), 3000);
      },
    });
  }

  removePermission(perm: string) {
    this.externalAppService.removePermission(this.app!.id, perm).subscribe({
      next: () => {
        this.permissions = this.permissions.filter(p => p !== perm);
      },
      error: (err) => console.error('Failed to remove permission', err),
    });
  }
}
