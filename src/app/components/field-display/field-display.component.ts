import { Component, Input } from '@angular/core';
import { ShortTextFieldDisplayComponent } from '../short-text-field-display/short-text-field-display.component';
import { LongTextFieldDisplayComponent } from '../long-text-field-display/long-text-field-display.component';
import { NumberFieldDisplayComponent } from '../number-field-display/number-field-display.component';
import { ImageFieldDisplayComponent } from '../image-field-display/image-field-display.component';
import { CroppedImageFieldDisplayComponent } from '../cropped-image-field-display/cropped-image-field-display.component';

@Component({
  selector: 'app-field-display',
  standalone: true,
  imports: [ShortTextFieldDisplayComponent, LongTextFieldDisplayComponent, NumberFieldDisplayComponent, ImageFieldDisplayComponent, CroppedImageFieldDisplayComponent],
  templateUrl: './field-display.component.html'
})
export class FieldDisplayComponent {
  @Input() type: string = '';
  @Input() fieldMachineName: string = '';
  @Input() fieldName: string = '';
  @Input() fieldValue: any = '';
}
