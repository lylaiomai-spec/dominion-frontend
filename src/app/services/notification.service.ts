import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { PostCreatedEvent, TopicCreatedEvent, NotificationEvent, WebSocketEvent, TopicViewersUpdateEvent, UnreadNotificationsResponse, NotificationData, NotificationMention, NotificationReaction, NotificationDirectMessage, NotificationAiMessage, PostUpdatedEvent, DirectMessageCreatedEvent, ActiveUsersUpdateEvent, ActiveUsersActivityUpdateEvent, PanelReloadEvent, ReactionCreatedEvent, HealthUpdateEvent, UserRefreshRequiredEvent, DraftUpdatedEvent, AiMessageEvent, AiTaskDoneEvent, AiQueuePositionEvent, AiErrorEvent, PageChangedEvent, TopicFullEvent } from '../models/event';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { CharacterService } from './character.service';
import { environment } from '../../environments/environment';


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private characterService = inject(CharacterService);
  private ws: WebSocket | null = null;
  private readonly url: string;
  private token: string | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 1000;
  private maxReconnectInterval = 30000;
  private reconnectTimer: number | null = null;
  private connectionTimeout: number | null = null;

  private postCreatedSubject = new Subject<PostCreatedEvent>();
  public postCreated$ = this.postCreatedSubject.asObservable();

  private postUpdatedSubject = new Subject<PostUpdatedEvent>();
  public postUpdated$ = this.postUpdatedSubject.asObservable();

  private topicCreatedSubject = new Subject<TopicCreatedEvent>();
  public topicCreated$ = this.topicCreatedSubject.asObservable();

  private topicViewersUpdateSubject = new Subject<TopicViewersUpdateEvent>();
  public topicViewersUpdate$ = this.topicViewersUpdateSubject.asObservable();

  private directMessageCreatedSubject = new Subject<DirectMessageCreatedEvent>();
  public directMessageCreated$ = this.directMessageCreatedSubject.asObservable();

  private activeUsersUpdateSubject = new Subject<ActiveUsersUpdateEvent>();
  public activeUsersUpdate$ = this.activeUsersUpdateSubject.asObservable();

  private activeUsersActivityUpdateSubject = new Subject<ActiveUsersActivityUpdateEvent>();
  public activeUsersActivityUpdate$ = this.activeUsersActivityUpdateSubject.asObservable();

  private panelReloadSubject = new Subject<PanelReloadEvent>();
  public panelReload$ = this.panelReloadSubject.asObservable();

  private reactionCreatedSubject = new Subject<ReactionCreatedEvent>();
  public reactionCreated$ = this.reactionCreatedSubject.asObservable();

  private topicFullSubject = new Subject<TopicFullEvent>();
  public topicFull$ = this.topicFullSubject.asObservable();

  private healthUpdateSubject = new Subject<HealthUpdateEvent>();
  public healthUpdate$ = this.healthUpdateSubject.asObservable();

  private draftUpdatedSubject = new Subject<DraftUpdatedEvent>();
  public draftUpdated$ = this.draftUpdatedSubject.asObservable();

  private aiMessageSubject = new Subject<AiMessageEvent>();
  public aiMessage$ = this.aiMessageSubject.asObservable();

  private aiTaskDoneSubject = new Subject<AiTaskDoneEvent>();
  public aiTaskDone$ = this.aiTaskDoneSubject.asObservable();

  private aiQueuePositionSubject = new Subject<AiQueuePositionEvent>();
  public aiQueuePosition$ = this.aiQueuePositionSubject.asObservable();

  private aiErrorSubject = new Subject<AiErrorEvent>();
  public aiError$ = this.aiErrorSubject.asObservable();

  private pageChangedSubject = new Subject<PageChangedEvent>();
  public pageChanged$ = this.pageChangedSubject.asObservable();

  private wsConnectedSubject = new Subject<void>();
  public wsConnected$ = this.wsConnectedSubject.asObservable();

