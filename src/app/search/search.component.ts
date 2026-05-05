import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { UserService } from '../services/user.service';
import { CategoryService } from '../services/category.service';
import { UserShort } from '../models/UserShort';
import { Subforum } from '../models/Subforum';

const RESULTS_PER_PAGE = 20;

export interface SearchResult {
  id: string;
  snippet: string;
  topic_id?: number;
}

type SearchResults = Record<string, SearchResult[]>;

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './search.component.html',
})
export class SearchComponent implements OnInit {
  private apiService = inject(ApiService);
  private userService = inject(UserService);
  private categoryService = inject(CategoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  buckets = signal<string[]>([]);
  categories = this.categoryService.homeCategories;

  searchTerm = signal('');
  selectedBuckets = signal<Set<string>>(new Set());
  selectedSubforumId = signal<number | null>(null);
  selectedUserId = signal<number | null>(null);

  authorTerm = '';
  authorResults: UserShort[] = [];
  private authorSearch$ = new Subject<string>();
  currentPage = signal(1);

  results = signal<SearchResults>({});
  totalCount = signal(0);
  loading = signal(false);
  searched = signal(false);

  resultBuckets = computed(() => Object.keys(this.results()));

  subforums = computed<Subforum[]>(() =>
    this.categories().flatMap(c => c.subforums)
  );

  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / RESULTS_PER_PAGE)));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 1) return [];

    const pageSet = new Set<number>();
    pageSet.add(1);
    pageSet.add(total);
    for (let p = current - 1; p <= current + 1; p++) {
      if (p >= 1 && p <= total) pageSet.add(p);
    }

    const sorted = Array.from(pageSet).sort((a, b) => a - b);
    const result: Array<{ type: 'page' | 'ellipsis'; number?: number }> = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push({ type: 'ellipsis' });
      }
      result.push({ type: 'page', number: sorted[i] });
    }
    return result;
  });

  ngOnInit() {
    this.apiService.get<string[]>('search/buckets').subscribe({
      next: (data) => this.buckets.set(data),
      error: (err) => console.error('Failed to load search buckets', err)
    });

    this.categoryService.loadHomeCategories();

    this.authorSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => term.length >= 2 ? this.userService.searchUsers(term) : [])
    ).subscribe(results => {
      this.authorResults = results;
    });

    const params = this.route.snapshot.queryParamMap;
    const q = params.get('q') ?? '';
    if (q) this.searchTerm.set(q);

    const bucketsParam = params.get('buckets');
    if (bucketsParam) this.selectedBuckets.set(new Set(bucketsParam.split(',')));

    const subforumId = params.get('subforum_id');
    if (subforumId) this.selectedSubforumId.set(+subforumId);

    const userId = params.get('user_id');
    const userName = params.get('user_name');
    if (userId) {
      this.selectedUserId.set(+userId);
      if (userName) this.authorTerm = userName;
    }

    const page = params.get('page');
    if (page) this.currentPage.set(+page || 1);

    if (q) this.performSearch();
  }

  onSearchTermInput(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSubforumChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedSubforumId.set(val ? +val : null);
  }

  onAuthorInput() {
    this.selectedUserId.set(null);
    this.authorSearch$.next(this.authorTerm);
  }

  selectAuthor(user: UserShort) {
    this.selectedUserId.set(user.id);
    this.authorTerm = user.username;
    this.authorResults = [];
  }

  clearAuthor() {
    this.selectedUserId.set(null);
    this.authorTerm = '';
    this.authorResults = [];
  }

  toggleBucket(bucket: string) {
    const next = new Set(this.selectedBuckets());
    if (next.has(bucket)) next.delete(bucket);
    else next.add(bucket);
    this.selectedBuckets.set(next);
  }

  isBucketSelected(bucket: string): boolean {
    return this.selectedBuckets().has(bucket);
  }

  search(event?: Event) {
    event?.preventDefault();
    this.currentPage.set(1);
    this.performSearch();
  }

  goToPage(page: number) {
    this.currentPage.set(page);
    this.performSearch();
  }

  getLink(bucket: string, result: SearchResult): string[] {
    if (bucket === 'game_posts' && result.topic_id != null) {
      return ['/viewtopic', result.topic_id.toString()];
    }
    if (bucket === 'characters') {
      return ['/character', result.id];
    }
    return ['/'];
  }

  getFragment(bucket: string, result: SearchResult): string | undefined {
    if (bucket === 'game_posts') return result.id;
    return undefined;
  }

  private buildQueryString(includePage = true): string {
    const parts: string[] = [];
    parts.push(`q=${encodeURIComponent(this.searchTerm().trim())}`);
    const buckets = Array.from(this.selectedBuckets());
    if (buckets.length) parts.push(`buckets=${encodeURIComponent(buckets.join(','))}`);
    const subforumId = this.selectedSubforumId();
    if (subforumId) parts.push(`subforum_id=${subforumId}`);
    const userId = this.selectedUserId();
    if (userId) parts.push(`user_id=${userId}`);
    if (includePage && this.currentPage() > 1) parts.push(`page=${this.currentPage()}`);
    return parts.join('&');
  }

  private performSearch() {
    const q = this.searchTerm().trim();
    if (!q) return;

    this.updateUrl();
    this.loading.set(true);
    this.searched.set(true);

    const qs = this.buildQueryString();
    const countQs = this.buildQueryString(false);

    this.apiService.get<Record<string, number>>(`search/count?${countQs}`).subscribe({
      next: (count) => this.totalCount.set(Object.values(count).reduce((a, b) => a + b, 0)),
      error: () => this.totalCount.set(0)
    });

    this.apiService.get<SearchResults>(`search?${qs}`).subscribe({
      next: (data) => {
        this.results.set(data ?? {});
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Search failed', err);
        this.loading.set(false);
      }
    });
  }

  private updateUrl() {
    const queryParams: Record<string, string> = { q: this.searchTerm().trim() };
    const buckets = Array.from(this.selectedBuckets());
    if (buckets.length) queryParams['buckets'] = buckets.join(',');
    const subforumId = this.selectedSubforumId();
    if (subforumId) queryParams['subforum_id'] = subforumId.toString();
    const userId = this.selectedUserId();
    if (userId) {
      queryParams['user_id'] = userId.toString();
      if (this.authorTerm) queryParams['user_name'] = this.authorTerm;
    }
    if (this.currentPage() > 1) queryParams['page'] = this.currentPage().toString();

    this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }
}
