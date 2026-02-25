import {Component, effect, inject, Input, OnInit, OnDestroy, ViewChild, signal, computed, numberAttribute, ViewChildren, QueryList} from '@angular/core';
import {PostFormComponent} from '../components/post-form/post-form.component';
import {TopicService} from '../services/topic.service';
import {Router, RouterLink, ActivatedRoute} from '@angular/router';
import {CommonModule} from '@angular/common';
import {CharacterProfileComponent} from '../components/character-profile/character-profile.component';
import {TopicType} from '../models/Topic';
import {EpisodeHeaderComponent} from '../components/episode-header/episode-header.component';
import {Post} from '../models/Post';
import {BreadcrumbItem, BreadcrumbsComponent} from '../components/breadcrumbs/breadcrumbs.component';
import {ForumService} from '../services/forum.service';
import {TopicReadByComponent} from '../components/topic-read-by/topic-read-by.component';
import { CharacterSheetHeaderComponent } from '../components/character-sheet-header/character-sheet-header.component';
import { SafeHtmlPipe } from '../pipes/safe-html.pipe'
import { CharacterService } from '../services/character.service';
import { AuthService } from '../services/auth.service';
import { Subject, takeUntil, combineLatest } from 'rxjs';

function coerceToPage(value: unknown): number {
  const num = numberAttribute(value, 1);
  return num < 1 ? 1 : num;
}

@Component({
  selector: 'app-viewtopic',
  imports: [
    PostFormComponent,
    RouterLink,
    CommonModule,
    CharacterProfileComponent,
    EpisodeHeaderComponent,
    BreadcrumbsComponent,
    TopicReadByComponent,
    CharacterSheetHeaderComponent,
    SafeHtmlPipe
  ],
  templateUrl: './viewtopic.component.html',
  standalone: true,
  styleUrl: './viewtopic.component.css'
})
export class ViewtopicComponent implements OnInit, OnDestroy {
  topicService = inject(TopicService);
  forumService = inject(ForumService);
  characterService = inject(CharacterService);
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  @Input({ transform: numberAttribute }) id?: number;
  @Input({ transform: coerceToPage, alias: 'page' }) pageNumber: number = 1;

  topic = this.topicService.topic;
  posts = this.topicService.posts;
  subforum = this.forumService.subforum;
  userCharacterProfiles = this.characterService.userCharacterProfiles;

  accountName = this.authService.currentUser()?.username || 'Guest';
  selectedCharacterId: number | null = null;

  breadcrumbs: BreadcrumbItem[] = [];
  showPostForm = signal<boolean>(true);
  loadProfiles = true;
  showAccount = true;

  postsPerPage = 15;
  totalPages = computed(() => {
    const totalPosts = this.topic()?.post_number || 0;
    return Math.ceil(totalPosts / this.postsPerPage);
  });

  editingPostId = signal<number | null>(null);

  private destroy$ = new Subject<void>();

  @ViewChild('mainPostForm') postForm!: PostFormComponent;
  @ViewChildren('editPostForm') editPostForms!: QueryList<PostFormComponent>;

  constructor() {
    // Effect for breadcrumbs and profile loading
    effect(() => {
      const t = this.topic();
      const s = this.subforum();

      if (t.id !== 0) {
        if (s?.id !== t.subforum_id) {
           this.forumService.loadSubforum(t.subforum_id);
        }

        this.breadcrumbs = [
          { label: 'Home', link: '/' },
          ...(s ? [{ label: s.name, link: `/viewforum/${s.id}` }] : []),
          { label: t.name }
        ];

        if (t.type === TopicType.character) {
          this.loadProfiles = false;
          this.showAccount = true;
        } else if (t.type === TopicType.episode) {
          this.loadProfiles = false;
          this.showAccount = false;
          this.characterService.loadUserCharacterProfilesForTopic(t.id);
        } else if (t.type === TopicType.general) {
          this.loadProfiles = false;
          this.showAccount = true;
          this.characterService.loadUserCharacterProfilesForTopic(t.id);
        }
      }
    });

    // Effect for showing/hiding post form
    effect(() => {
      const t = this.topic();
      const profiles = this.userCharacterProfiles();

      if (t.type === TopicType.episode) {
        this.showPostForm.set(profiles.length > 0);
      } else {
        this.showPostForm.set(true);
      }
    });

    // Effect to reload posts when page or topic ID changes
    effect(() => {
      const topicId = this.id;
      const currentPage = this.pageNumber;
      if (topicId) {
        this.topicService.loadPosts(topicId, currentPage);
      }
    });
  }

