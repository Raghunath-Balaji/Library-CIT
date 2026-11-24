import React from 'react';
import { Platform } from 'react-native';

export interface QRScannerScreenProps {
  onSuccessCheckout: () => void;
}

export const QRScannerScreen: React.FC<QRScannerScreenProps> = (props) => {
  if (Platform.OS === 'web') {
    const { QRScannerScreen: WebScanner } = require('./QRScannerScreen.web');
    return <WebScanner {...props} />;
  }
  const { QRScannerScreen: NativeScanner } = require('./QRScannerScreen.native');
  return <NativeScanner {...props} />;
};
