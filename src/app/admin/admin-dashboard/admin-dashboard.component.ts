import { Component, inject, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Legend,
  Tooltip,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Legend, Tooltip);

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

interface HealthHTTPEntry {
  requests: number;
  latency_buckets: Record<string, number>;
}

interface HealthWSEntry {
  active: number;
}

interface HealthData {
  ram: Record<string, HealthRAMEntry>;
  cpu: Record<string, HealthCPUEntry>;
  http: Record<string, HealthHTTPEntry>;
  ws: Record<string, HealthWSEntry>;
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const toGB = (bytes: number) => +(bytes / 1024 ** 3).toFixed(2);
const parseTs = (ts: string) => new Date(ts.replace(' ', 'T')).getTime();
const withinHour = (ts: string) => Date.now() - parseTs(ts) <= ONE_HOUR_MS;

const xAxis = {
  ticks: {
    maxRotation: 45,
    autoSkip: false,
    callback: function(this: any, value: any, i: number) {
      return i % 10 === 0 ? this.getLabelForValue(value) : '';
    },
  },
  grid: { color: (ctx: any) => ctx.index % 10 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' },
};

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

  @ViewChild('ramCanvas')  ramCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('cpuCanvas')  cpuCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('httpCanvas') httpCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wsCanvas')   wsCanvas!:   ElementRef<HTMLCanvasElement>;

  private ramChart:  Chart | null = null;
  private cpuChart:  Chart | null = null;
  private httpChart: Chart | null = null;
  private wsChart:   Chart | null = null;

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
    this.httpChart?.destroy();
    this.wsChart?.destroy();
  }

  private buildCharts() {
    const data = this.healthData!;

    // RAM
    const ramLabels = Object.keys(data.ram).filter(withinHour).sort();
    this.ramChart = new Chart(this.ramCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: ramLabels,
        datasets: [
          {
            label: 'Used',
            data: ramLabels.map(k => toGB(data.ram[k].used)),
            borderColor: '#e05252',
            backgroundColor: 'rgba(224,82,82,0.1)',
            fill: true, tension: 0.3,
          },
          {
            label: 'Available',
            data: ramLabels.map(k => toGB(data.ram[k].available)),
            borderColor: '#52a8e0',
            backgroundColor: 'rgba(82,168,224,0.1)',
            fill: true, tension: 0.3,
          },
          {
            label: 'Total',
            data: ramLabels.map(k => toGB(data.ram[k].total)),
            borderColor: '#aaa',
            borderDash: [4, 4],
            fill: false, tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true, animation: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: xAxis, y: { title: { display: true, text: 'GB' } } },
      },
    });

    // CPU
    const cpuLabels = Object.keys(data.cpu).filter(withinHour).sort();
    this.cpuChart = new Chart(this.cpuCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: cpuLabels,
        datasets: [
          {
            label: 'CPU %',
            data: cpuLabels.map(k => +data.cpu[k].pct.toFixed(2)),
            borderColor: '#e08c52',
            backgroundColor: 'rgba(224,140,82,0.1)',
            fill: true, tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true, animation: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: xAxis, y: { min: 0, max: 100, title: { display: true, text: '%' } } },
      },
    });

    // HTTP
    const httpLabels = Object.keys(data.http).filter(withinHour).sort();
    this.httpChart = new Chart(this.httpCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: httpLabels,
        datasets: [
          {
            label: 'Requests / 30s',
            data: httpLabels.map(k => data.http[k].requests),
            borderColor: '#7c52e0',
            backgroundColor: 'rgba(124,82,224,0.1)',
            fill: true, tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true, animation: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: xAxis, y: { min: 0, title: { display: true, text: 'req' } } },
      },
    });

    // WS
    const wsLabels = Object.keys(data.ws).filter(withinHour).sort();
    this.wsChart = new Chart(this.wsCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: wsLabels,
        datasets: [
          {
            label: 'Active connections',
            data: wsLabels.map(k => data.ws[k].active),
            borderColor: '#52e0a8',
            backgroundColor: 'rgba(82,224,168,0.1)',
            fill: true, tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true, animation: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: xAxis, y: { min: 0, title: { display: true, text: 'connections' } } },
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

  private pushPoint(data: HealthData) {
    if (!this.ramChart || !this.cpuChart || !this.httpChart || !this.wsChart) return;

    for (const [ts, ram] of Object.entries(data.ram)) {
      (this.ramChart.data.labels as string[]).push(ts);
      this.ramChart.data.datasets[0].data.push(toGB(ram.used));
      this.ramChart.data.datasets[1].data.push(toGB(ram.available));
      this.ramChart.data.datasets[2].data.push(toGB(ram.total));
    }
    this.evictOld(this.ramChart);
    this.ramChart.update();

    for (const [ts, cpu] of Object.entries(data.cpu)) {
      (this.cpuChart.data.labels as string[]).push(ts);
      this.cpuChart.data.datasets[0].data.push(+cpu.pct.toFixed(2));
    }
    this.evictOld(this.cpuChart);
    this.cpuChart.update();

    for (const [ts, http] of Object.entries(data.http)) {
      (this.httpChart.data.labels as string[]).push(ts);
      this.httpChart.data.datasets[0].data.push(http.requests);
    }
    this.evictOld(this.httpChart);
    this.httpChart.update();

    for (const [ts, ws] of Object.entries(data.ws)) {
      (this.wsChart.data.labels as string[]).push(ts);
      this.wsChart.data.datasets[0].data.push(ws.active);
    }
    this.evictOld(this.wsChart);
    this.wsChart.update();
  }
}
