import { Component, AfterViewInit, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'spoiler-box',
  standalone: true,
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
    }
    :host ::ng-deep .spoiler-header {
      cursor: pointer;
      user-select: none;
    }
    :host ::ng-deep .spoiler-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    :host ::ng-deep .spoiler-content.open {
      max-height: 10000px;
    }
  `]
})
export class SpoilerBoxComponent implements AfterViewInit {
  private el = inject(ElementRef);

  ngAfterViewInit() {
    const host: HTMLElement = this.el.nativeElement;
    const header = host.querySelector('.spoiler-header');
    const content = host.querySelector('.spoiler-content');

    if (header && content) {
      header.addEventListener('click', () => {
        content.classList.toggle('open');
      });
    }
  }
}
