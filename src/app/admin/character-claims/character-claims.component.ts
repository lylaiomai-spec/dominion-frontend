import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CharacterClaimService } from '../../services/character-claim.service';
import { ApiService } from '../../services/api.service';
import { ErrorBannerComponent } from '../../components/error-banner/error-banner.component';

@Component({
  selector: 'app-character-claims',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorBannerComponent],
  templateUrl: './character-claims.component.html',
  styleUrl: './character-claims.component.css'
})
export class CharacterClaimsComponent implements OnInit {
  private claimService = inject(CharacterClaimService);
  private apiService = inject(ApiService);

  factions = this.claimService.factions;
  deleteError = signal<string | null>(null);

  modalFactionId: number | null = null;
  form = { name: '', description: '', can_change_name: false };

  ngOnInit() {
    this.claimService.load();
  }

  openModal(factionId: number) {
    this.modalFactionId = factionId;
    this.form = { name: '', description: '', can_change_name: false };
  }

  closeModal() {
    this.modalFactionId = null;
  }

  private getFactionIds(factionId: number): number[] {
    const all = this.factions();
    const byId = new Map(all.map(f => [f.id, f]));
    const ids: number[] = [];
    let current = byId.get(factionId);
    while (current) {
      ids.unshift(current.id);
      current = current.parent_id != null ? byId.get(current.parent_id) : undefined;
    }
    return ids;
  }

  deleteClaim(claimId: number, factionId: number) {
    this.deleteError.set(null);
    this.apiService.post(`character-claim/delete/${claimId}`, {}).subscribe({
      next: () => {
        this.claimService.factions.update(factions =>
          factions.map(f => f.id === factionId
            ? { ...f, claims: f.claims.filter(c => c.id !== claimId) }
            : f
          )
        );
      },
      error: (err) => {
        this.deleteError.set(err.error?.message ?? err.error ?? 'Failed to delete claim');
      }
    });
  }

  submitClaim() {
    if (!this.modalFactionId || !this.form.name.trim()) return;

    const claim = {
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      can_change_name: this.form.can_change_name
    };
    const factionIds = this.getFactionIds(this.modalFactionId);

    this.claimService.createClaim(claim, factionIds).subscribe({
      next: (created) => {
        this.claimService.factions.update(factions =>
          factions.map(f => f.id === this.modalFactionId
            ? { ...f, claims: [...f.claims, created] }
            : f
          )
        );
        this.closeModal();
      },
      error: (err) => console.error('Failed to create claim', err)
    });
  }
}
