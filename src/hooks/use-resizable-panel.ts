import { useCallback, useEffect, useRef, useState } from "react";

type UseResizablePanelOptions = {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useResizablePanel = ({
  initialWidth,
  minWidth,
  maxWidth,
}: UseResizablePanelOptions) => {
  const [width, setWidth] = useState(initialWidth);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      setWidth(clamp(event.clientX, minWidth, maxWidth));
    };

    const onMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [maxWidth, minWidth]);

  const startResize = useCallback(() => {
    isResizingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  return {
    width,
    startResize,
  };
};
