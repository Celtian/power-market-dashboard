import { Directive, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';

import { filter } from 'rxjs';

import { buildClasses } from '../../../helpers/tailwind';

const bottomNavigationItemClasses =
  'flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-semibold transition-colors outline-hidden hover:bg-primary-400 hover:text-primary-contrast-400 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset dark:hover:bg-secondary-900 dark:hover:text-secondary-contrast-900 dark:focus-visible:ring-primary-400';
const bottomNavigationItemActiveClasses =
  'bg-primary-400 text-primary-contrast-400 dark:bg-secondary-900 dark:text-secondary-contrast-900';

@Directive({
  selector: 'a[ui-bottom-navigation-item],button[ui-bottom-navigation-item]',
  host: {
    '[class]': 'twClasses()',
    '[attr.aria-current]': "isActive() ? 'page' : null",
  },
})
export class BottomNavigationItem {
  private readonly router = inject(Router);
  private readonly routerLink = inject(RouterLink, { optional: true });
  private readonly navigationEnd = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ),
    { initialValue: null },
  );
  public readonly active = input<boolean>();
  public readonly routerLinkActiveOptions = input<
    IsActiveMatchOptions | { exact: boolean }
  >({
    exact: false,
  });
  public readonly isActive = computed(() => {
    this.navigationEnd();
    const urlTree = this.routerLink?.urlTree;
    const options = this.routerLinkActiveOptions();

    return (
      this.active() ??
      (urlTree
        ? 'exact' in options
          ? this.router.isActive(urlTree, options.exact)
          : this.router.isActive(urlTree, options)
        : false)
    );
  });

  public readonly twClasses = computed(() =>
    buildClasses(
      bottomNavigationItemClasses,
      this.isActive() ? bottomNavigationItemActiveClasses : undefined,
    ),
  );
}
