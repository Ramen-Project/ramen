import { useState, useEffect } from 'react';

interface UseResponsiveScaleOptions {
  baseNodeWidth: number;
  nodeGap: number;
  containerPadding: number;
  minScale: number;
  maxScale: number;
  minNodesVisible: number;
}

export function useResponsiveScale(options: UseResponsiveScaleOptions) {
  const {
    baseNodeWidth,
    nodeGap,
    containerPadding,
    minScale,
    maxScale,
    minNodesVisible
  } = options;

  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    function updateScale() {
      const availableWidth = window.innerWidth;
      setContainerWidth(availableWidth);

      const usableWidth = availableWidth - (containerPadding * 2);
      const minRequiredWidth = minNodesVisible * baseNodeWidth + (minNodesVisible - 1) * nodeGap;
      
      if (usableWidth >= minRequiredWidth) {
        setScale(Math.min(maxScale, 1));
      } else {
        const calculatedScale = usableWidth / minRequiredWidth;
        setScale(Math.max(minScale, Math.min(maxScale, calculatedScale)));
      }
    }

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, [baseNodeWidth, nodeGap, containerPadding, minScale, maxScale, minNodesVisible]);

  return { scale, containerWidth };
}