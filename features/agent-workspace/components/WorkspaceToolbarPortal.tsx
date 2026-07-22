import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface WorkspaceToolbarPortalProps {
  slotId?: string;
  fallbackClassName?: string;
  children: React.ReactNode;
}

export const WorkspaceToolbarPortal: React.FC<WorkspaceToolbarPortalProps> = ({
  slotId,
  fallbackClassName = 'flex justify-end',
  children,
}) => {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setTarget(slotId ? document.getElementById(slotId) : null);
  }, [slotId]);

  if (slotId && target) return createPortal(children, target);

  return <div className={fallbackClassName}>{children}</div>;
};
