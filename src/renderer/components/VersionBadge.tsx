import { APP_VERSION } from '../version';

export const VersionBadge = (): JSX.Element => {
  return (
    <span className="fixed bottom-2 right-2 text-[10px] text-txt-3/50 font-mono select-none pointer-events-none z-50">
      v{APP_VERSION}
    </span>
  );
};
