import {Component, ElementRef, Input, ViewChild, AfterViewInit} from '@angular/core';

@Component({
  selector: 'app-post-form',
  imports: [],
  templateUrl: './post-form.component.html',
  standalone: true,
  styleUrl: './post-form.component.css'
})
export class PostFormComponent implements AfterViewInit {
  @ViewChild('messageField') messageField!: ElementRef<HTMLTextAreaElement>;
  @Input() initialContent: string = '';

  activeArea: string | null = null;

  characters = [
    { id: 1, name: 'Hero Knight', avatar: 'assets/knight.png' },
    { id: 2, name: 'Dark Mage', avatar: 'assets/mage.png' }
  ];

  fonts = ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Impact'];
  colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'gray', 'silver'];

  ngAfterViewInit() {
    if (this.initialContent) {
      this.messageField.nativeElement.value = this.initialContent;
    }
  }

  toggleArea(area: string) {
    this.activeArea = this.activeArea === area ? null : area;
  }

  insertTag(tag: string) {
    const textarea = this.messageField.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Handle tags with parameters like [color=red]
    const tagBase = tag.split('=')[0];
    const openTag = `[${tag}]`;
    const closeTag = `[/${tagBase}]`;

    const selectedText = text.substring(start, end);
    const replacement = openTag + selectedText + closeTag;

    textarea.value = text.substring(0, start) + replacement + text.substring(end);

    // Reset focus and area
    this.activeArea = null;
    textarea.focus();

    // Position cursor
    const newPos = start + openTag.length + selectedText.length;
    textarea.setSelectionRange(newPos, newPos);
  }
}
