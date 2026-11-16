import {NavigationItem} from '../models/navigation-item.model';
import {NAVIGATION_ITEMS} from './navigation-items.constant';

const EXCLUDED_ROUTES = ['/settings'];

export const NAVIGATION_QUICK_LINKS: readonly NavigationItem[] = NAVIGATION_ITEMS.filter(
  (item) => !EXCLUDED_ROUTES.includes(item.route),
);
