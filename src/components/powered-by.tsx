'use client';

// PoweredByBadge is exported only from the package root, whose dist drops 'use client', so server
// components (the public pages) import it through this client boundary.
export { PoweredByBadge } from '@bengo-hub/shared-ui-lib';
