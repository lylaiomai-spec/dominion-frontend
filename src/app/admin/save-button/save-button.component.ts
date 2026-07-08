import { Component, EventEmitter, Input, Output } from '@angular/core';

export type SaveState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-save-button',
  standalone: true,
  templateUrl: './save-button.component.html',
  styleUrl: './save-button.component.css',
})
export class SaveButtonComponent {
  @Input() state: SaveState = 'idle';
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Output() clicked = new EventEmitter<void>();
}
