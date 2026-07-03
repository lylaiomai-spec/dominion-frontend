import {inject, Injectable, signal} from '@angular/core';
import {Topic, TopicStatus, TopicType, CreateTopicRequest} from '../models/Topic';
import {ApiService} from './api.service';
import {Post} from '../models/Post';
import {NotificationService} from './notification.service';
import {AuthService} from './auth.service';
import {Router} from '@angular/router';
import {BoardService} from './board.service';
import { Subject, switchMap, map } from 'rxjs';

interface PostsResponse {
  page: number;
  posts: Post[];
}


@Injectable({ providedIn: 'root' })
export class TopicService {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private boardService = inject(BoardService);

  private topicSignal = signal<Topic>({
    id: 0,
    name: '',
    subforum_id: 0,
    date_created: '',
    date_last_post: '',
    author_user_id: 0,
    author_username: '',
    post_number: 0,
    last_post_author_user_id: null,
    last_post_author_username: null,
    date_last_post_localized: null,
    type: TopicType.general,
    status: TopicStatus.active,
    episode: null,
    character: null,
    wanted_character: null
  });
  readonly topic = this.topicSignal.asReadonly();

  private postsSignal = signal<Post[]>([]);
  readonly posts = this.postsSignal.asReadonly();

  private pageLoadedSubject = new Subject<{page: number, topicId: number}>();
  public pageLoaded$ = this.pageLoadedSubject.asObservable();

  private ownPostAddedSubject = new Subject<number>();
  public ownPostAdded$ = this.ownPostAddedSubject.asObservable();
  private pendingOwnPostTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingScrollAfterFallback = false;

  private loadPostsSubject = new Subject<{topicId: number, page: number, postId?: number}>();

  readonly singlePostSignal = signal<Post | null>(null);
  readonly singlePost = this.singlePostSignal.asReadonly();

  constructor() {
    this.loadPostsSubject.pipe(
      switchMap(({ topicId, page, postId }) => {
        let url = `topic-posts/${topicId}?page=${page}`;
        if (postId) {
          url = `topic-posts/${topicId}?post_id=${postId}`;
        }
        return this.apiService.get<PostsResponse>(url).pipe(
          map(data => ({ data, topicId }))
        );
      })
    ).subscribe({
      next: ({ data, topicId }) => {
        if (data && data.posts) {
          this.postsSignal.set(data.posts);
          this.pageLoadedSubject.next({ page: data.page, topicId });
          if (this.pendingScrollAfterFallback) {
            this.pendingScrollAfterFallback = false;
            const currentUser = this.authService.currentUser();
            if (currentUser) {
              const ownPost = [...data.posts].reverse().find(p => p.user_profile?.user_id === currentUser.id);
              if (ownPost) this.ownPostAddedSubject.next(ownPost.id);
            }
          }
          if (data.posts.length > 0) {
            const postIds = data.posts.map((p: Post) => p.id);
            const maxPostId = Math.max(...postIds);
            this.notificationService.sendMessage({ type: 'topic_view', topic_id: topicId, post_id: maxPostId });
            this.notificationService.checkPostIds(postIds);
            this.notificationService.checkTopicId(topicId);
          } else {
            const topicType = this.topicSignal()?.type;
            if (topicType === TopicType.character || topicType === TopicType.episode || topicType === TopicType.wanted_character) {
              this.notificationService.sendMessage({ type: 'topic_view', topic_id: topicId, post_id: 0 });
            }
          }
        } else {
          this.postsSignal.set([]);
        }
      },
      error: (err) => console.error('Failed to load posts', err)
    });

    this.notificationService.postCreated$.subscribe(event => {
      const currentTopicId = this.topic().id;
      if (event.data.topic_id == currentTopicId) {
        this.handleNewPost(event.data);
      }
    });

    this.notificationService.postUpdated$.subscribe(event => {
      const currentTopicId = this.topic().id;
      if (event.data.topic_id == currentTopicId) {
        this.updateLocalPost(event.data);
      }
    });

    this.notificationService.reactionCreated$.subscribe(event => {
      const post = this.postsSignal().find(p => p.id === event.data.post_id);
      if (!post) return;

      const { reaction_id, url, user_id, user_name } = event.data;
      const existing = (post.reactions ?? []).find(r => r.reaction_id === reaction_id);

      if (existing) {
        this.postsSignal.update(posts => posts.map(p => {
          if (p.id !== event.data.post_id) return p;
          return {
            ...p,
            reactions: (p.reactions ?? []).map(r =>
              r.reaction_id === reaction_id
                ? { ...r, number: r.number + 1, users: [...r.users, { id: user_id, name: user_name }] }
                : r
            )
          };
        }));
      } else {
        this.postsSignal.update(posts => posts.map(p => {
          if (p.id !== event.data.post_id) return p;
          return {
            ...p,
            reactions: [...(p.reactions ?? []), { reaction_id, url, number: 1, users: [{ id: user_id, name: user_name }] }]
          };
        }));
      }
    });
  }

