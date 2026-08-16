export type AppMode = 'standalone' | 'platform';

export const APP_MODE: AppMode =
  (import.meta.env.VITE_APP_MODE as AppMode) || 'platform';

export const isStandalone = APP_MODE === 'standalone';

export interface AppCapabilities {
  appMode: AppMode;
  isStandalone: boolean;
  canCreatePipeline: boolean;
  canSavePipeline: boolean;
  canModifyPipeline: boolean;
  canExportPipeline: boolean;
  requiresAuthForStorage: boolean;
  showLandingPage: boolean;
  defaultView: 'landing' | 'dashboard' | 'canvas';
  allowGoogleDrive: boolean;
  allowSync: boolean;
  allowAdmin: boolean;
  allowAuth: boolean;
}

export function getAppCapabilities(currentUser: any | null): AppCapabilities {
  const standalone = APP_MODE === 'standalone';
  const hasUser = !!currentUser;

  return {
    appMode: APP_MODE,
    isStandalone: standalone,
    canCreatePipeline: standalone || hasUser,
    canSavePipeline: standalone || hasUser,
    canModifyPipeline: standalone || hasUser,
    canExportPipeline: true,
    requiresAuthForStorage: !standalone,
    showLandingPage: !standalone,
    defaultView: standalone ? 'dashboard' : 'landing',
    allowGoogleDrive: !standalone,
    allowSync: !standalone,
    allowAdmin: !standalone,
    allowAuth: !standalone,
  };
}
