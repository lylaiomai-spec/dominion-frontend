import { Directive, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Apply to any element that renders backend HTML via [innerHTML].
 * Intercepts clicks on internal <a> tags and routes them through
 * the Angular Router to avoid full page reloads.
 */
@Directive({
  selector: '[appRouterLinks]',
  standalone: true,
})
export class RouterLinksDirective {
  private router = inject(Router);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    // target.hostname is empty for mailto:/javascript: and resolves correctly for
    // both relative and absolute URLs; hostname (no port) avoids port-mismatch false negatives
    if (target.hostname !== window.location.hostname) return;

    event.preventDefault();
    const url = new URL(target.href);
    this.router.navigateByUrl(url.pathname + url.search + url.hash);
  }
}
