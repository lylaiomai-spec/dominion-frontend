import { Component, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grid-builder',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './grid-builder.component.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .grid-builder-inputs {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .grid-builder-inputs label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9em;
    }
    .grid-builder-inputs input {
      width: 60px;
    }
    .grid-builder-tools {
      display: flex;
      gap: 6px;
      margin-left: auto;
    }
    .grid-builder-tools button {
      padding: 4px 10px;
      cursor: pointer;
      border: 1px solid var(--border-color, #aaa);
      background: var(--bg-color, #f5f5f5);
      transition: background 0.15s;
    }
    .grid-builder-tools button.active {
      background: var(--accent-color, #555);
      color: var(--accent-text, #fff);
      border-color: var(--accent-color, #555);
    }
    .grid-builder-canvas-wrapper {
      overflow: auto;
    }
    .grid-builder-canvas-wrapper canvas {
      cursor: crosshair;
      display: block;
    }
    .grid-builder-actions {
      display: flex;
      gap: 8px;
    }
  `],
})
export class GridBuilderComponent implements AfterViewInit {
  @Output() close = new EventEmitter<void>();
  @Output() insert = new EventEmitter<string>();

  @ViewChild('gridCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  rows = 2;
  cols = 3;
  tool: 'pencil' | 'eraser' = 'pencil';

  private readonly cellW = 80;
  private readonly cellH = 50;
  private readonly pad = 10;
  private readonly hitR = 7;

  // vBorders[r][c] = true → border between col c and c+1 in row r is erased
  private vBorders: boolean[][] = [];
  // hBorders[r][c] = true → border between row r and r+1 at col c is erased
  private hBorders: boolean[][] = [];

  private ready = false;

  ngAfterViewInit() {
    this.ready = true;
    this.initGrid();
  }

  onDimensionChange() {
    if (!this.ready) return;
    this.rows = Math.max(1, Math.min(12, this.rows || 1));
    this.cols = Math.max(1, Math.min(12, this.cols || 1));
    this.initGrid();
  }

  private initGrid() {
    this.vBorders = Array.from({ length: this.rows }, () =>
      new Array(Math.max(0, this.cols - 1)).fill(false)
    );
    this.hBorders = Array.from({ length: Math.max(0, this.rows - 1) }, () =>
      new Array(this.cols).fill(false)
    );
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.pad * 2 + this.cols * this.cellW;
    canvas.height = this.pad * 2 + this.rows * this.cellH;
    this.draw();
  }

  private draw() {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    const { pad, cellW, cellH, rows, cols } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(pad, pad, cols * cellW, rows * cellH);

    // Internal vertical borders
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const erased = this.vBorders[r][c];
        ctx.strokeStyle = erased ? 'rgba(0,0,0,0.08)' : '#888';
        ctx.lineWidth = erased ? 1 : 1.5;
        const x = pad + (c + 1) * cellW;
        ctx.beginPath();
        ctx.moveTo(x, pad + r * cellH);
        ctx.lineTo(x, pad + (r + 1) * cellH);
        ctx.stroke();
      }
    }

    // Internal horizontal borders
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const erased = this.hBorders[r][c];
        ctx.strokeStyle = erased ? 'rgba(0,0,0,0.08)' : '#888';
        ctx.lineWidth = erased ? 1 : 1.5;
        const y = pad + (r + 1) * cellH;
        ctx.beginPath();
        ctx.moveTo(pad + c * cellW, y);
        ctx.lineTo(pad + (c + 1) * cellW, y);
        ctx.stroke();
      }
    }

    // Outer border (always solid)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad, pad, cols * cellW, rows * cellH);
  }

  onCanvasClick(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (event.clientX - rect.left) * scaleX;
    const my = (event.clientY - rect.top) * scaleY;

    const { pad, cellW, cellH, hitR, rows, cols } = this;
    let toggled = false;

    // Vertical borders
    for (let r = 0; r < rows && !toggled; r++) {
      for (let c = 0; c < cols - 1 && !toggled; c++) {
        const x = pad + (c + 1) * cellW;
        if (Math.abs(mx - x) < hitR && my > pad + r * cellH && my < pad + (r + 1) * cellH) {
          this.vBorders[r][c] = this.tool === 'eraser';
          toggled = true;
        }
      }
    }

    // Horizontal borders
    for (let r = 0; r < rows - 1 && !toggled; r++) {
      for (let c = 0; c < cols && !toggled; c++) {
        const y = pad + (r + 1) * cellH;
        if (Math.abs(my - y) < hitR && mx > pad + c * cellW && mx < pad + (c + 1) * cellW) {
          this.hBorders[r][c] = this.tool === 'eraser';
          toggled = true;
        }
      }
    }

    if (toggled) this.draw();
  }

  private buildBBCode(): string {
    let code = `[grid columns="${this.cols}"]`;
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        let span = 1;
        while (c + span < this.cols && this.vBorders[r][c + span - 1]) {
          span++;
        }
        code += `[grid-item col="${c + 1}" col-span="${span}"]\n\n[/grid-item]`;
        c += span;
      }
    }
    code += `[/grid]`;
    return code;
  }

  onInsert() {
    this.insert.emit(this.buildBBCode());
  }
}
