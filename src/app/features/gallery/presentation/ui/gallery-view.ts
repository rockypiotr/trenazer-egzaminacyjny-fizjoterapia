import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StudyImage } from '../../../../domains/question-bank/domain/question-bank.models';

@Component({
  selector: 'app-gallery-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="gallery">
      @for (image of gallery(); track image.src) {
        <div class="visual-card">
          <img [src]="image.src" [alt]="image.alt" loading="lazy">
          <div class="desc"><h3>{{ image.title }}</h3><p>{{ image.description }}</p></div>
        </div>
      }
    </div>
  `,
})
export class GalleryView {
  readonly images = input.required<StudyImage[]>();
  protected readonly gallery = computed(() => this.images().map((image) => ({
    ...image, description: `${image.lecture} · slajd ${image.slide}. ${image.caption}`,
  })));
}
