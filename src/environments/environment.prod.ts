export const environment = {
  production: true,
  // Use a relative path so the browser sends requests to the same domain/IP
  apiUrl: '/api',
  wsUrl: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`,
  customTemplates: [
    { component: 'src/app/components/header/header.component.html', template: 'src/app/components/header/header.custom.component.html' }
  ] as { component: string; template: string }[]
};
