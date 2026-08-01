import { useWindowDimensions } from 'react-native';

const PORTRAIT_GUIDE = { width: 375, height: 812 };
const LANDSCAPE_GUIDE = { width: 812, height: 375 };

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  const guide = isLandscape ? LANDSCAPE_GUIDE : PORTRAIT_GUIDE;
  const scaleFactor = width / guide.width;
  const verticalScaleFactor = height / guide.height;

  const scale = (size: number) => Math.round(size * scaleFactor);
  const verticalScale = (size: number) => Math.round(size * verticalScaleFactor);
  const moderateScale = (size: number, factor = 0.5) =>
    Math.round(size + (scale(size) - size) * factor);

  const wp = (percentage: number) => Math.round((width * percentage) / 100);
  const hp = (percentage: number) => Math.round((height * percentage) / 100);

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