  loadPost(id: number) {
    return this.apiService.get<Post>(`post/${id}`);
  }

  loadTopic(id: number) {
    return this.apiService.get<Topic>('topic/get/' + id.toString());
  }

  setTopic(data: Topic): void {
    const enrichedTopic = this.enrichTopicWithPermissions(data);
    this.topicSignal.set(enrichedTopic);
  }

  loadPosts(topicId: number, page: number, postId?: number) {
    this.loadPostsSubject.next({ topicId, page, postId });
  }

  createPost(data: any) {
    return this.apiService.post('post/create', data);
  }

  updatePost(id: number, data: any) {
    return this.apiService.post(`post/update/${id}`, data);
  }

  deletePost(id: number) {
    return this.apiService.post(`post/delete/${id}`, {});
  }

  removeLocalPost(postId: number) {
    this.postsSignal.update(posts => posts.filter(p => p.id !== postId));
  }

  createTopic(data: CreateTopicRequest, endpoint = 'topic/create') {
    return this.apiService.post(endpoint, data);
  }

  previewTopic(data: any) {
    return this.apiService.post<any>('post/preview', data);
  }

  updateTopic(id: number, data: any) {
    return this.apiService.post(`topic/update/${id}`, data);
  }

  private normalizePost(post: Post): Post {
    return { ...post, reactions: Array.isArray(post.reactions) ? post.reactions : [] };
  }

  updateLocalPost(updatedPost: Post) {
    this.postsSignal.update(posts => posts.map(p => p.id === updatedPost.id ? this.normalizePost({ can_edit: p.can_edit, ...updatedPost }) : p));
  }

  updatePostReactions(postId: number, reactions: Post['reactions']) {
    this.postsSignal.update(posts =>
      posts.map(p => p.id === postId ? { ...p, reactions } : p)
    );
  }

  updateLocalTopic(updatedTopic: Topic) {
    const enrichedTopic = this.enrichTopicWithPermissions(updatedTopic);
    this.topicSignal.set(enrichedTopic);
  }

  updateTopicStatus(status: number) {
    this.topicSignal.update(topic => ({ ...topic, status }));
  }

  updateEpisodeStatus(episodeStatus: number) {
    this.topicSignal.update(topic => ({
      ...topic,
      episode: topic.episode ? { ...topic.episode, episode_status: episodeStatus } : null
    }));
  }

  updateCharacterStatus(characterStatus: number) {
    this.topicSignal.update(topic => ({
      ...topic,
      character: topic.character ? { ...topic.character, character_status: characterStatus } : null
    }));
  }

  updateWantedCharacterStatus(wantedCharacterStatus: number) {
    this.topicSignal.update(topic => ({
      ...topic,
      wanted_character: topic.wanted_character ? { ...topic.wanted_character, wanted_character_status: wantedCharacterStatus } : null
    }));
  }

  notifyOwnPostSubmitted(topicId: number): void {
    this.clearOwnPostTimeout();
    const postsPerPage = this.boardService.board().posts_per_page || 15;
    const lastPage = Math.max(1, Math.ceil((this.topic().post_number + 1) / postsPerPage));
    this.pendingOwnPostTimeout = setTimeout(() => {
      this.pendingOwnPostTimeout = null;
      this.pendingScrollAfterFallback = true;
      this.loadPosts(topicId, lastPage);
    }, 2000);
  }

  private clearOwnPostTimeout(): void {
    if (this.pendingOwnPostTimeout !== null) {
      clearTimeout(this.pendingOwnPostTimeout);
      this.pendingOwnPostTimeout = null;
    }
  }

  private handleNewPost(post: Post) {
    if (this.postsSignal().some(p => p.id === post.id)) return;
    this.postsSignal.update(posts => [...posts, this.normalizePost(post)]);

    const postsPerPage = this.boardService.board().posts_per_page || 15;
    const prevTotal = this.topic().post_number;
    const prevLastPage = Math.ceil(prevTotal / postsPerPage) || 1;
    const newLastPage = Math.ceil((prevTotal + 1) / postsPerPage);

    this.topicSignal.update(topic => {
      if (topic) {
        return { ...topic, post_number: topic.post_number + 1 };
      }
      return topic;
    });

    this.notificationService.sendMessage({
      type: 'topic_view',
      topic_id: post.topic_id,
      post_id: post.id
    });

    const currentUser = this.authService.currentUser();
    if (currentUser && post.user_profile && currentUser.id === post.user_profile.user_id) {
      this.clearOwnPostTimeout();
      this.ownPostAddedSubject.next(post.id);
      if (newLastPage > prevLastPage) {
        this.router.navigate(['/viewtopic', this.topic().id], { queryParams: { page: newLastPage } });
      }
    }
  }

private enrichTopicWithPermissions(topic: Topic): Topic {
    return topic;
  }
}
