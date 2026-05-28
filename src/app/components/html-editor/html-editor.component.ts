import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';

@Component({
  selector: 'app-html-editor',
  standalone: true,
  template: '<div #host style="max-height: 95vh; overflow-y: auto;"></div>',
})
export class HtmlEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() value = '';
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<string>();
  @ViewChild('host') host!: ElementRef<HTMLDivElement>;

  private editor: EditorView | null = null;
  private updatingFromOutside = false;

  ngAfterViewInit() {
    this.editor = new EditorView({
      state: EditorState.create({
        doc: this.value,
        extensions: [
          basicSetup,
          html(),
          oneDark,
          EditorState.readOnly.of(this.readonly),
          EditorView.updateListener.of(update => {
            if (update.docChanged && !this.updatingFromOutside) {
              this.valueChange.emit(update.state.doc.toString());
            }
          }),
        ],
      }),
      parent: this.host.nativeElement,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] && this.editor) {
      const newValue = changes['value'].currentValue as string;
      if (newValue !== this.editor.state.doc.toString()) {
        this.updatingFromOutside = true;
        this.editor.dispatch({
          changes: { from: 0, to: this.editor.state.doc.length, insert: newValue },
        });
        this.updatingFromOutside = false;
      }
    }
  }

  ngOnDestroy() {
    this.editor?.destroy();
  }
}
