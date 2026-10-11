/** Facebook-style collage: up to 5 tiles, the last one showing "+N" for anything beyond. */
export const MOSAIC_VISIBLE_TILES = 5;

export function mosaicLayout(count: number) {
  const visible = Math.min(count, MOSAIC_VISIBLE_TILES);
  return {
    visible,
    hidden: Math.max(0, count - visible),
    className: `media-mosaic media-mosaic--${visible}`,
  };
}