  isEpisode() { return this.topic().type === TopicType.episode; }
  isGeneral() { return this.topic().type === TopicType.general; }
  isCharacter() { return this.topic().type === TopicType.character; }

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([paramMap, queryParamMap]) => {
        const topicId = Number(paramMap.get('id'));
        const page = coerceToPage(queryParamMap.get('page'));

        if (topicId) {
          // Only reload the main topic data if the ID has actually changed
          if (this.topic().id !== topicId) {
            this.topicService.loadTopic(topicId);
          }
          // Always reload posts for the current page
          this.topicService.loadPosts(topicId, page);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCharacterSelected(characterId: number | null) {
    this.selectedCharacterId = characterId;
  }

  editPost(post: Post, event: Event) {
    event.preventDefault();
    this.editingPostId.set(post.id);
  }

  cancelEdit() {
    this.editingPostId.set(null);
  }

  onUpdatePost(event: Event, postId: number) {
    event.preventDefault();

    // Find the correct form component
    // Since we are iterating, we can't easily map index to component instance in the template without tracking
    // But we can find it in the QueryList.
    // However, since only one post is edited at a time, we can just look for the one that is visible?
    // Or we can pass the value directly if we bind it?

    // A simpler way: get the textarea from the event target's form
    const form = event.target as HTMLFormElement;
    // The textarea inside app-post-form might not be directly accessible via form.elements if it's shadowed
    // But app-post-form is just a component.

    // Let's use the ViewChildren approach.
    // We need to know which index in the QueryList corresponds to the edited post.
    // This is tricky because the QueryList only contains *rendered* components.
    // Since we only render *one* edit form at a time (presumably), it should be the only one in the list?
    // Or we can just use the DOM.

    // Let's try to get the value from the textarea directly using standard DOM traversal from the submit button/form
    const textarea = form.querySelector('textarea');
    const content = textarea?.value;

    if (!content) return;

    const payload = {
      post_id: postId,
      content: content
    };

    this.topicService.updatePost(payload).subscribe({
      next: (updatedPost: any) => { // Assuming backend returns the updated post
        // Update the local post in the list
        // We need to update the signal in TopicService
        // If the backend returns the updated post, we can use it.
        // If not, we might need to reload or manually update.
        // Let's assume it returns the post object.
        if (updatedPost && updatedPost.id) {
             this.topicService.updateLocalPost(updatedPost);
        } else {
             // Fallback: reload posts
             if (this.id) this.topicService.loadPosts(this.id, this.pageNumber);
        }
        this.cancelEdit();
      },
      error: (err) => console.error('Failed to update post', err)
    });
  }

  onSubmit(event: Event) {
    event.preventDefault();
    const message = this.postForm.messageField.nativeElement.value;

    if (!message || !this.id) return;

    const payload = {
      topic_id: +this.id,
      content: message,
      use_character_profile: this.selectedCharacterId !== null,
      character_profile_id: this.selectedCharacterId
    };

    this.topicService.createPost(payload).subscribe({
      next: () => {
        this.postForm.messageField.nativeElement.value = '';
        // After posting, the WebSocket event will trigger a redirect if needed
      },
      error: (err) => console.error('Failed to create post', err)
    });
  }
}
