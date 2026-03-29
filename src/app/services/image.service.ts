import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private apiService = inject(ApiService);

  upload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService.post<{ url: string; thumbnail_url: string }>('image/upload', formData);
  }
}
