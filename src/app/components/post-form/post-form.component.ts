import {Component, ElementRef, Input, ViewChild, AfterViewInit, inject, OnDestroy} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {UserService} from '../../services/user.service';
import {UserShort} from '../../models/UserShort';
import {CommonModule} from '@angular/common';
import {ImageUploadComponent} from '../image-upload/image-upload.component';

@Component({
  selector: 'app-post-form',
  imports: [CommonModule, ImageUploadComponent],
  templateUrl: './post-form.component.html',
  standalone: true,
  styleUrl: './post-form.component.css'
})
export class PostFormComponent implements AfterViewInit, OnDestroy {
  @ViewChild('messageField') messageField!: ElementRef<HTMLTextAreaElement>;
  @Input() initialContent: string = '';
  @Input() isEpisode: boolean = false;

  private userService = inject(UserService);

  activeArea: string | null = null;
  showImageUpload = false;
  showSpoilerModal = false;
  private spoilerSelStart = 0;
  private spoilerSelEnd = 0;

  fonts = ['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New', 'Impact'];
  colors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'gray', 'silver'];

  mentionResults: UserShort[] = [];
  private mentionAtPos: number = -1;
  private mentionSubject = new Subject<string>();
  private mentionSub: Subscription;

  constructor() {
    this.mentionSub = this.mentionSubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => term.length >= 1 ? this.userService.searchUsers(term) : [])
    ).subscribe(results => {
      this.mentionResults = results;
    });
  }

  ngAfterViewInit() {
    if (this.initialContent) {
      this.messageField.nativeElement.value = this.initialContent;
    }
  }

  ngOnDestroy() {
    this.mentionSub.unsubscribe();
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

  onTextareaInput() {
    if (this.isEpisode) return;

    const textarea = this.messageField.nativeElement;
    const cursor = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursor);

    const match = textBeforeCursor.match(/@([^\u200A@]*)$/);
    if (match) {
      this.mentionAtPos = cursor - match[0].length;
      this.mentionSubject.next(match[1]);
    } else {
      this.mentionResults = [];
      this.mentionAtPos = -1;
    }
  }

  selectMention(user: UserShort) {
    const textarea = this.messageField.nativeElement;
    const cursor = textarea.selectionStart;
    const text = textarea.value;

    const before = text.substring(0, this.mentionAtPos);
    const after = text.substring(cursor);
    const inserted = `@${user.username}\u200A`;

    textarea.value = before + inserted + after;
    textarea.focus();
    const newPos = this.mentionAtPos + inserted.length;
    textarea.setSelectionRange(newPos, newPos);

    this.mentionResults = [];
    this.mentionAtPos = -1;
  }

  openSpoilerModal() {
    const textarea = this.messageField.nativeElement;
    this.spoilerSelStart = textarea.selectionStart;
    this.spoilerSelEnd = textarea.selectionEnd;
    this.showSpoilerModal = true;
  }

  insertSpoiler(title: string) {
    const textarea = this.messageField.nativeElement;
    const text = textarea.value;
    const selectedText = text.substring(this.spoilerSelStart, this.spoilerSelEnd);
    const tag = `[spoiler=${title}]${selectedText}[/spoiler]`;
    textarea.value = text.substring(0, this.spoilerSelStart) + tag + text.substring(this.spoilerSelEnd);
    this.showSpoilerModal = false;
    textarea.focus();
    const newPos = this.spoilerSelStart + tag.length;
    textarea.setSelectionRange(newPos, newPos);
  }

  onInsertImage(url: string) {
    const textarea = this.messageField.nativeElement;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const tag = `[img]${url}[/img]`;
    textarea.value = text.substring(0, start) + tag + text.substring(start);
    textarea.focus();
    const newPos = start + tag.length;
    textarea.setSelectionRange(newPos, newPos);
  }

  closeMention() {
    this.mentionResults = [];
    this.mentionAtPos = -1;
  }
}
