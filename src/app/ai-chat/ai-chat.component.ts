import { Component, ElementRef, effect, inject, OnDestroy, OnInit, ViewChild, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { AiMessageData, AiSource } from '../models/event';
import { TopicType, TopicTypeIcon } from '../models/Topic';
import { Message } from '../models/Message';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe';

@Component({
  selector: 'app-ai-chat',
  host: { class: 'pun-page' },
  standalone: true,
  imports: [ FormsModule, SafeHtmlPipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './ai-chat.component.html',
})
export class AiChatComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private subs: Subscription[] = [];

  @ViewChild('chatInput') messageField!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  messages = signal<Message[]>([]);
  isLoading = signal(false);
  queuePosition = signal<number | null>(null);

  private currentUser = this.authService.currentUser;
  private localIdCounter = 0;
  private sessionId = crypto.randomUUID();

  private uniqueSources(sources?: AiSource[]): AiSource[] | undefined {
    if (!sources) return undefined;
    const seen = new Set<number>();
    return sources.filter(s => s.post_id == null || (!seen.has(s.post_id) && !!seen.add(s.post_id)));
  }

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
          msg.id,
          msg.content,
          msg.date,
          msg.role === 'user',
          msg.role === 'user' ? (user?.username ?? 'You') : 'AI',
          msg.role === 'user' ? (user?.avatar ?? null) : null,
          this.uniqueSources(msg.sources)
        ));
        this.messages.set(messages);
        this.notificationService.checkAiMessageIds(history.filter(msg => msg.role === 'assistant').map(msg => msg.id));
      },
      error: (err) => console.error('Failed to load AI chat history', err)
    });

    const appendAiMessage = (data: AiMessageData) => {
      if (this.messages().some(m => m.id === data.id)) return;
      const aiMessage = new Message(
        data.id,
        data.content,
        data.date,
        false,
        'AI',
        null,
        this.uniqueSources(data.sources)
      );
      this.messages.update(msgs => [...msgs, aiMessage]);
      this.notificationService.checkAiMessageIds([data.id]);
      this.isLoading.set(false);
      this.queuePosition.set(null);
    };

    this.subs.push(
      this.notificationService.aiMessage$.subscribe(event => appendAiMessage(event.data)),
      this.notificationService.aiTaskDone$.subscribe(event => appendAiMessage(event.data)),
      this.notificationService.aiQueuePosition$.subscribe(event => {
        if (event.data.position > 0) {
          this.queuePosition.set(event.data.position);
        } else {
          this.queuePosition.set(null);
        }
      }),
      this.notificationService.aiError$.subscribe(event => {
        this.isLoading.set(false);
        this.queuePosition.set(null);
        const systemMessage = new Message(
          --this.localIdCounter,
          $localize`:@@aiChat.errorProcessing:An error occurred while processing your request. Please try again.`,
          event.data.date,
          false,
          'System',
          null
        );
        this.messages.update(msgs => [...msgs, systemMessage]);
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.clearSession();
  }

  clearSession() {
    this.apiService.post('ai-chat/clear', { session_id: this.sessionId }).subscribe();
    this.sessionId = crypto.randomUUID();
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

    // The time label is filled in from the server's localized date once the send succeeds.
    const userMessage = new Message(
      --this.localIdCounter,
      content,
      '',
      true,
      user?.username ?? 'You',
      user?.avatar ?? null
    );

    this.messages.update(msgs => [...msgs, userMessage]);
    textarea.value = '';
    this.isLoading.set(true);

    this.apiService.post<{ queue_position: number; date: string }>('ai-chat/message', { content, session_id: this.sessionId }).subscribe({
      next: (res) => {
        this.messages.update(msgs => msgs.map(m => m.id === userMessage.id ? { ...m, time: res.date } : m));
        if (res.queue_position > 0) {
          this.queuePosition.set(res.queue_position);
        }
      },
      error: (err) => {
        console.error('AI chat error', err);
        this.isLoading.set(false);
        if (err?.status === 503) {
          const systemMessage = new Message(
            --this.localIdCounter,
            $localize`:@@aiChat.unavailable:AI is currently unavailable. Please try again later.`,
            '',
            false,
            'System',
            null
          );
          this.messages.update(msgs => [...msgs, systemMessage]);
        }
      }
    });
  }

  sourceIcon(source: AiSource): string {
    if (source.topic_type == null) return 'bi-chat';
    return TopicTypeIcon[source.topic_type as TopicType] ?? 'bi-chat';
  }

  sourceLink(source: AiSource): string {
    return `${window.location.origin}/viewtopic/${source.topic_id}?post_id=${source.post_id}#${source.post_id}`;
  }

  sourceLabel(source: AiSource): string {
    return `${source.topic_name ?? 'Topic'} #${source.post_id}`;
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
