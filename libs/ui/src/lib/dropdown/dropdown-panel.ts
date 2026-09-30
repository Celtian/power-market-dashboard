import { Component } from '@angular/core';

@Component({
  selector: '[uiDropdownPanel]',
  templateUrl: './dropdown-panel.html',
  styleUrl: './dropdown-panel.css',
  host: {
    class:
      'relative block overflow-visible rounded-lg border border-primary-400 surface-200 text-sm shadow-lg dark:border-secondary-600 dark:surface-800',
    'data-dropdown-panel': 'true',
    role: 'region',
  },
})
export class DropdownPanel {}
