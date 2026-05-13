import { Component, ElementRef, effect, inject, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { AiMessageData } from '../models/event';
import { Message } from '../models/Message';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
})
export class AiChatComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private aiMessageSub?: Subscription;

  @ViewChild('chatInput') messageField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([]);
  isLoading = signal(false);

  private currentUser = this.authService.currentUser;
  private messageIdCounter = 0;

  private isProgrammaticScroll = false;

  constructor() {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length === 0) return;
      setTimeout(() => {
        if (!this.scrollContainer) return;
        this.isProgrammaticScroll = true;
        this.scrollContainer.nativeElement.scrollTo({ top: this.scrollContainer.nativeElement.scrollHeight, behavior: 'smooth' });
        setTimeout(() => { this.isProgrammaticScroll = false; }, 800);
      }, 0);
    });
  }

  ngOnInit() {
    this.apiService.get<AiMessageData[]>('ai-chat/history').subscribe({
      next: (history) => {
        const user = this.currentUser();
        const messages = history.map(msg => new Message(
          ++this.messageIdCounter,
          msg.content,
          new Date(msg.date_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          msg.role === 'user',
          msg.role === 'user' ? (user?.username ?? 'You') : 'AI',
          msg.role === 'user' ? (user?.avatar ?? null) : null
        ));
        this.messages.set(messages);
      },
      error: (err) => console.error('Failed to load AI chat history', err)
    });

    this.aiMessageSub = this.notificationService.aiMessage$.subscribe(event => {
      const aiMessage = new Message(
        ++this.messageIdCounter,
        event.data.content,
        new Date(event.data.date_created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        false,
        'AI',
        null
      );
      this.messages.update(msgs => [...msgs, aiMessage]);
      this.isLoading.set(false);
    });
  }

  ngOnDestroy() {
    this.aiMessageSub?.unsubscribe();
  }

  insertTag(tag: string) {
    const textarea = this.messageField.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const tagBase = tag.split('=')[0];
    const openTag = `[${tag}]`;
    const closeTag = `[/${tagBase}]`;

    const selectedText = text.substring(start, end);
    const replacement = openTag + selectedText + closeTag;

    textarea.value = text.substring(0, start) + replacement + text.substring(end);
    textarea.focus();

    const newPos = start + openTag.length + selectedText.length;
    textarea.setSelectionRange(newPos, newPos);
  }

  handleSend() {
    const textarea = this.messageField.nativeElement;
    const content = textarea.value.trim();
    if (!content || this.isLoading()) return;

    const user = this.currentUser();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage = new Message(
      ++this.messageIdCounter,
      content,
      now,
      true,
      user?.username ?? 'You',
      user?.avatar ?? null
    );

    this.messages.update(msgs => [...msgs, userMessage]);
    textarea.value = '';
    this.isLoading.set(true);

    this.apiService.post('ai-chat/message', { content }).subscribe({
      error: (err) => {
        console.error('AI chat error', err);
        this.isLoading.set(false);
        if (err?.status === 503) {
          const systemMessage = new Message(
            ++this.messageIdCounter,
            'AI is currently unavailable. Please try again later.',
            new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            false,
            'System',
            null
          );
          this.messages.update(msgs => [...msgs, systemMessage]);
        }
      }
    });
  }

  highlightMatch(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
      .replace(/\n/g, '<br>');
  }
}
