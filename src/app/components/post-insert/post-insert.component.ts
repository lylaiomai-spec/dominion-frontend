import { Component, OnInit, signal, inject, ElementRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Post } from '../../models/Post';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'post-insert',
  standalone: true,
  imports: [SafeHtmlPipe],
  template: `
    @if (contentHtml(); as html) {
      <div [innerHTML]="html | safeHtml"></div>
    }
  `
})
export class PostInsertComponent implements OnInit {
  private apiService = inject(ApiService);
  private el = inject(ElementRef);
  contentHtml = signal<string | null>(null);

  ngOnInit() {
    const postId = this.el.nativeElement.getAttribute('data-insert');
    if (!postId) return;
    this.apiService.get<Post>(`post/${postId}`).subscribe({
      next: (post) => this.contentHtml.set(post.content_html),
      error: (err) => console.error('post-insert failed to load', err)
    });
  }
}