private systemNotificationsSignal = signal<NotificationData[]>([]);
  public systemNotifications = this.systemNotificationsSignal.asReadonly();
  private gameNotificationsSignal = signal<NotificationData[]>([]);
  public gameNotifications = this.gameNotificationsSignal.asReadonly();
  private mentionNotificationsSignal = signal<NotificationData[]>([]);
  public mentionNotifications = this.mentionNotificationsSignal.asReadonly();
  private directMessageNotificationsSignal = signal<NotificationData[]>([]);
  public directMessageNotifications = this.directMessageNotificationsSignal.asReadonly();
  private reactionNotificationsSignal = signal<NotificationData[]>([]);
  public reactionNotifications = this.reactionNotificationsSignal.asReadonly();
  private autoArchivingNotificationsSignal = signal<NotificationData[]>([]);
  public autoArchivingNotifications = this.autoArchivingNotificationsSignal.asReadonly();
  private accountUpdateNotificationsSignal = signal<NotificationData[]>([]);
  public accountUpdateNotifications = this.accountUpdateNotificationsSignal.asReadonly();
  private topicSubscriptionsNotificationsSignal = signal<NotificationData[]>([]);
  public topicSubscriptionsNotifications = this.topicSubscriptionsNotificationsSignal.asReadonly();

  // Subject for real-time toast notifications
  private notificationSubject = new Subject<NotificationData>();
  public notification$ = this.notificationSubject.asObservable();

  // Subject for notification sounds (independent of toast visibility)
  private soundSubject = new Subject<void>();
  public sound$ = this.soundSubject.asObservable();

  private messageQueue: string[] = [];
  private explicitlyClosed = false;
  private heartbeatTimer: number | null = null;
  private pongTimeout: number | null = null;
  private draftId: string | null = null;
  private draftInterval: number | null = null;
  private lastMsgId: number | null = null;
  private seenMsgIds = new Set<number>();

  // Toast notifications queued while the tab is hidden
  private pendingToasts: NotificationData[] = [];

  // Auto-dismissal trigger maps
  private mentionPostTriggers = new Map<number, NotificationData>();  // post_id → notification
  private gameTopicTriggers = new Map<number, NotificationData>();    // topic_id → notification
  private dmChatTriggers = new Map<number, NotificationData>();       // chat_id → notification
  private aiMessageTriggers = new Map<number, NotificationData>();    // AI chat message id → notification
  private shownAiMessageIds = new Set<number>();

  constructor() {
    const baseUrl = environment.wsUrl;
    this.url = baseUrl.replace(/^http/, 'ws') + '/ws';

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.pendingToasts.length > 0) {
        this.pendingToasts.forEach(n => this.notificationSubject.next(n));
        this.pendingToasts = [];
      }
    });
  }

  public showToast(title: string, message: string): void {
    this.notificationSubject.next({
      id: Date.now(),
      user_id: 0,
      type: 'system',
      title,
      message,
      date_created: new Date().toISOString(),
      is_read: false,
      mention: null,
      game: null,
      direct_message: null,
      data: null
    });
  }

  public loadUnreadNotifications(): void {
    this.apiService.get<UnreadNotificationsResponse>('notifications/unread').subscribe({
      next: (response) => {
        this.systemNotificationsSignal.set([
          ...(response.system || []).map(n => ({ ...n, type: 'system' as const })),
          ...(response.absence_started || []).map(n => ({ ...n, type: 'absence_started' as const })),
          ...(response.ai_message || []).map(n => ({ ...n, type: 'ai_message' as const })),
        ]);
        this.gameNotificationsSignal.set([
          ...(response.game || []).map(n => ({ ...n, type: 'game' as const })),
          ...(response.episode_status_change || []).map(n => ({ ...n, type: 'episode_status_change' as const })),
        ]);
        this.mentionNotificationsSignal.set((response.mention || []).map(n => ({ ...n, type: 'mention' as const })));
        this.directMessageNotificationsSignal.set((response.direct_message || []).map(n => ({ ...n, type: 'direct_message' as const })));
        this.reactionNotificationsSignal.set((response.reaction || []).map(n => ({ ...n, type: 'reaction' as const })));
        this.autoArchivingNotificationsSignal.set((response.auto_archiving || []).map(n => ({ ...n, type: 'auto_archiving' as const })));
        this.accountUpdateNotificationsSignal.set((response.account_update || []).map(n => ({ ...n, type: 'account_update' as const })));
        this.topicSubscriptionsNotificationsSignal.set((response.topic_subscriptions || []).map(n => ({ ...n, type: 'topic_subscriptions' as const })));
        this.rebuildTriggers(response);
      },
      error: (err) => console.error('Failed to load unread notifications', err)
    });
  }

  private mentionPostId(n: NotificationData): number | undefined {
    return ((n.mention ?? n.data) as NotificationMention | null)?.post_id ?? undefined;
  }

  private dmChatId(n: NotificationData): number | undefined {
    return ((n.direct_message ?? n.data) as NotificationDirectMessage | null)?.chat_id ?? undefined;
  }

  private aiMessageId(n: NotificationData): number | undefined {
    return (n.data as NotificationAiMessage | null)?.message_id ?? undefined;
  }

  private isSystemGroup(n: NotificationData): boolean {
    return n.type === 'system' || n.type === 'absence_started' || n.type === 'ai_message';
  }

  private rebuildTriggers(response: UnreadNotificationsResponse): void {
    this.mentionPostTriggers.clear();
    this.gameTopicTriggers.clear();
    this.dmChatTriggers.clear();
    this.aiMessageTriggers.clear();
    for (const n of response.ai_message || []) {
      const messageId = this.aiMessageId(n);
      if (messageId) this.aiMessageTriggers.set(messageId, n);
    }
    for (const n of response.mention || []) {
      const postId = this.mentionPostId(n);
      if (postId) this.mentionPostTriggers.set(postId, n);
    }
    for (const n of response.game || []) {
      if (n.game?.topic_id) this.gameTopicTriggers.set(n.game.topic_id, n);
    }
    for (const n of response.direct_message || []) {
      const chatId = this.dmChatId(n);
      if (chatId) this.dmChatTriggers.set(chatId, n);
    }
  }

  private addTrigger(n: NotificationData): void {
    if (n.type === 'mention') {
      const postId = this.mentionPostId(n);
      if (postId) this.mentionPostTriggers.set(postId, n);
    } else if (n.type === 'game' && n.game?.topic_id) {
      this.gameTopicTriggers.set(n.game.topic_id, n);
    } else if (n.type === 'direct_message') {
      const chatId = this.dmChatId(n);
      if (chatId) this.dmChatTriggers.set(chatId, n);
    } else if (n.type === 'ai_message') {
      const messageId = this.aiMessageId(n);
      if (messageId) this.aiMessageTriggers.set(messageId, n);
    }
  }

  private removeTrigger(n: NotificationData): void {
    if (n.type === 'mention') {
      const postId = this.mentionPostId(n);
      if (postId) this.mentionPostTriggers.delete(postId);
    } else if (n.type === 'game' && n.game?.topic_id) {
      this.gameTopicTriggers.delete(n.game.topic_id);
    } else if (n.type === 'direct_message') {
      const chatId = this.dmChatId(n);
      if (chatId) this.dmChatTriggers.delete(chatId);
    } else if (n.type === 'ai_message') {
      const messageId = this.aiMessageId(n);
      if (messageId) this.aiMessageTriggers.delete(messageId);
    }
  }

  public checkPostIds(postIds: number[]): void {
    if (this.mentionNotificationsSignal().length === 0) return;
    for (const postId of postIds) {
      const n = this.mentionPostTriggers.get(postId);
      if (n) this.dismissNotification(n);
    }
  }

  public checkTopicId(topicId: number): void {
    if (this.gameNotificationsSignal().length === 0) return;
    const n = this.gameTopicTriggers.get(topicId);
    if (n) this.dismissNotification(n);
  }

  public checkMentionsByTopicId(topicId: number): void {
    const mentions = this.mentionNotificationsSignal();
    if (mentions.length === 0) return;
    for (const n of mentions) {
      const tid = ((n.mention ?? n.data) as NotificationMention | null)?.topic_id;
      if (tid === topicId) this.dismissNotification(n);
    }
  }

  public checkReactionsByPostIds(postIds: number[]): void {
    const reactions = this.reactionNotificationsSignal();
    if (reactions.length === 0) return;
    const postIdSet = new Set(postIds);
    for (const n of reactions) {
      const postId = (n.data as NotificationReaction | null)?.post_id;
      if (postId && postIdSet.has(postId)) this.dismissNotification(n);
    }
  }

  public checkReactionsByTopicId(topicId: number): void {
    const reactions = this.reactionNotificationsSignal();
    if (reactions.length === 0) return;
    for (const n of reactions) {
      const tid = (n.data as NotificationReaction | null)?.topic_id;
      if (tid === topicId) this.dismissNotification(n);
    }
  }

  public checkChatId(chatId: number): void {
    const notifications = this.directMessageNotificationsSignal();
    if (notifications.length === 0) return;
    for (const n of notifications) {
      if (this.dmChatId(n) === chatId) this.dismissNotification(n);
    }
  }

  // Also remembers the ids, so a notification arriving after its message is already shown is dismissed on arrival.
  public checkAiMessageIds(messageIds: number[]): void {
    for (const messageId of messageIds) {
      this.shownAiMessageIds.add(messageId);
      const n = this.aiMessageTriggers.get(messageId);
      if (n) this.dismissNotification(n);
    }
  }

  public dismissNotification(notification: NotificationData): void {
    this.removeTrigger(notification);
    this.apiService.post(`notifications/dismiss/${notification.id}`, {}).subscribe({
      next: () => this.removeFromSignal(notification),
      error: (err) => console.error('Failed to dismiss notification', err)
    });
  }

  private removeFromSignal(notification: NotificationData): void {
    const id = notification.id;
    if (this.isSystemGroup(notification)) {
      this.systemNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'game' || notification.type === 'episode_status_change') {
      this.gameNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'mention') {
      this.mentionNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'direct_message') {
      this.directMessageNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'reaction') {
      this.reactionNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'auto_archiving') {
      this.autoArchivingNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'account_update') {
      this.accountUpdateNotificationsSignal.update(current => current.filter(n => n.id !== id));
    } else if (notification.type === 'topic_subscriptions') {
      this.topicSubscriptionsNotificationsSignal.update(current => current.filter(n => n.id !== id));
    }
  }

  public connect(authToken: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.token === authToken) {
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close();
    }

    if (!authToken) {
      console.error('Auth token is required.');
      return;
    }
    this.token = authToken;
    this.explicitlyClosed = false;
    this._doConnect();
  }

  public disconnect(): void {
    if (this.ws) {
      this.explicitlyClosed = true;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
      if (this.pongTimeout) { clearTimeout(this.pongTimeout); this.pongTimeout = null; }
      this.ws.close();
    }
  }

  public sendMessage(message: unknown): void {
    const msgString = JSON.stringify(message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msgString);
    } else {
      this.messageQueue.push(msgString);
    }
  }

  public startDraftMode(draftId: string): void {
    this.draftId = draftId;
    this.sendDraftConfirmation();
    this.draftInterval = window.setInterval(() => this.sendDraftConfirmation(), 30000);
  }

  private sendDraftConfirmation(): void {
    if (!this.draftId) return;
    this.sendMessage({ type: 'draft_mode', draft_id: this.draftId });
  }

  public sendPageChange(pageType: string, pageId: number): void {
    this.sendMessage({
      type: 'page_change',
      page_type: pageType,
      page_id: pageId
    });
  }

  private _doConnect(): void {
    if (!this.token) return;
    const lastId = this.lastMsgId !== null ? `&last_message_id=${this.lastMsgId}` : '';
    const urlWithAuth = `${this.url}?token=${this.token}${lastId}`;
    this.ws = new WebSocket(urlWithAuth);

    this.connectionTimeout = window.setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
    }, 10000);

    this.ws.onopen = () => {
      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      this.reconnectAttempts = 0;
      this.processMessageQueue();
      this.sendDraftConfirmation();
      this.wsConnectedSubject.next();
      this.heartbeatTimer = window.setInterval(() => {
        this.sendMessage({ type: 'ping' });
        this.pongTimeout = window.setTimeout(() => {
          if (this.ws) this.ws.close();
        }, 5000);
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        this.handleNotification(JSON.parse(event.data));
      } catch (error) {
        console.error('Error parsing message.', error);
      }
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
    };

    this.ws.onclose = () => {
      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
      if (this.pongTimeout) { clearTimeout(this.pongTimeout); this.pongTimeout = null; }
      this.ws = null;
      if (!this.explicitlyClosed) {
        this.handleConnectionFailure();
      }
    };
  }

  private handleConnectionFailure() {
    if (this.authService.isAccessTokenExpired()) {
      this.authService.refreshToken().subscribe({
        next: (response) => {
          this.token = response.access_token;
          this.scheduleReconnect();
        },
        error: (err) => {
          console.error('NotificationService: Token refresh failed.', err);
          this.scheduleReconnect();
        }
      });
    } else {
      this.scheduleReconnect();
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      if (msg) this.ws.send(msg);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const backoff = Math.min(this.maxReconnectInterval, this.reconnectInterval * Math.pow(2, this.reconnectAttempts));
    const jitter = backoff * 0.5 * Math.random();
    const timeout = backoff - jitter;
    this.reconnectTimer = window.setTimeout(() => this._doConnect(), timeout);
  }

  private handleNotification(notification: WebSocketEvent): void {
    if (notification.msg_id !== undefined) {
      this.lastMsgId = notification.msg_id;
      if (this.seenMsgIds.has(notification.msg_id)) return;
      this.seenMsgIds.add(notification.msg_id);
    }
    switch (notification.type) {
      case 'post_created':
        this.postCreatedSubject.next(notification as PostCreatedEvent);
        break;
      case 'post_updated':
        this.postUpdatedSubject.next(notification as PostUpdatedEvent);
        break;
      case 'topic_created':
        this.topicCreatedSubject.next(notification as TopicCreatedEvent);
        break;
      case 'notification':
        const event = notification as NotificationEvent;
        const notificationData = event.data;
        const notifSetting = this.authService.currentUser()?.notification_settings
          ?.find(s => s.notification_type === notificationData.type);

        if (notifSetting?.disable_all) break;

        const shownAiMessageId = notificationData.type === 'ai_message' ? this.aiMessageId(notificationData) : undefined;
        if (shownAiMessageId && this.shownAiMessageIds.has(shownAiMessageId)) {
          this.dismissNotification(notificationData);
          break;
        }

        this.addTrigger(notificationData);

        if (this.isSystemGroup(notificationData)) {
          this.systemNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'game' || notificationData.type === 'episode_status_change') {
          this.gameNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'mention') {
          this.mentionNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'direct_message') {
          this.directMessageNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'reaction') {
          this.reactionNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'auto_archiving') {
          this.autoArchivingNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'account_update') {
          this.accountUpdateNotificationsSignal.update(current => [notificationData, ...current]);
        } else if (notificationData.type === 'topic_subscriptions') {
          this.topicSubscriptionsNotificationsSignal.update(current => [notificationData, ...current]);
        }

        if (!notifSetting?.disable_sound) {
          this.soundSubject.next();
        }

        if (!notifSetting?.disable_toast) {
          if (document.visibilityState === 'hidden') {
            this.pendingToasts.push(notificationData);
          } else {
            this.notificationSubject.next(notificationData);
          }
        }
        break;
      case 'topic_viewers_update':
        this.topicViewersUpdateSubject.next(notification as TopicViewersUpdateEvent);
        break;
      case 'direct_message_created':
        this.directMessageCreatedSubject.next(notification as DirectMessageCreatedEvent);
        break;
      case 'active_users_update':
        this.activeUsersUpdateSubject.next(notification as ActiveUsersUpdateEvent);
        break;
      case 'active_users_activity_update':
        this.activeUsersActivityUpdateSubject.next(notification as ActiveUsersActivityUpdateEvent);
        break;
      case 'panel_reload':
        this.panelReloadSubject.next(notification as PanelReloadEvent);
        break;
      case 'reaction_created':
        this.reactionCreatedSubject.next(notification as ReactionCreatedEvent);
        break;
      case 'topic_full':
        this.topicFullSubject.next(notification as TopicFullEvent);
        break;
      case 'health_update':
        this.healthUpdateSubject.next(notification as HealthUpdateEvent);
        break;
      case 'draft_updated':
        this.draftUpdatedSubject.next(notification as DraftUpdatedEvent);
        break;
      case 'ai_message':
        this.aiMessageSubject.next(notification as AiMessageEvent);
        break;
      case 'ai_task_done':
        this.aiTaskDoneSubject.next(notification as AiTaskDoneEvent);
        break;
      case 'ai_queue_position':
        this.aiQueuePositionSubject.next(notification as AiQueuePositionEvent);
        break;
      case 'ai_error':
        this.aiErrorSubject.next(notification as AiErrorEvent);
        break;
      case 'page_changed':
        this.pageChangedSubject.next(notification as PageChangedEvent);
        break;
      case 'pong':
        if (this.pongTimeout) { clearTimeout(this.pongTimeout); this.pongTimeout = null; }
        break;
      case 'user_refresh_required':
        this.authService.refreshToken().subscribe({
          error: (err) => {
            if (err.status === 403) this.authService.logout();
          }
        });
        this.characterService.loadUserCharacterProfiles();
        break;
      default:
        console.warn('Unknown notification type:', notification);
    }
  }
}
