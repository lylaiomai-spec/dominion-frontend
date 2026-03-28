import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { PermissionMatrixObject, PermissionType } from '../../models/Permission';

@Component({
  selector: 'app-permission-matrix',
  imports: [CommonModule, FormsModule],
  templateUrl: './permission-matrix.component.html',
  standalone: true,
  styleUrl: './permission-matrix.component.css'
})
export class PermissionMatrixComponent implements OnInit {
  private permissionService = inject(PermissionService);

  matrixMap = this.permissionService.permissionMatrix;

  roles = computed(() => {
    const firstMatrix = this.getFirstMatrix();
    return firstMatrix ? Object.entries(firstMatrix.roles) : [];
  });

  matrixKeys = computed(() => Object.keys(this.matrixMap()));

  ngOnInit() {
    this.permissionService.loadPermissionMatrix();
  }

  private getFirstMatrix(): PermissionMatrixObject | null {
    const keys = Object.keys(this.matrixMap());
    if (keys.length > 0) {
      return this.matrixMap()[+keys[0]];
    }
    return null;
  }

  getMatrixFor(key: string): PermissionMatrixObject {
    return this.matrixMap()[+key];
  }

  getPermissionsFor(key: string): [string, string][] {
    const matrixObject = this.getMatrixFor(key);
    if (!matrixObject) return [];

    const sortedPermissions = matrixObject.permission_order.map(permissionKey => {
      return [permissionKey, matrixObject.permissions[permissionKey]] as [string, string];
    });

    return sortedPermissions;
  }

  getPermissionTypeName(key: string): string {
    const numericKey = +key;
    return PermissionType[numericKey];
  }

  saveState = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

  saveMatrix() {
    const checkedPermissions: string[] = [];
    const matrixMap = this.matrixMap();

    for (const matrixKey in matrixMap) {
      const matrixObject = matrixMap[matrixKey];
      for (const permissionKey in matrixObject.matrix) {
        for (const roleKey in matrixObject.matrix[permissionKey]) {
          if (matrixObject.matrix[permissionKey][roleKey]) {
            const roleName = matrixObject.roles[roleKey];
            checkedPermissions.push(`${matrixKey}.${roleName}.${permissionKey}`);
          }
        }
      }
    }

    this.saveState.set('loading');
    this.permissionService.savePermissionMatrix(checkedPermissions).subscribe({
      next: () => this.flashState('success'),
      error: (err) => {
        console.error('Failed to save permissions', err);
        this.flashState('error');
      }
    });
  }

  private flashState(state: 'success' | 'error') {
    this.saveState.set(state);
    setTimeout(() => this.saveState.set('idle'), 3000);
  }
}
