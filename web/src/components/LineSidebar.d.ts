import type { FC } from "react";

export interface LineSidebarProps {
  items?: string[];
  accentColor?: string;
  textColor?: string;
  markerColor?: string;
  showIndex?: boolean;
  showMarker?: boolean;
  proximityRadius?: number;
  maxShift?: number;
  falloff?: "linear" | "smooth" | "sharp";
  markerLength?: number;
  markerGap?: number;
  tickScale?: number;
  scaleTick?: boolean;
  itemGap?: number;
  fontSize?: number;
  smoothing?: number;
  defaultActive?: number | null;
  activeItem?: number;
  hrefs?: string[];
  levels?: number[];
  onItemClick?: (index: number, label: string) => void;
  className?: string;
}
declare const LineSidebar: FC<LineSidebarProps>;
export default LineSidebar;
