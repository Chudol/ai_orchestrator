import { useState } from 'react';
import { PATCH_NOTES } from '../data/patchNotes';

export const PatchNotesPanel = (): JSX.Element => {
  const notes = PATCH_NOTES.slice(0, 5);
  const [expanded, setExpanded] = useState<string>(notes[0]?.version ?? '');

  const toggle = (version: string): void => {
    setExpanded((prev) => (prev === version ? '' : version));
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-sm font-semibold text-txt-1 mb-1">What&apos;s New</h2>
        <p className="text-[11px] text-txt-3 mb-4">Recent updates and improvements.</p>

        <div className="space-y-2">
          {notes.map((entry, idx) => {
            const isLatest = idx === 0;
            const isOpen = expanded === entry.version;

            return (
              <div
                key={entry.version}
                className={`rounded-lg border transition-all ${
                  isLatest
                    ? 'border-accent-blue/40 bg-accent-blue/5'
                    : 'border-border-subtle bg-surface-1/30'
                }`}
              >
                {/* Header */}
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                  onClick={() => toggle(entry.version)}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    className={`text-txt-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <path d="M3 1l5 4-5 4V1z" />
                  </svg>
                  <span className="text-[12px] font-semibold text-txt-1">
                    v{entry.version}
                  </span>
                  <span className="text-[11px] text-txt-3">— {entry.title}</span>
                  {isLatest && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-accent-blue bg-accent-blue/15 px-1.5 py-0.5 rounded">
                      New
                    </span>
                  )}
                  {!isLatest && (
                    <span className="ml-auto text-[10px] text-txt-3/60">{entry.date}</span>
                  )}
                </button>

                {/* Content */}
                {isOpen && (
                  <div className="px-3 pb-3 space-y-3">
                    {/* Major */}
                    {entry.major.length > 0 && (
                      <div>
                        {entry.major.map((change, i) => (
                          <div key={i} className="mb-2.5 last:mb-0">
                            <div className="flex items-start gap-1.5 mb-0.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-blue mt-0.5 flex-shrink-0">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              <span className="text-[12px] font-semibold text-txt-1">{change.title}</span>
                            </div>
                            <p className="text-[11px] text-txt-2 leading-relaxed ml-[18px]">
                              {change.description}
                            </p>
                            {change.details && change.details.length > 0 && (
                              <ul className="mt-1 ml-[18px] space-y-0.5">
                                {change.details.map((d, j) => (
                                  <li key={j} className="text-[11px] text-txt-3 flex gap-1.5">
                                    <span className="text-txt-3/50 mt-[1px]">—</span>
                                    <span>{d}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Minor */}
                    {entry.minor.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-txt-3 uppercase tracking-wider">Improvements</span>
                        <ul className="mt-1 space-y-0.5">
                          {entry.minor.map((item, i) => (
                            <li key={i} className="text-[11px] text-txt-3 flex gap-1.5">
                              <span className="text-txt-3/40 mt-[1px]">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
