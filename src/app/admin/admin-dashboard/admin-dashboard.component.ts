import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

interface HealthRAMEntry {
  total: number;
  used: number;
  available: number;
}

interface HealthCPUEntry {
  pct: number;
}

interface HealthData {
  ram: Record<string, HealthRAMEntry>;
  cpu: Record<string, HealthCPUEntry>;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const toGB = (bytes: number) => +(bytes / 1024 ** 3).toFixed(2);
const parseTs = (ts: string) => new Date(ts.replace(' ', 'T')).getTime();
const withinHour = (ts: string) => Date.now() - parseTs(ts) <= ONE_HOUR_MS;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  @ViewChild('ramCanvas') ramCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('cpuCanvas') cpuCanvas!: ElementRef<HTMLCanvasElement>;

  private ramChart: Chart | null = null;
  private cpuChart: Chart | null = null;
  private healthData: HealthData | null = null;
  private viewReady = false;
  private dataReady = false;

  ngOnInit() {
    this.apiService.get<HealthData>('admin/health').subscribe(data => {
      this.healthData = data;
      this.dataReady = true;
      if (this.viewReady) this.buildCharts();
    });

    this.notificationService.sendMessage({ type: 'health_subscribe' });

    this.notificationService.healthUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => this.pushPoint(event.data));
  }

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.dataReady) this.buildCharts();
  }

  ngOnDestroy() {
    this.notificationService.sendMessage({ type: 'health_unsubscribe' });
    this.destroy$.next();
    this.destroy$.complete();
    this.ramChart?.destroy();
    this.cpuChart?.destroy();
  }

  private buildCharts() {
    const data = this.healthData!;
    const labels = Object.keys(data.ram).filter(withinHour).sort();
    const ramEntries = labels.map(k => data.ram[k]);

    this.ramChart = new Chart(this.ramCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Used',
            data: ramEntries.map(e => toGB(e.used)),
            borderColor: '#e05252',
            backgroundColor: 'rgba(224,82,82,0.1)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Available',
            data: ramEntries.map(e => toGB(e.available)),
            borderColor: '#52a8e0',
            backgroundColor: 'rgba(82,168,224,0.1)',
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Total',
            data: ramEntries.map(e => toGB(e.total)),
            borderColor: '#aaa',
            borderDash: [4, 4],
            fill: false,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: {
            ticks: { maxRotation: 45, callback: function(value, i) { return i % 10 === 0 ? this.getLabelForValue(value as number) : ''; } },
            grid: { color: (ctx) => ctx.index % 10 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' },
          },
          y: { title: { display: true, text: 'GB' } },
        },
      },
    });

    const cpuLabels = Object.keys(data.cpu).filter(withinHour).sort();
    const cpuEntries = cpuLabels.map(k => data.cpu[k]);

    this.cpuChart = new Chart(this.cpuCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: cpuLabels,
        datasets: [
          {
            label: 'CPU %',
            data: cpuEntries.map(e => +e.pct.toFixed(2)),
            borderColor: '#e08c52',
            backgroundColor: 'rgba(224,140,82,0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          x: {
            ticks: { maxRotation: 45, callback: function(value, i) { return i % 10 === 0 ? this.getLabelForValue(value as number) : ''; } },
            grid: { color: (ctx) => ctx.index % 10 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' },
          },
          y: { min: 0, max: 100, title: { display: true, text: '%' } },
        },
      },
    });
  }

  private evictOld(chart: Chart) {
    const labels = chart.data.labels as string[];
    while (labels.length > 0 && !withinHour(labels[0])) {
      labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }
  }

  private pushPoint(data: { ram: Record<string, HealthRAMEntry>; cpu: Record<string, HealthCPUEntry> }) {
    if (!this.ramChart || !this.cpuChart) return;

    for (const [timestamp, ram] of Object.entries(data.ram)) {
      (this.ramChart.data.labels as string[]).push(timestamp);
      this.ramChart.data.datasets[0].data.push(toGB(ram.used));
      this.ramChart.data.datasets[1].data.push(toGB(ram.available));
      this.ramChart.data.datasets[2].data.push(toGB(ram.total));
    }
    this.evictOld(this.ramChart);
    this.ramChart.update();

    for (const [timestamp, cpu] of Object.entries(data.cpu)) {
      (this.cpuChart.data.labels as string[]).push(timestamp);
      this.cpuChart.data.datasets[0].data.push(+cpu.pct.toFixed(2));
    }
    this.evictOld(this.cpuChart);
    this.cpuChart.update();
  }
}
