import { Component, Input } from '@angular/core';
import { FieldTemplate } from '../../models/FieldTemplate';
import { ShortTextFieldComponent } from '../short-text-field/short-text-field.component';
import { LongTextFieldComponent } from '../long-text-field/long-text-field.component';
import { NumberFieldComponent } from '../number-field/number-field.component';
import { ImageFieldComponent } from '../image-field/image-field.component';
import { CroppedImageFieldComponent } from '../cropped-image-field/cropped-image-field.component';
import { FreeFormatDateFieldComponent } from '../free-format-date-field/free-format-date-field.component';

@Component({
  selector: 'app-field-input',
  standalone: true,
  imports: [ShortTextFieldComponent, LongTextFieldComponent, NumberFieldComponent, ImageFieldComponent, CroppedImageFieldComponent, FreeFormatDateFieldComponent],
  templateUrl: './field-input.component.html'
})
export class FieldInputComponent {
  @Input() field!: FieldTemplate;
  @Input() fieldValue: any = null;
  @Input() characterIds: number[] = [];
}
