import { AfterViewInit, Directive, ElementRef, inject, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appCodeCopy]',
  standalone: true,
})
export class CodeCopyDirective implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef);
  private observer: MutationObserver | null = null;

  ngAfterViewInit() {
    this.processCodeBlocks();
    this.observer = new MutationObserver(() => this.processCodeBlocks());
    this.observer.observe(this.el.nativeElement, { childList: true, subtree: true });
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private processCodeBlocks() {
    const host = this.el.nativeElement as HTMLElement;
    host.querySelectorAll<HTMLElement>('pre:not([data-copy-processed])').forEach(pre => {
      pre.setAttribute('data-copy-processed', 'true');

      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative';
      pre.parentNode!.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = document.createElement('button');
      btn.textContent = $localize`:@@codeCopy.copy:Copy`;
      btn.style.cssText = [
        'position:absolute', 'top:0.4rem', 'right:0.4rem',
        'padding:0.15rem 0.5rem', 'font-size:0.78em',
        'background:#f0f0f0', 'border:1px solid #ccc',
        'border-radius:3px', 'cursor:pointer', 'opacity:0.75',
        'line-height:1.4',
      ].join(';');
      btn.addEventListener('mouseenter', () => (btn.style.opacity = '1'));
      btn.addEventListener('mouseleave', () => (btn.style.opacity = '0.75'));
      btn.addEventListener('click', () => {
        const text = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = $localize`:@@codeCopy.copied:Copied!`;
          setTimeout(() => (btn.textContent = $localize`:@@codeCopy.copy:Copy`), 2000);
        });
      });
      wrapper.insertBefore(btn, pre);
    });
  }
}
