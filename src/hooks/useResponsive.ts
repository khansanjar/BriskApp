import { PixelRatio, useWindowDimensions } from 'react-native';

const PORTRAIT_GUIDE = { width: 375, height: 812 };
const LANDSCAPE_GUIDE = { width: 812, height: 375 };

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  const guide = isLandscape ? LANDSCAPE_GUIDE : PORTRAIT_GUIDE;
  const scaleFactor = width / guide.width;
  const verticalScaleFactor = height / guide.height;

  // PixelRatio ensures crisp rendering across all screen densities
  const scale = (size: number) => PixelRatio.roundToNearestPixel(size * scaleFactor);
  const verticalScale = (size: number) => PixelRatio.roundToNearestPixel(size * verticalScaleFactor);
  const moderateScale = (size: number, factor = 0.5) =>
    PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);

  const wp = (percentage: number) => PixelRatio.roundToNearestPixel((width * percentage) / 100);
  const hp = (percentage: number) => PixelRatio.roundToNearestPixel((height * percentage) / 100);

  return {
    isLandscape,
    isPortrait,
    screenWidth: width,
    screenHeight: height,
    scale,
    verticalScale,
    moderateScale,
    wp,
    hp,
  };
}